<?php
/**
 * Batch image alt text functions
 */

use Felix_Arntz\AI_Services\Services\API\Enums\AI_Capability;
use Felix_Arntz\AI_Services\Services\API\Enums\Content_Role;
use Felix_Arntz\AI_Services\Services\API\Types\Content;
use Felix_Arntz\AI_Services\Services\API\Types\Parts;
use Felix_Arntz\AI_Services\Services\API\Helpers;

require_once 'helpers.php';

/**
 * Get list of supported image mime types
 *
 * @return string[] Array of supported image mime types
 */
function filter_ai_mime_types() {
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
 * Get all images
 *
 * @return int Returns number of images
 */
function filter_ai_get_images_count() {
	$args = array(
		'post_type'              => 'attachment',
		'post_mime_type'         => filter_ai_mime_types(),
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
 * @param int $paged Page number
 * @param int $posts_per_page Number of posts per page
 *
 * @return WP_Query Returns WP_Query
 */
function filter_ai_get_images_without_alt_text_query( $paged = 1, $posts_per_page = 500 ) {
	$args = array(
		'post_type'              => 'attachment',
		'post_mime_type'         => filter_ai_mime_types(),
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
 * @return int Return number of images without alt text
 */
function filter_ai_get_images_without_alt_text_count() {
	$query = filter_ai_get_images_without_alt_text_query( 1, 1 );

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

	$mime_types = filter_ai_mime_types();

	if ( ! strpos( $mime_types, $image_mime_type ) ) {
		// return rather throw so we don't cause lots of errors with the auto generation
		return;
	}

	$required_capabilities = array(
		'capabilities' => array(
			AI_Capability::MULTIMODAL_INPUT,
			AI_Capability::TEXT_GENERATION,
		),
	);

	try {
		wp_set_current_user( $user_id );

		if ( ai_services()->has_available_services( $required_capabilities ) === false ) {
			throw new Exception( __( 'AI service not available', 'filter-ai' ) );
		}

		$service = ai_services()->get_available_service( $required_capabilities );

		$parts = new Parts();

		$pre_prompt = 'The response should only contain the answer and in plain text, so no <br> tags for line breaks.';

		$prompt = 'Please generate a short description no more than 50 words for the following image that can be used as its alternative text. The description should be clear, succinct, and provide a sense of what the image portrays, ensuring that it is accessible to individuals using screen readers.';

		$settings = get_option( 'filter_ai_settings', [] );

		if ( ! empty( $settings['image_alt_text_prompt'] ) ) {
			$prompt = $settings['image_alt_text_prompt'];
		}

		$stop_words_prompt = ! empty( $settings['stop_words_prompt'] ) ? $settings['stop_words_prompt'] : '';

		$brand_voice_prompt = ! empty( $settings['brand_voice_prompt'] ) ? $settings['brand_voice_prompt'] : '';

		$full_prompt = $pre_prompt . ' ' . $brand_voice_prompt . ' ' . $stop_words_prompt . ' ' . $prompt;

		$parts->add_text_part( $full_prompt );

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$image_data = file_get_contents( $image_path );

		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
		$image_base_64 = 'data:' . $image_mime_type . ';base64,' . base64_encode( $image_data );

		$parts->add_file_data_part( $image_mime_type, $image_base_64 );

		$content = new Content( Content_Role::USER, $parts );

		$candidates = $service->get_model(
			array_merge(
				array(
					'feature' => 'filter-ai-image-alt-text',
				),
				$required_capabilities,
			)
		)->generate_text( $content );

		$text = Helpers::get_text_from_contents(
			Helpers::get_candidate_contents( $candidates )
		);

		if ( empty( $text ) ) {
			throw new Exception( esc_html__( 'Issue generating alt text', 'filter-ai' ) );
		}

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
	check_ajax_referer( 'filter_ai_api', 'nonce' );

	filter_ai_reset_batch( 'filter_ai_batch_image_alt_text' );

	$posts_per_page = 500;
	$images_count   = filter_ai_get_images_without_alt_text_count();
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

	if ( class_exists( 'ActionScheduler' ) && ! empty( $action_ids ) ) {
		// trigger the first action rather than waiting on the queue
		ActionScheduler::runner()->process_action( $action_ids[0] );
	}

	wp_send_json_success();
}

add_action( 'wp_ajax_filter_ai_api_batch_image_alt_text', 'filter_ai_api_batch_image_alt_text' );

/**
 * API handler to get the image counts
 */
function filter_ai_api_get_image_count() {
	check_ajax_referer( 'filter_ai_api', 'nonce' );

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
			$logger = ActionScheduler::logger();
			$logs   = $logger->get_logs( $action_id );

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

	wp_send_json_success(
		array(
			'images_count'                  => filter_ai_get_images_count(),
			'images_without_alt_text_count' => filter_ai_get_images_without_alt_text_count(),
			'actions_count'                 => $action_count->total,
			'pending_actions_count'         => $action_count->pending,
			'running_actions_count'         => $action_count->running,
			'complete_actions_count'        => $action_count->complete,
			'failed_actions_count'          => $action_count->failed,
			'failed_actions'                => $failed_actions,
		)
	);
}

add_action( 'wp_ajax_filter_ai_api_get_image_count', 'filter_ai_api_get_image_count' );

/**
 * API handler to cancel pending scheduled actions
 */
function filter_ai_api_cancel_batch_image_alt_text() {
	check_ajax_referer( 'filter_ai_api', 'nonce' );

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
	$settings         = get_option( 'filter_ai_settings', [] );
	$auto_img_enabled = isset( $settings['auto_alt_text_enabled'] ) ? $settings['auto_alt_text_enabled'] : false;

	if ( $auto_img_enabled && $attachment_id ) {
		$args = array(
			'image_id' => $attachment_id,
			'user_id'  => get_current_user_id(),
		);

		try {
			filter_ai_process_batch_image_alt_text( $args );
		} catch ( error ) { // phpcs:ignore Generic.CodeAnalysis.EmptyStatement.DetectedCatch
			// error silently
		}
	}

	return $metadata;
}

add_action( 'wp_generate_attachment_metadata', 'filter_ai_generate_alt_text_on_upload', 10, 2 );
