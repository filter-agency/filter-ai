<?php
/**
 * Brand Voice auto-generation lifecycle.
 *
 * On first install (or on upgrade where brand_voice_prompt is still empty),
 * we sample the site's existing published posts/pages, ask the configured AI
 * provider to describe the brand voice, write the result into
 * filter_ai_settings, and flip brand_voice_enabled on. If no provider is yet
 * configured, the scan defers in 'pending_key' state and runs automatically
 * when a provider becomes available.
 *
 * All user-visible surface is dismissible global admin notices — the Brand
 * Voice settings card itself is not modified.
 *
 * @package Filter_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Option key for the scan state.
 */
const FILTER_AI_BRAND_VOICE_SCAN_OPTION = 'filter_ai_brand_voice_scan';

/**
 * Action Scheduler hook name + group.
 */
const FILTER_AI_BRAND_VOICE_SCAN_HOOK   = 'filter_ai_brand_voice_scan';
const FILTER_AI_BRAND_VOICE_SCAN_GROUP  = 'filter-ai-current';
const FILTER_AI_BRAND_VOICE_MAX_RETRIES = 3;

/**
 * Default state shape. Keep all callers reading via filter_ai_brand_voice_get_state().
 *
 * @return array
 */
function filter_ai_brand_voice_default_state() {
	return array(
		'status'           => 'pending_key',
		'action_id'        => null,
		'attempts'         => 0,
		'error_code'       => null,
		'error_message'    => null,
		'started_at'       => null,
		'completed_at'     => null,
		'notice_dismissed' => false,
	);
}

/**
 * Read the current state, merging onto defaults so future fields don't break old DBs.
 *
 * @return array
 */
function filter_ai_brand_voice_get_state() {
	$stored = get_option( FILTER_AI_BRAND_VOICE_SCAN_OPTION, array() );
	if ( ! is_array( $stored ) ) {
		$stored = array();
	}
	return array_merge( filter_ai_brand_voice_default_state(), $stored );
}

/**
 * Persist new state (merged onto existing).
 *
 * @param array $patch Fields to overwrite.
 */
function filter_ai_brand_voice_set_state( array $patch ) {
	$state = filter_ai_brand_voice_get_state();
	update_option( FILTER_AI_BRAND_VOICE_SCAN_OPTION, array_merge( $state, $patch ) );
}

/**
 * Whether the scan should be initialised for this site.
 *
 * Eligible when filter_ai_settings exists, brand_voice_prompt is empty, AND
 * the scan option doesn't already exist. This catches both fresh installs and
 * upgrades from a pre-1.7.0 version where the prompt was never set.
 *
 * @return bool
 */
function filter_ai_brand_voice_should_init() {
	if ( false !== get_option( FILTER_AI_BRAND_VOICE_SCAN_OPTION, false ) ) {
		return false;
	}
	$settings = get_option( 'filter_ai_settings', array() );
	if ( ! is_array( $settings ) ) {
		return false;
	}
	$prompt = isset( $settings['brand_voice_prompt'] ) ? trim( (string) $settings['brand_voice_prompt'] ) : '';
	return '' === $prompt;
}

/**
 * Create the state option if eligible. Called from activation AND admin_init
 * (idempotent — short-circuits via should_init).
 */
function filter_ai_brand_voice_init_scan_state() {
	if ( ! filter_ai_brand_voice_should_init() ) {
		return;
	}
	add_option( FILTER_AI_BRAND_VOICE_SCAN_OPTION, filter_ai_brand_voice_default_state() );
}

/**
 * On every admin page load, see whether we can advance the state machine.
 *
 * If status is pending_key and a provider with text generation is now
 * available, enqueue the scan. Skip if a job is already scheduled.
 */
function filter_ai_brand_voice_maybe_queue_scan() {
	// Heavy-ish work; skip during AJAX/REST/cron to keep those requests fast.
	if ( wp_doing_ajax() || wp_doing_cron() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
		return;
	}
	if ( ! function_exists( 'as_enqueue_async_action' ) ) {
		return;
	}

	$state = filter_ai_brand_voice_get_state();
	if ( 'pending_key' !== $state['status'] ) {
		return;
	}

	$provider = filter_ai_provider();
	if ( null === $provider ) {
		return;
	}
	if ( ! $provider->is_text_supported( array( 'text_generation' ) ) ) {
		return;
	}

	// Avoid duplicate enqueues if a previous activation/admin_init already queued one.
	if ( false !== as_next_scheduled_action( FILTER_AI_BRAND_VOICE_SCAN_HOOK, null, FILTER_AI_BRAND_VOICE_SCAN_GROUP ) ) {
		return;
	}

	$action_id = as_enqueue_async_action(
		FILTER_AI_BRAND_VOICE_SCAN_HOOK,
		array(),
		FILTER_AI_BRAND_VOICE_SCAN_GROUP
	);

	filter_ai_brand_voice_set_state(
		array(
			'status'           => 'queued',
			'action_id'        => $action_id,
			'started_at'       => time(),
			'notice_dismissed' => false,
		)
	);
}

