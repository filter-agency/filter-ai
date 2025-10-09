<?php
/**
 * Batch SEO title functions
 */

use Felix_Arntz\AI_Services\Services\API\Enums\AI_Capability;
use Felix_Arntz\AI_Services\Services\API\Enums\Content_Role;
use Felix_Arntz\AI_Services\Services\API\Types\Content;
use Felix_Arntz\AI_Services\Services\API\Types\Parts;
use Felix_Arntz\AI_Services\Services\API\Helpers;

require_once __DIR__ . '/settings.php';
require_once __DIR__ . '/helpers.php';

/**
 * Get posts for a specific post_type that is missing _yoast_wpseo_title meta
 *
 * @param int $paged Page number
 * @param int $posts_per_page Number of posts per page
 *
 * @return int[] Returns array of post ids
 */
function filter_ai_get_posts_missing_seo_title( $paged, $posts_per_page ) {
	$query = filter_ai_get_posts_missing_meta_query( '_yoast_wpseo_title', $paged, $posts_per_page, 'any' );

	return $query->get_posts();
}

/**
 * Get count for a specific post_type that is missing _yoast_wpseo_title meta
 *
 * @param string $post_type Post type
 *
 * @return number Number of posts
 */
function filter_ai_get_posts_default_seo_title_count( $post_type = 'any' ) {
	$query = filter_ai_get_posts_missing_meta_query( '_yoast_wpseo_title', 1, 1, $post_type );

	return $query->found_posts;
}

/**
 * Get count for a specific post_type that has the _yoast_wpseo_title meta
 *
 * @param string $post_type Post type
 *
 * @return number Number of posts
 */
function filter_ai_get_posts_custom_seo_title_count( $post_type = 'any' ) {
	$query = filter_ai_get_posts_has_meta_query( '_yoast_wpseo_title', 1, 1, $post_type );

	return $query->found_posts;
}

/**
 * Generate post SEO title
 *
 * @param array $args Object containing post_id and user_id
 *
 * @throws Exception If $post_id is empty
 * @throws Exception If no ai services are available
 * @throws Exception If $text is empty
 *
 * @return void Returns early if the post already has a SEO title
 */
function filter_ai_process_batch_seo_title( $args ) {
	$post_id = $args['post_id'];
	$user_id = $args['user_id'];

	if ( ! isset( $post_id ) ) {
		throw new Exception( esc_html__( 'Missing post', 'filter-ai' ) );
	}

	if ( ! isset( $user_id ) ) {
		throw new Exception( esc_html__( 'Missing user', 'filter-ai' ) );
	}

	$settings        = filter_ai_get_settings();
	$service_slug    = $settings['yoast_seo_title_prompt_service'];
	$post_type       = get_post_type( $post_id );
	$current_user_id = get_current_user_id();
	$seo_title       = get_post_meta( $post_id, '_yoast_wpseo_title', true );
	$post            = get_post( $post_id );
	$post_content    = $post->post_content;

	if ( ! empty( $seo_title ) ) {
		return;
	}

	if ( empty( $post_content ) ) {
		throw new Exception( esc_html__( 'Missing content', 'filter-ai' ) );
	}

	$required_capabilities = array(
		'capabilities' => array(
			AI_Capability::TEXT_GENERATION,
		),
	);

	try {
		wp_set_current_user( $user_id );

		$required_slugs = array();

		if ( ! empty( $service_slug ) ) {
			$required_slugs['slugs'] = [ $service_slug ];
		}

		if ( ai_services()->has_available_services( array_merge( $required_slugs, $required_capabilities ) ) === false ) {
			throw new Exception( esc_html__( 'AI service not available', 'filter-ai' ) );
		}

		if ( ! empty( $service_slug ) ) {
			$service = ai_services()->get_available_service( $service_slug );
		} else {
			$service = ai_services()->get_available_service( $required_capabilities );
		}

		update_option( 'filter_ai_last_seo_title_service', $service->get_service_slug() );

		$parts = new Parts();

		$prompt = filter_ai_get_prompt( 'yoast_seo_title_prompt' );

		$parts->add_text_part( $prompt . ' ' . $post_content );

		$content = new Content( Content_Role::USER, $parts );

		$candidates = $service->get_model(
			array_merge(
				array(
					'feature' => 'filter-ai-seo-title',
				),
				$required_capabilities,
			)
		)->generate_text( $content );

		$text = Helpers::get_text_from_contents(
			Helpers::get_candidate_contents( $candidates )
		);

		if ( empty( $text ) ) {
			throw new Exception( esc_html__( 'Issue generating SEO title', 'filter-ai' ) );
		}

		$wpseo_titles = get_option( 'wpseo_titles', [] );
		$yoast_title  = isset( $wpseo_titles[ 'title-' . $post_type ] ) ? $wpseo_titles[ 'title-' . $post_type ] : null;

		if ( ! empty( $yoast_title ) ) {
			if ( str_contains( $yoast_title, '%%title%%' ) ) {
				$text = str_replace( '%%title%%', $text, $yoast_title );
			} else {
				$text = $text . ' ' . $yoast_title;
			}
		}

		update_post_meta( $post_id, '_yoast_wpseo_title', $text );
	} finally {
		wp_set_current_user( $current_user_id );
	}
}

