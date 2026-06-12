<?php
/**
 * Error logging helpers for Filter AI.
 *
 * @package Filter_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const FILTER_AI_ERROR_LOG_POST_TYPE = 'filter_ai_error_log';
const FILTER_AI_ERROR_LOG_RETENTION = WEEK_IN_SECONDS;

/**
 * Build the structured payload stored for an error log entry.
 *
 * @param string   $source    Source subsystem.
 * @param string   $message   Human-readable message.
 * @param array    $details   Full diagnostic details.
 * @param array    $context   Request / feature context.
 * @param int|null $timestamp Unix timestamp.
 * @return array
 */
function filter_ai_error_log_payload( $source, $message, array $details = array(), array $context = array(), $timestamp = null ) {
	return array(
		'timestamp' => null === $timestamp ? time() : (int) $timestamp,
		'source'    => (string) $source,
		'message'   => (string) $message,
		'details'   => $details,
		'context'   => $context,
	);
}

/**
 * Timestamp before which logs may be pruned.
 *
 * @param int|null $now Current timestamp.
 * @return int
 */
function filter_ai_error_log_cutoff_timestamp( $now = null ) {
	return ( null === $now ? time() : (int) $now ) - FILTER_AI_ERROR_LOG_RETENTION;
}

/**
 * Admin URL for the Settings page error logs tab.
 *
 * @param int $log_id Optional log post ID.
 * @return string
 */
function filter_ai_error_logs_settings_url( $log_id = 0 ) {
	$path = 'admin.php?page=filter_ai';
	if ( $log_id ) {
		$path .= '&filter_ai_log_id=' . (int) $log_id;
	}
	return admin_url( $path . '#error_logs' );
}

/**
 * Admin URL for an error log entry.
 *
 * @param int $log_id Log post ID.
 * @return string
 */
function filter_ai_error_log_url( $log_id ) {
	return filter_ai_error_logs_settings_url( (int) $log_id );
}

/**
 * Copy a WP_Error and append a link to the specific log entry.
 *
 * @param WP_Error $error  Original error.
 * @param int      $log_id Log post ID.
 * @return WP_Error
 */
function filter_ai_error_with_log_link( WP_Error $error, $log_id ) {
	$log_url = filter_ai_error_log_url( $log_id );
	$data    = $error->get_error_data();
	if ( ! is_array( $data ) ) {
		$data = array();
	}
	$data['error_log_id']  = (int) $log_id;
	$data['error_log_url'] = $log_url;

	return new WP_Error(
		$error->get_error_code(),
		sprintf(
			/* translators: 1: original error message, 2: error log URL */
			__( '%1$s View the error log: %2$s', 'filter-ai' ),
			$error->get_error_message(),
			$log_url
		),
		$data
	);
}

/**
 * JSON encode a value for storage.
 *
 * @param mixed $value Value to encode.
 * @return string
 */
