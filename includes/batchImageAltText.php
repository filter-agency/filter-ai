<?php
/**
 * Batch image alt text functions
 */

// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/settings.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/providers/detection.php';
require_once __DIR__ . '/error-log.php';

/**
 * Get list of all image mime types
 *
 * @return string[] Array of all image mime types
 */
function filter_ai_all_mime_types() {
	$post_mime_types = array(
		'image/jpeg',
		'image/gif',
		'image/png',
		'image/bmp',
		'image/tiff',
		'image/webp',
		'image/avif',
		'image/x-icon',
		'image/heic',
		'image/heif',
		'image/heic-sequence',
		'image/heif-sequence',
	);

	return implode( ',', $post_mime_types );
}

/**
 * Get list of supported image mime types
 *
 * @return string[] Array of supported image mime types
 */
function filter_ai_supported_mime_types() {
	$post_mime_types = array(
		// disable avif as Open AI doesn't currently suport it
		// https://platform.openai.com/docs/guides/images-vision?api-mode=responses#image-input-requirements
		// 'image/avif',
		'image/gif',
		'image/jpeg',
		'image/png',
		'image/webp',
	);

	return implode( ',', $post_mime_types );
}

/**
 * Get list of unsupported image mime types
 *
 * @return string[] Array of unsupported image mime types
 */
function filter_ai_unsupported_mime_types() {
	$post_mime_types = array(
		'image/bmp',
		'image/tiff',
		'image/avif',
		'image/x-icon',
		'image/heic',
		'image/heif',
		'image/heic-sequence',
		'image/heif-sequence',
	);

	return implode( ',', $post_mime_types );
}

/**
 * Get all images
 *
 * @return int Returns number of images
 */
function filter_ai_get_images_count() {
	$args = array(
		'post_type'              => 'attachment',
		'post_mime_type'         => filter_ai_all_mime_types(),
		'post_status'            => 'inherit',
		'posts_per_page'         => 1,
		'paged'                  => 1,
		'update_post_meta_cache' => false,
		'update_post_term_cache' => false,
		'fields'                 => 'ids',
	);

	$attachments = new WP_Query( $args );

	return $attachments->found_posts;
}

/**
 * Get all images without alt text query
 *
 * @param int    $paged Page number
 * @param int    $posts_per_page Number of posts per page
 * @param string $type 'supported' / 'unsupported' mime types
 *
 * @return WP_Query Returns WP_Query
 */
function filter_ai_get_images_without_alt_text_query( $paged = 1, $posts_per_page = 500, $type = 'supported' ) {
	$mime_type = filter_ai_supported_mime_types();

	if ( 'unsupported' === $type ) {
		$mime_type = filter_ai_unsupported_mime_types();
	}

	// phpcs:disable WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- Reason: filtering by specific meta key
	$args = array(
		'post_type'              => 'attachment',
		'post_mime_type'         => $mime_type,
		'posts_per_page'         => $posts_per_page,
		'paged'                  => $paged,
		'post_status'            => 'inherit',
		'meta_query'             => array(
			'relation' => 'OR',
			array(
				'key'     => '_wp_attachment_image_alt',
				'value'   => '',
				'compare' => 'NOT EXISTS',
			),
			array(
				'key'     => '_wp_attachment_image_alt',
				'value'   => '',
				'compare' => '=',
			),
		),
		'update_post_term_cache' => false,
		'fields'                 => 'ids',
	);
	// phpcs:enable

	$query = new WP_Query( $args );

	return $query;
}

/**
 * Get all images without alt text
 *
 * @param int $paged Page number
 * @param int $posts_per_page Number of posts per page
 *
 * @return int[] Returns array of image ids
 */
function filter_ai_get_images_without_alt_text( $paged, $posts_per_page ) {
	$query = filter_ai_get_images_without_alt_text_query( $paged, $posts_per_page );

	return $query->get_posts();
}

/**
 * Get number of all images without alt text
 *
 * @param string $type 'supported' / 'unsupported' mime types
 *
 * @return int Return number of images without alt text
 */
function filter_ai_get_images_without_alt_text_count( $type ) {
	$query = filter_ai_get_images_without_alt_text_query( 1, 1, $type );

	return $query->found_posts;
}