/**
 * Sample up to N most-recent published posts and pages with substantial bodies.
 *
 * @param int $limit Max items to return.
 * @return array<int, array{title:string, excerpt:string}>
 */
function filter_ai_brand_voice_sample_content( $limit = 10 ) {
	$query = new WP_Query(
		array(
			'post_type'              => array( 'post', 'page' ),
			'post_status'            => 'publish',
			'posts_per_page'         => max( 1, (int) $limit ) * 3, // over-fetch then filter
			'orderby'                => 'date',
			'order'                  => 'DESC',
			'fields'                 => 'ids',
			'no_found_rows'          => true,
			'update_post_term_cache' => false,
			'update_post_meta_cache' => false,
		)
	);

	$samples = array();
	foreach ( $query->posts as $id ) {
		$raw  = (string) get_post_field( 'post_content', $id );
		$text = trim( wp_strip_all_tags( $raw ) );
		if ( mb_strlen( $text ) <= 500 ) {
			continue;
		}
		$samples[] = array(
			'title'   => (string) get_the_title( $id ),
			'excerpt' => mb_substr( $text, 0, 1500 ),
		);
		if ( count( $samples ) >= $limit ) {
			break;
		}
	}
	return $samples;
}

/**
 * Compose the prompt sent to the AI provider.
 *
 * @param array $samples List of { title, excerpt } items.
 * @return string
 */
function filter_ai_brand_voice_build_prompt( array $samples ) {
	$header = __( 'Analyse the following content samples from a WordPress site and describe the site\'s brand voice in 2–3 sentences. Focus on tone, vocabulary, sentence structure, and intended audience. Output only the description, with no preamble, list markers, or quotation marks.', 'filter-ai' );

	$blocks = array();
	foreach ( $samples as $i => $s ) {
		$blocks[] = sprintf(
			"--- SAMPLE %d ---\nTitle: %s\n\n%s",
			$i + 1,
			$s['title'],
			$s['excerpt']
		);
	}
	return $header . "\n\n" . implode( "\n\n", $blocks );
}

/**
 * Scheduled-action handler. Performs the scan and writes results.
 */
function filter_ai_brand_voice_process_scan() {
	$state = filter_ai_brand_voice_get_state();

	// Defensive: if the option was deleted or scan already finished, bail.
	if ( ! in_array( $state['status'], array( 'queued', 'running' ), true ) ) {
		return;
	}

	// If the user manually filled in a prompt while we were waiting, skip.
	$settings = get_option( 'filter_ai_settings', array() );
	$existing = isset( $settings['brand_voice_prompt'] ) ? trim( (string) $settings['brand_voice_prompt'] ) : '';
	if ( '' !== $existing ) {
		filter_ai_brand_voice_set_state(
			array(
				'status'           => 'skipped',
				'error_code'       => 'overwritten_by_user',
				'error_message'    => __( 'Brand voice was already set; auto-generation skipped.', 'filter-ai' ),
				'completed_at'     => time(),
				'notice_dismissed' => true,
			)
		);
		return;
	}

	filter_ai_brand_voice_set_state( array( 'status' => 'running' ) );

	$samples = filter_ai_brand_voice_sample_content( 10 );
	if ( count( $samples ) < 2 ) {
		filter_ai_brand_voice_set_state(
			array(
				'status'           => 'skipped',
				'error_code'       => 'insufficient_content',
				'error_message'    => __( 'Not enough published content to infer a brand voice.', 'filter-ai' ),
				'completed_at'     => time(),
				'notice_dismissed' => true,
			)
		);
		return;
	}

	$provider = filter_ai_provider();
	if ( null === $provider ) {
		filter_ai_brand_voice_set_state(
			array(
				'status'        => 'pending_key',
				'error_code'    => 'no_provider',
				'error_message' => __( 'AI provider became unavailable mid-scan.', 'filter-ai' ),
			)
		);
		return;
	}

	$prompt = filter_ai_brand_voice_build_prompt( $samples );
	$result = $provider->generate_text(
		$prompt,
		array(),
		'filter-ai-brand-voice-auto',
		array( 'text_generation' )
	);

	if ( is_wp_error( $result ) || ! is_string( $result ) || '' === trim( $result ) ) {
		filter_ai_brand_voice_handle_failure( $state, $result );
		return;
	}

	// Re-read settings inside the option write to avoid clobbering a concurrent edit.
	$settings = get_option( 'filter_ai_settings', array() );
	if ( ! is_array( $settings ) ) {
		$settings = array();
	}
	$settings['brand_voice_prompt']  = trim( $result );
	$settings['brand_voice_enabled'] = true;
	update_option( 'filter_ai_settings', $settings );

	filter_ai_brand_voice_set_state(
		array(
			'status'           => 'complete',
			'completed_at'     => time(),
			'error_code'       => null,
			'error_message'    => null,
			'notice_dismissed' => false,
		)
	);
}