function filter_ai_error_log_json( $value ) {
	$options = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE;
	if ( function_exists( 'wp_json_encode' ) ) {
		return (string) wp_json_encode( $value, $options );
	}
	return (string) json_encode( $value, $options ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode -- Fallback for non-WordPress test contexts.
}

/**
 * Redact sensitive headers before storing request diagnostics.
 *
 * @param array $headers HTTP headers.
 * @return array
 */
function filter_ai_redact_http_headers( array $headers ) {
	$redacted = array();
	foreach ( $headers as $name => $value ) {
		$header_name = strtolower( (string) $name );
		if (
			false !== strpos( $header_name, 'authorization' ) ||
			false !== strpos( $header_name, 'api-key' ) ||
			false !== strpos( $header_name, 'anthropic-key' ) ||
			false !== strpos( $header_name, 'token' )
		) {
			$redacted[ $name ] = '[redacted]';
			continue;
		}
		$redacted[ $name ] = $value;
	}
	return $redacted;
}

/**
 * Describe an HTTP response for diagnostic storage.
 *
 * @param mixed  $response HTTP response or WP_Error.
 * @param array  $args     Request args.
 * @param string $url      Request URL.
 * @return array
 */
function filter_ai_describe_http_response( $response, array $args = array(), $url = '' ) {
	$description = array(
		'url'             => (string) $url,
		'method'          => isset( $args['method'] ) ? (string) $args['method'] : '',
		'request_headers' => isset( $args['headers'] ) && is_array( $args['headers'] )
			? filter_ai_redact_http_headers( $args['headers'] )
			: array(),
	);

	if ( is_wp_error( $response ) ) {
		$description['error'] = array(
			'code'    => $response->get_error_code(),
			'message' => $response->get_error_message(),
			'data'    => $response->get_error_data(),
		);
		return $description;
	}

	if ( is_array( $response ) ) {
		$description['status']           = isset( $response['response']['code'] ) ? (int) $response['response']['code'] : null;
		$description['response_message'] = isset( $response['response']['message'] ) ? (string) $response['response']['message'] : '';
		$description['response_headers'] = isset( $response['headers'] ) ? $response['headers'] : array();
		$description['body']             = isset( $response['body'] ) ? (string) $response['body'] : '';

		if ( '' !== $description['body'] ) {
			$decoded = json_decode( $description['body'], true );
			if ( JSON_ERROR_NONE === json_last_error() ) {
				$description['body_json'] = $decoded;
			}
		}
	}

	return $description;
}

/**
 * Extract text from a captured Anthropic response, ignoring non-text parts.
 *
 * @param array|null $http_response Captured HTTP response description.
 * @return string|null
 */
function filter_ai_extract_anthropic_text_from_response( $http_response ) {
	if ( ! is_array( $http_response ) || empty( $http_response['body_json']['content'] ) || ! is_array( $http_response['body_json']['content'] ) ) {
		return null;
	}

	$text = '';
	foreach ( $http_response['body_json']['content'] as $part ) {
		if ( is_array( $part ) && isset( $part['type'], $part['text'] ) && 'text' === $part['type'] ) {
			$text .= (string) $part['text'];
		}
	}

	$text = trim( $text );
	return '' === $text ? null : $text;
}

/**
 * Register the private post type used to store error log entries.
 *
 * @return void
 */
function filter_ai_register_error_log_post_type() {
	if ( ! function_exists( 'register_post_type' ) ) {
		return;
	}

	register_post_type(
		FILTER_AI_ERROR_LOG_POST_TYPE,
		array(
			'label'               => __( 'Filter AI Error Logs', 'filter-ai' ),
			'public'              => false,
			'show_ui'             => false,
			'show_in_menu'        => false,
			'capability_type'     => 'post',
			'capabilities'        => array(
				'create_posts' => 'do_not_allow',
			),
			'map_meta_cap'        => true,
			'supports'            => array( 'title', 'editor' ),
			'exclude_from_search' => true,
		)
	);
}

if ( function_exists( 'add_action' ) ) {
	add_action( 'init', 'filter_ai_register_error_log_post_type' );
}

/**
 * Persist a log entry.
 *
 * @param string $source  Source subsystem.
 * @param string $message Human-readable message.
 * @param array  $details Full diagnostic details.
 * @param array  $context Request / feature context.
 * @return int Log post ID, or 0 if storage is unavailable.
 */
function filter_ai_log_error( $source, $message, array $details = array(), array $context = array() ) {
	if ( ! function_exists( 'wp_insert_post' ) ) {
		return 0;
	}

	filter_ai_prune_error_logs();

	$payload = filter_ai_error_log_payload( $source, $message, $details, $context );
	$title   = sprintf(
		/* translators: 1: source label, 2: error message */
		__( 'Filter AI error: %1$s - %2$s', 'filter-ai' ),
		(string) $source,
		(string) $message
	);

	$post_id = wp_insert_post(
		array(
			'post_type'    => FILTER_AI_ERROR_LOG_POST_TYPE,
			'post_status'  => 'private',
			'post_title'   => function_exists( 'wp_trim_words' ) ? wp_trim_words( $title, 18, '...' ) : $title,
			'post_excerpt' => (string) $message,
			'post_content' => filter_ai_error_log_json( $payload ),
		),
		true
	);

	if ( is_wp_error( $post_id ) ) {
		return 0;
	}

	if ( function_exists( 'update_post_meta' ) ) {
		update_post_meta( $post_id, '_filter_ai_error_source', (string) $source );
		update_post_meta( $post_id, '_filter_ai_error_message', (string) $message );
		update_post_meta( $post_id, '_filter_ai_error_timestamp', (string) $payload['timestamp'] );
	}

	return (int) $post_id;
}

/**
 * Convert a Throwable to a serialisable diagnostic array.
 *
 * @param Throwable $throwable Throwable to describe.
 * @return array
 */
function filter_ai_describe_throwable( Throwable $throwable ) {
	$details = array(
		'class'   => get_class( $throwable ),
		'code'    => $throwable->getCode(),
		'message' => $throwable->getMessage(),
		'file'    => $throwable->getFile(),
		'line'    => $throwable->getLine(),
		'trace'   => $throwable->getTraceAsString(),
	);

	if ( method_exists( $throwable, 'getResponse' ) ) {
		$details['response'] = $throwable->getResponse();
	}
	if ( method_exists( $throwable, 'getResponseInfo' ) ) {
		$details['response_info'] = $throwable->getResponseInfo();
	}

	if ( $throwable->getPrevious() ) {
		$details['previous'] = filter_ai_describe_throwable( $throwable->getPrevious() );
	}

	return $details;
}

/**
 * Create a WP_Error that carries full throwable diagnostics in its data.
 *
 * @param string    $code      Error code.
 * @param Throwable $throwable Throwable to wrap.
 * @param array     $context   Context to preserve.
 * @return WP_Error
 */
function filter_ai_wp_error_from_throwable( $code, Throwable $throwable, array $context = array() ) {
	return new WP_Error(
		(string) $code,
		$throwable->getMessage(),
		array(
			'exception' => filter_ai_describe_throwable( $throwable ),
			'context'   => $context,
		)
	);
}

/**
 * Persist a WP_Error and return a linked copy for user-facing output.
 *
 * @param string   $source  Source subsystem.
 * @param WP_Error $error   Error to log.
 * @param array    $context Request / feature context.
 * @return WP_Error
 */
function filter_ai_log_wp_error( $source, WP_Error $error, array $context = array() ) {
	$details = array(
		'code'    => $error->get_error_code(),
		'message' => $error->get_error_message(),
		'data'    => $error->get_error_data(),
	);
	$log_id  = filter_ai_log_error( $source, $error->get_error_message(), $details, $context );

	if ( ! $log_id ) {
		return $error;
	}

	return filter_ai_error_with_log_link( $error, $log_id );
}

/**
 * Preserve existing WP_Error data while adding an HTTP status.
 *
 * @param WP_Error $error  Error to update.
 * @param int      $status HTTP status.
 * @return WP_Error
 */
function filter_ai_error_with_status( WP_Error $error, $status ) {
	$data = $error->get_error_data();
	if ( ! is_array( $data ) ) {
		$data = array();
	}
	$data['status'] = (int) $status;
	$error->add_data( $data );
	return $error;
}

/**
 * Build safe generation context without storing large input payloads.
 *
 * @param string      $feature       Filter AI feature id.
 * @param string[]    $capabilities  Required capabilities.
 * @param string|null $provider_slug Requested provider slug.
 * @param array       $files         Multimodal files.
 * @param array       $extra         Additional context.
 * @return array
 */
function filter_ai_error_generation_context( $feature, array $capabilities = array(), $provider_slug = null, array $files = array(), array $extra = array() ) {
	$file_summaries = array();
	foreach ( $files as $index => $file ) {
		$data             = isset( $file['data'] ) ? (string) $file['data'] : '';
		$file_summaries[] = array(
			'index'       => (int) $index,
			'mime_type'   => isset( $file['mime_type'] ) ? (string) $file['mime_type'] : '',
			'data_length' => strlen( $data ),
			'is_data_uri' => 0 === strpos( $data, 'data:' ),
		);
	}

	return array_merge(
		array(
			'feature'        => (string) $feature,
			'capabilities'   => array_values( array_map( 'strval', $capabilities ) ),
			'provider_slug'  => null === $provider_slug ? null : (string) $provider_slug,
			'file_summaries' => $file_summaries,
		),
		$extra
	);
}

/**
 * Prune logs older than the retention period.
 *
 * @return void
 */
function filter_ai_prune_error_logs() {
	if ( ! function_exists( 'get_posts' ) || ! function_exists( 'wp_delete_post' ) ) {
		return;
	}

	$cutoff = gmdate( 'Y-m-d H:i:s', filter_ai_error_log_cutoff_timestamp() );
	$ids    = get_posts(
		array(
			'post_type'      => FILTER_AI_ERROR_LOG_POST_TYPE,
			'post_status'    => 'private',
			'fields'         => 'ids',
			'posts_per_page' => 100,
			'date_query'     => array(
				array(
					'before'    => $cutoff,
					'inclusive' => false,
					'column'    => 'post_date_gmt',
				),
			),
		)
	);

	foreach ( $ids as $id ) {
		wp_delete_post( (int) $id, true );
	}
}

if ( function_exists( 'add_action' ) ) {
	add_action( 'filter_ai_prune_error_logs', 'filter_ai_prune_error_logs' );
}

/**
 * Schedule regular pruning via Action Scheduler when available, or WP-Cron.
 *
 * @return void
 */
function filter_ai_schedule_error_log_pruning() {
	if ( function_exists( 'as_next_scheduled_action' ) && function_exists( 'as_schedule_recurring_action' ) ) {
		if ( ! as_next_scheduled_action( 'filter_ai_prune_error_logs', array(), 'filter-ai' ) ) {
			as_schedule_recurring_action( time() + HOUR_IN_SECONDS, DAY_IN_SECONDS, 'filter_ai_prune_error_logs', array(), 'filter-ai' );
		}
		return;
	}

	if ( function_exists( 'wp_next_scheduled' ) && function_exists( 'wp_schedule_event' ) && ! wp_next_scheduled( 'filter_ai_prune_error_logs' ) ) {
		wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'filter_ai_prune_error_logs' );
	}
}