/**
 * Generate image alt text
 *
 * @param array $args Object containing image_id and user_id
 *
 * @throws Exception If $image_page is empty
 * @throws Exception If $image_mime_type is empty
 * @throws Exception If no ai services are available
 * @throws Exception If $text is empty
 *
 * @return void Returns early if the image already has alt text
 */
function filter_ai_process_batch_image_alt_text( $args ) {
	$image_id = $args['image_id'];
	$user_id  = $args['user_id'];

	if ( ! isset( $image_id ) ) {
		throw new Exception( esc_html__( 'Missing image', 'filter-ai' ) );
	}

	if ( ! isset( $user_id ) ) {
		throw new Exception( esc_html__( 'Missing user', 'filter-ai' ) );
	}

	$settings        = filter_ai_get_settings();
	$service_slug    = $settings['image_alt_text_prompt_service'];
	$current_user_id = get_current_user_id();
	$metadata        = wp_get_attachment_metadata( $image_id );
	$image_alt_text  = get_post_meta( $image_id, '_wp_attachment_image_alt', true );
	$image_file      = get_attached_file( $image_id );
	$image_mime_type = get_post_mime_type( $image_id );
	$image_path      = $image_file;

	if ( isset( $metadata['sizes']['medium'] ) ) {
		$image_path = dirname( $image_file ) . '/' . $metadata['sizes']['medium']['file'];
	}

	if ( ! empty( $image_alt_text ) ) {
		return;
	}

	if ( empty( $image_path ) ) {
		throw new Exception( esc_html__( 'Missing image path', 'filter-ai' ) );
	}

	if ( empty( $image_mime_type ) ) {
		throw new Exception( esc_html__( 'Missing image mime type', 'filter-ai' ) );
	}

	$mime_types = filter_ai_supported_mime_types();

	if ( ! strpos( $mime_types, $image_mime_type ) ) {
		// return rather throw so we don't cause lots of errors with the auto generation
		return;
	}

	try {
		wp_set_current_user( $user_id );

		$provider = filter_ai_provider();
		if ( null === $provider ) {
			throw new Exception( esc_html__( 'AI service not available', 'filter-ai' ) );
		}

		$prompt = filter_ai_get_prompt( 'image_alt_text_prompt' );

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$image_data = file_get_contents( $image_path );
		$files      = array(
			array(
				'mime_type' => $image_mime_type,
				// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
				'data'      => base64_encode( $image_data ),
			),
		);

		$text = $provider->generate_text(
			$prompt,
			$files,
			'filter-ai-image-alt-text',
			array( 'multimodal_input', 'text_generation' ),
			$service_slug
		);

		if ( is_wp_error( $text ) ) {
			$logged = filter_ai_log_wp_error(
				'batch_image_alt_text',
				$text,
				filter_ai_error_generation_context(
					'filter-ai-image-alt-text',
					array( 'multimodal_input', 'text_generation' ),
					$service_slug,
					$files,
					array(
						'image_id'      => (int) $image_id,
						'user_id'       => (int) $user_id,
						'image_path'    => (string) $image_path,
						'prompt_length' => strlen( $prompt ),
					)
				)
			);
			throw new Exception( $logged->get_error_message() );
		}

		if ( empty( $text ) ) {
			$logged = filter_ai_log_wp_error(
				'batch_image_alt_text',
				new WP_Error( 'filter_ai_empty_response', __( 'Issue generating alt text', 'filter-ai' ) ),
				filter_ai_error_generation_context(
					'filter-ai-image-alt-text',
					array( 'multimodal_input', 'text_generation' ),
					$service_slug,
					$files,
					array(
						'image_id'      => (int) $image_id,
						'user_id'       => (int) $user_id,
						'image_path'    => (string) $image_path,
						'prompt_length' => strlen( $prompt ),
					)
				)
			);
			throw new Exception( $logged->get_error_message() );
		}

		update_option( 'filter_ai_last_ai_image_alt_text_service', $provider->last_provider_slug() );

		update_post_meta( $image_id, '_wp_attachment_image_alt', $text );
	} finally {
		wp_set_current_user( $current_user_id );
	}
}

add_action( 'filter_ai_batch_image_alt_text', 'filter_ai_process_batch_image_alt_text' );

/**
 * API handler to trigger batch generation of image alt text
 */