add_action( 'filter_ai_batch_seo_title', 'filter_ai_process_batch_seo_title' );

/**
 * API handler to trigger batch generation of SEO title
 */
function filter_ai_api_batch_seo_title() {
	check_ajax_referer( 'filter_ai_api', 'nonce' );

	filter_ai_reset_batch( 'filter_ai_batch_seo_title' );

	$posts_per_page = 500;
	$posts_count    = filter_ai_get_posts_default_seo_title_count();
	$total_pages    = ceil( $posts_count / $posts_per_page );
	$action_ids     = array();

	for ( $current_page = 1; $current_page <= $total_pages; $current_page++ ) {
		$posts = filter_ai_get_posts_missing_seo_title( $current_page, $posts_per_page );

		if ( ! empty( $posts ) ) {
			foreach ( $posts as $post_id ) {
				// call action through a scheduled action
				$action_ids[] = as_enqueue_async_action(
					'filter_ai_batch_seo_title',
					array(
						array(
							'post_id' => $post_id,
							'user_id' => get_current_user_id(),
						),
					),
					'filter-ai-current'
				);
			}
		}
	}

	wp_send_json_success();
}

add_action( 'wp_ajax_filter_ai_api_batch_seo_title', 'filter_ai_api_batch_seo_title' );

/**
 * API handler to get the SEO title counts
 */
function filter_ai_api_get_seo_title_count() {
	check_ajax_referer( 'filter_ai_api', 'nonce' );

	$post_types =
	array_filter(
		get_post_types(
			array(
				'public' => true,
			),
			'objects'
		),
		function ( $type ) {
			return ! in_array( $type->name, [ 'attachment' ], true );
		}
	);

	$post_type_count = array();

	if ( ! empty( $post_types ) ) {
		foreach ( $post_types as $key => $value ) {
			$post_type_count[] = array(
				'label'   => $value->label,
				'total'   => filter_ai_get_posts_count( $key ),
				'default' => filter_ai_get_posts_default_seo_title_count( $key ),
				'custom'  => filter_ai_get_posts_custom_seo_title_count( $key ),
			);
		}
	}

	$action_count = filter_ai_get_action_count( 'filter_ai_batch_seo_title' );

	$failed_actions_raw = as_get_scheduled_actions(
		array(
			'hook'     => 'filter_ai_batch_seo_title',
			'status'   => ActionScheduler_Store::STATUS_FAILED,
			'group'    => 'filter-ai-current',
			'per_page' => -1,
		),
		'OBJECT'
	);

	$failed_actions = array();

	if ( ! empty( $failed_actions_raw ) ) {
		foreach ( $failed_actions_raw as $action_id => $action ) {
			$logger = ActionScheduler::logger();
			$logs   = $logger->get_logs( $action_id );

			$message = null;

			if ( ! empty( $logs ) ) {
				$message = end( $logs )->get_message();
			}

			$failed_actions[] = array(
				'post_id' => $action->get_args()[0]['post_id'],
				'message' => $message,
			);
		}
	}

	$last_run_service = get_option( 'filter_ai_last_seo_title_service', '' );

	wp_send_json_success(
		array(
			'post_types'             => $post_type_count,
			'total_count'            => filter_ai_get_posts_count(),
			'total_default_count'    => filter_ai_get_posts_default_seo_title_count(),
			'total_custom_count'     => filter_ai_get_posts_custom_seo_title_count(),
			'actions_count'          => $action_count->total,
			'pending_actions_count'  => $action_count->pending,
			'running_actions_count'  => $action_count->running,
			'complete_actions_count' => $action_count->complete,
			'failed_actions_count'   => $action_count->failed,
			'failed_actions'         => $failed_actions,
			'last_run_service'       => $last_run_service,
			'yoast_seo_titles'       => get_option( 'wpseo_titles', [] ),
		)
	);
}

add_action( 'wp_ajax_filter_ai_api_get_seo_title_count', 'filter_ai_api_get_seo_title_count' );

/**
 * API handler to cancel pending scheduled actions
 */
function filter_ai_api_cancel_batch_seo_title() {
	check_ajax_referer( 'filter_ai_api', 'nonce' );

	as_unschedule_all_actions( 'filter_ai_batch_seo_title' );

	wp_send_json_success();
}

add_action( 'wp_ajax_filter_ai_api_cancel_batch_seo_title', 'filter_ai_api_cancel_batch_seo_title' );