if ( function_exists( 'add_action' ) ) {
	add_action( 'init', 'filter_ai_schedule_error_log_pruning', 20 );
}

/**
 * Delete all stored Filter AI error logs.
 *
 * @return void
 */
function filter_ai_delete_error_logs() {
	if ( ! function_exists( 'get_posts' ) || ! function_exists( 'wp_delete_post' ) ) {
		return;
	}

	$ids = get_posts(
		array(
			'post_type'      => FILTER_AI_ERROR_LOG_POST_TYPE,
			'post_status'    => 'any',
			'fields'         => 'ids',
			'posts_per_page' => -1,
		)
	);

	foreach ( $ids as $id ) {
		wp_delete_post( (int) $id, true );
	}
}

/**
 * Return recent error logs for the settings tab.
 *
 * @param int $limit Maximum number of logs.
 * @return array[]
 */
function filter_ai_get_error_log_summaries( $limit = 50 ) {
	if ( ! function_exists( 'get_posts' ) ) {
		return array();
	}

	$logs = get_posts(
		array(
			'post_type'      => FILTER_AI_ERROR_LOG_POST_TYPE,
			'post_status'    => 'private',
			'posts_per_page' => (int) $limit,
			'orderby'        => 'date',
			'order'          => 'DESC',
		)
	);

	$out = array();
	foreach ( $logs as $log ) {
		$source = function_exists( 'get_post_meta' ) ? get_post_meta( $log->ID, '_filter_ai_error_source', true ) : '';
		$out[]  = array(
			'id'      => (int) $log->ID,
			'date'    => function_exists( 'get_date_from_gmt' ) ? get_date_from_gmt( $log->post_date_gmt, 'Y-m-d H:i:s' ) : (string) $log->post_date_gmt,
			'source'  => (string) $source,
			'message' => (string) $log->post_excerpt,
			'title'   => function_exists( 'get_the_title' ) ? get_the_title( $log ) : (string) $log->post_title,
			'url'     => filter_ai_error_log_url( $log->ID ),
		);
	}

	return $out;
}