/**
 * Increment attempts and schedule a retry with exponential back-off, OR set
 * status=failed once retries are exhausted.
 *
 * @param array          $state  Current state.
 * @param WP_Error|mixed $result The failing return value (for diagnostics).
 */
function filter_ai_brand_voice_handle_failure( array $state, $result ) {
	$attempts      = (int) $state['attempts'] + 1;
	$error_code    = is_wp_error( $result ) ? (string) $result->get_error_code() : 'empty_response';
	$error_message = is_wp_error( $result )
		? (string) $result->get_error_message()
		: __( 'The AI provider returned an empty response.', 'filter-ai' );

	if ( $attempts >= FILTER_AI_BRAND_VOICE_MAX_RETRIES ) {
		filter_ai_brand_voice_set_state(
			array(
				'status'           => 'failed',
				'attempts'         => $attempts,
				'error_code'       => $error_code,
				'error_message'    => $error_message,
				'completed_at'     => time(),
				'notice_dismissed' => false,
			)
		);
		return;
	}

	// 60s → 120s → 240s back-off.
	$delay = 60 * pow( 2, $attempts - 1 );
	if ( function_exists( 'as_schedule_single_action' ) ) {
		as_schedule_single_action(
			time() + $delay,
			FILTER_AI_BRAND_VOICE_SCAN_HOOK,
			array(),
			FILTER_AI_BRAND_VOICE_SCAN_GROUP
		);
	}
	filter_ai_brand_voice_set_state(
		array(
			'status'        => 'queued',
			'attempts'      => $attempts,
			'error_code'    => $error_code,
			'error_message' => $error_message,
		)
	);
}

/**
 * Print the inline script that persists a notice dismissal when the user
 * clicks the standard WP X button. WordPress core renders the X via the
 * `is-dismissible` class but only hides the notice in JS — without this
 * extra hook, the dismissal isn't persisted server-side.
 */
function filter_ai_brand_voice_print_dismiss_script() {
	static $printed = false;
	if ( $printed ) {
		return;
	}
	$printed = true;
	$nonce   = wp_create_nonce( 'filter_ai_brand_voice_dismiss' );
	?>
	<script>
	(function () {
		document.addEventListener( 'click', function ( e ) {
			if ( ! e.target || ! e.target.classList || ! e.target.classList.contains( 'notice-dismiss' ) ) {
				return;
			}
			var notice = e.target.closest( '.filter-ai-brand-voice-notice' );
			if ( ! notice || ! window.fetch || ! window.ajaxurl ) {
				return;
			}
			var fd = new FormData();
			fd.append( 'action', 'filter_ai_brand_voice_dismiss' );
			fd.append( '_wpnonce', <?php echo wp_json_encode( $nonce ); ?> );
			fetch( window.ajaxurl, { method: 'POST', body: fd, credentials: 'same-origin' } );
		} );
	})();
	</script>
	<?php
}

/**
 * Render the appropriate global admin notice based on current state.
 *
 * All variants use WordPress's standard `is-dismissible` class for the X
 * icon; the inline script above persists the dismissal via admin-ajax.
 */