function filter_ai_api_batch_image_alt_text() {
	filter_ai_check_api_request();

	filter_ai_reset_batch( 'filter_ai_batch_image_alt_text' );

	$posts_per_page = 500;
	$images_count   = filter_ai_get_images_without_alt_text_count( 'supported' );
	$total_pages    = ceil( $images_count / $posts_per_page );
	$action_ids     = array();

	for ( $current_page = 1; $current_page <= $total_pages; $current_page++ ) {
		$images = filter_ai_get_images_without_alt_text( $current_page, $posts_per_page );

		if ( ! empty( $images ) ) {
			foreach ( $images as $image_id ) {
				// call action through a scheduled action
				$action_ids[] = as_enqueue_async_action(
					'filter_ai_batch_image_alt_text',
					array(
						array(
							'image_id' => $image_id,
							'user_id'  => get_current_user_id(),
						),
					),
					'filter-ai-current'
				);
			}
		}
	}

	wp_send_json_success();
}

add_action( 'wp_ajax_filter_ai_api_batch_image_alt_text', 'filter_ai_api_batch_image_alt_text' );

/**
 * API handler to get the image counts
 */
function filter_ai_api_get_image_count() {
	filter_ai_check_api_request();

	$action_count = filter_ai_get_action_count( 'filter_ai_batch_image_alt_text' );

	$failed_actions_raw = as_get_scheduled_actions(
		array(
			'hook'     => 'filter_ai_batch_image_alt_text',
			'status'   => ActionScheduler_Store::STATUS_FAILED,
			'group'    => 'filter-ai-current',
			'per_page' => -1,
		),
		'OBJECT'
	);

	$failed_actions = array();

	if ( ! empty( $failed_actions_raw ) ) {
		foreach ( $failed_actions_raw as $action_id => $action ) {
			$logs    = filter_ai_get_action_logs( $action_id );
			$message = null;

			if ( ! empty( $logs ) ) {
				$message = end( $logs )->get_message();
			}

			$failed_actions[] = array(
				'image_id' => $action->get_args()[0]['image_id'],
				'message'  => $message,
			);
		}
	}

	$last_run_service = get_option( 'filter_ai_last_ai_image_alt_text_service', '' );

	wp_send_json_success(
		array(
			'images_count'                              => filter_ai_get_images_count(),
			'unsupported_images_without_alt_text_count' => filter_ai_get_images_without_alt_text_count( 'unsupported' ),
			'supported_images_without_alt_text_count'   => filter_ai_get_images_without_alt_text_count( 'supported' ),
			'actions_count'                             => $action_count->total,
			'pending_actions_count'                     => $action_count->pending,
			'running_actions_count'                     => $action_count->running,
			'complete_actions_count'                    => $action_count->complete,
			'failed_actions_count'                      => $action_count->failed,
			'failed_actions'                            => $failed_actions,
			'last_run_service'                          => $last_run_service,
		)
	);
}

add_action( 'wp_ajax_filter_ai_api_get_image_count', 'filter_ai_api_get_image_count' );

/**
 * API handler to cancel pending scheduled actions
 */
function filter_ai_api_cancel_batch_image_alt_text() {
	filter_ai_check_api_request();

	as_unschedule_all_actions( 'filter_ai_batch_image_alt_text' );

	wp_send_json_success();
}

add_action( 'wp_ajax_filter_ai_api_cancel_batch_image_alt_text', 'filter_ai_api_cancel_batch_image_alt_text' );

/**
 * Function to generate alt text for images on upload
 *
 * @param array $metadata An array of attachment meta data
 * @param int   $attachment_id Current attachment ID
 *
 * @return array $metadata An array of attachment meta data
 */
function filter_ai_generate_alt_text_on_upload( $metadata, $attachment_id ) {
	$settings = filter_ai_get_settings();

	if ( $settings['auto_alt_text_enabled'] && $attachment_id ) {
		$args = array(
			'image_id' => $attachment_id,
			'user_id'  => get_current_user_id(),
		);

		try {
			filter_ai_process_batch_image_alt_text( $args );
		} catch ( \Throwable $error ) { // phpcs:ignore Generic.CodeAnalysis.EmptyStatement.DetectedCatch
			// Swallow failures silently — we don't want a missing/misconfigured
			// AI service to break the user's media upload.
		}
	}

	return $metadata;
}

add_action( 'wp_generate_attachment_metadata', 'filter_ai_generate_alt_text_on_upload', 10, 2 );