/**
 * Return a single error log for the settings tab.
 *
 * @param int $log_id Log post ID.
 * @return array|null
 */
function filter_ai_get_error_log_detail( $log_id ) {
	if ( ! function_exists( 'get_post' ) ) {
		return null;
	}

	$post = get_post( (int) $log_id );
	if ( ! $post || FILTER_AI_ERROR_LOG_POST_TYPE !== $post->post_type ) {
		return null;
	}

	$payload = json_decode( (string) $post->post_content, true );
	if ( ! is_array( $payload ) ) {
		$payload = null;
	}

	$source = function_exists( 'get_post_meta' ) ? get_post_meta( $post->ID, '_filter_ai_error_source', true ) : '';

	return array(
		'id'      => (int) $post->ID,
		'date'    => function_exists( 'get_date_from_gmt' ) ? get_date_from_gmt( $post->post_date_gmt, 'Y-m-d H:i:s' ) : (string) $post->post_date_gmt,
		'source'  => (string) $source,
		'message' => (string) $post->post_excerpt,
		'title'   => function_exists( 'get_the_title' ) ? get_the_title( $post ) : (string) $post->post_title,
		'content' => (string) $post->post_content,
		'payload' => $payload,
	);
}

/**
 * Render the admin error logs page.
 *
 * @return void
 */
function filter_ai_error_logs_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$log_id = isset( $_GET['log_id'] ) ? absint( wp_unslash( $_GET['log_id'] ) ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only admin page.

	$url = filter_ai_error_logs_settings_url( $log_id );
	if ( function_exists( 'wp_safe_redirect' ) ) {
		wp_safe_redirect( $url );
		exit;
	}

	echo '<div class="wrap">';
	echo '<p><a href="' . esc_url( $url ) . '">' . esc_html__( 'View Filter AI error logs in Settings.', 'filter-ai' ) . '</a></p>';
	echo '</div>';
}

/**
 * Redirect legacy Error Logs admin URLs to the Settings tab.
 *
 * @return void
 */
function filter_ai_redirect_legacy_error_logs_page() {
	if ( ! is_admin() || ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only legacy redirect.
	if ( 'filter_ai_error_logs' !== $page ) {
		return;
	}

	$log_id = isset( $_GET['log_id'] ) ? absint( wp_unslash( $_GET['log_id'] ) ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only legacy redirect.
	wp_safe_redirect( filter_ai_error_logs_settings_url( $log_id ) );
	exit;
}

add_action( 'admin_init', 'filter_ai_redirect_legacy_error_logs_page' );