function filter_ai_brand_voice_render_admin_notices() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$state = filter_ai_brand_voice_get_state();

	if ( in_array( $state['status'], array( 'queued', 'running' ), true ) ) {
		printf(
			'<div class="notice notice-info is-dismissible filter-ai-brand-voice-notice"><p>%s</p></div>',
			esc_html__( 'Filter AI is analysing your site to generate a brand voice. This usually takes under a minute.', 'filter-ai' )
		);
		filter_ai_brand_voice_print_dismiss_script();
		return;
	}

	// pending_key + a backend present but no key configured. Without this, on
	// WP 7.0+ native sites without a Connector key, nothing tells the user
	// globally that the brand voice is waiting on a provider — the
	// AIServiceNotice React component only renders on the settings page.
	if ( 'pending_key' === $state['status'] && ! $state['notice_dismissed'] ) {
		$provider = filter_ai_provider();
		if ( null !== $provider && ! $provider->is_text_supported( array( 'text_generation' ) ) ) {
			$config_url = function_exists( 'wp_ai_client_prompt' )
				? admin_url( 'options-connectors.php' )
				: admin_url( 'admin.php?page=filter_ai#api_keys' );
			printf(
				'<div class="notice notice-info is-dismissible filter-ai-brand-voice-notice"><p>%s <a href="%s">%s</a></p></div>',
				esc_html__( 'Filter AI will auto-generate your brand voice once you configure an AI provider.', 'filter-ai' ),
				esc_url( $config_url ),
				esc_html__( 'Configure provider', 'filter-ai' )
			);
			filter_ai_brand_voice_print_dismiss_script();
			return;
		}
	}

	if ( 'complete' === $state['status'] && ! $state['notice_dismissed'] ) {
		$settings_url = admin_url( 'admin.php?page=filter_ai' );
		printf(
			'<div class="notice notice-success is-dismissible filter-ai-brand-voice-notice"><p>%s <a href="%s">%s</a></p></div>',
			esc_html__( 'Filter AI generated a brand voice from your site content.', 'filter-ai' ),
			esc_url( $settings_url ),
			esc_html__( 'Review or edit', 'filter-ai' )
		);
		filter_ai_brand_voice_print_dismiss_script();
		return;
	}

	if ( 'failed' === $state['status'] && ! $state['notice_dismissed'] ) {
		$retry_url = wp_nonce_url(
			admin_url( 'admin-post.php?action=filter_ai_brand_voice_retry' ),
			'filter_ai_brand_voice_retry'
		);
		/* translators: %s: the AI provider's error message */
		$detail = $state['error_message'] ? ' ' . sprintf( __( '(%s)', 'filter-ai' ), $state['error_message'] ) : '';
		printf(
			'<div class="notice notice-error is-dismissible filter-ai-brand-voice-notice"><p>%s%s <a href="%s">%s</a></p></div>',
			esc_html__( 'Filter AI could not auto-generate a brand voice from your site content.', 'filter-ai' ),
			esc_html( $detail ),
			esc_url( $retry_url ),
			esc_html__( 'Try again', 'filter-ai' )
		);
		filter_ai_brand_voice_print_dismiss_script();
	}
}

/**
 * admin-ajax handler: persist the dismissal triggered by the WP X icon.
 */
function filter_ai_brand_voice_ajax_dismiss() {
	check_ajax_referer( 'filter_ai_brand_voice_dismiss' );
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( null, 403 );
	}
	filter_ai_brand_voice_set_state( array( 'notice_dismissed' => true ) );
	wp_send_json_success();
}

/**
 * admin-post.php handler: reset attempts and queue another scan attempt.
 */
function filter_ai_brand_voice_retry_scan() {
	check_admin_referer( 'filter_ai_brand_voice_retry' );
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to do this.', 'filter-ai' ) );
	}
	filter_ai_brand_voice_set_state(
		array(
			'status'           => 'pending_key',
			'attempts'         => 0,
			'error_code'       => null,
			'error_message'    => null,
			'notice_dismissed' => false,
		)
	);
	filter_ai_brand_voice_maybe_queue_scan();
	wp_safe_redirect( wp_get_referer() ? wp_get_referer() : admin_url() );
	exit;
}

// Hooks.
add_action( 'admin_init', 'filter_ai_brand_voice_init_scan_state' );
add_action( 'admin_init', 'filter_ai_brand_voice_maybe_queue_scan', 20 );
add_action( FILTER_AI_BRAND_VOICE_SCAN_HOOK, 'filter_ai_brand_voice_process_scan' );
add_action( 'admin_notices', 'filter_ai_brand_voice_render_admin_notices' );
add_action( 'wp_ajax_filter_ai_brand_voice_dismiss', 'filter_ai_brand_voice_ajax_dismiss' );
add_action( 'admin_post_filter_ai_brand_voice_retry', 'filter_ai_brand_voice_retry_scan' );
