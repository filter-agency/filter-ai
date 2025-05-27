<?php
/**
 * Batch image alt text functions
 */

use Felix_Arntz\AI_Services\Services\API\Enums\AI_Capability;
use Felix_Arntz\AI_Services\Services\API\Enums\Content_Role;
use Felix_Arntz\AI_Services\Services\API\Types\Content;
use Felix_Arntz\AI_Services\Services\API\Types\Parts;
use Felix_Arntz\AI_Services\Services\API\Helpers;

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
 * Filter array of attachments and returns unique items based on $attachment->guid
 *
 * @param mixed[] $attachments Array of attachments
 *
 * @return mixed[] Retuns an array of unique attachments
 */
function filter_ai_get_unique_attachments( $attachments ) {
	$unique_attachments = [];

	foreach ( $attachments as $attachment ) {
		if ( ! isset( $unique_attachments[ $attachment->guid ] ) ) {
			$unique_attachments[ $attachment->guid ] = $attachment;
		}
	}

	return array_values( $unique_attachments );
}

/**
 * Get all images
 *
 * @return mixed[] Returns array of images
 */
function filter_ai_get_images() {
	$args = array(
		'post_type'      => 'attachment',
		'post_mime_type' => filter_ai_mime_types(),
		'posts_per_page' => -1,
		'post_status'    => 'inherit',
	);

	$attachments = get_posts( $args );

	return filter_ai_get_unique_attachments( $attachments );
}

/**
 * Get all images without alt text
 *
 * @return mixed[] Returns array of images without alt text
 */
function filter_ai_get_images_without_alt_text() {
	$args = array(
		'post_type'      => 'attachment',
		'post_mime_type' => filter_ai_mime_types(),
		'posts_per_page' => -1,
		'post_status'    => 'inherit',
		'meta_query'     => array(
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
	);

	$attachments = get_posts( $args );

	return filter_ai_get_unique_attachments( $attachments );
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
	$image_id        = $args['image_id'];
	$user_id         = $args['user_id'];
	$current_user_id = get_current_user_id();
	$metadata        = wp_get_attachment_metadata( $image_id );
	$image_alt_text  = $metadata['_wp_attachment_image_alt'];
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

		$prompt = __( 'Please generate a short description no more than 50 words for the following image that can be used as its alternative text. The description should be clear, succinct, and provide a sense of what the image portrays, ensuring that it is accessible to individuals using screen readers.', 'filter-ai' );

		$settings = get_option( 'filter_ai_settings' );

		if ( ! empty( $settings['image_alt_text_prompt'] ) ) {
			$prompt = $settings['image_alt_text_prompt'];
		}

		$parts->add_text_part( $prompt );

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$image_data = file_get_contents( $image_path );

		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
		$image_base_64 = 'data:' . $image_mime_type . ';base64,' . base64_encode( $image_data );

		$parts->add_file_data_part( $image_mime_type, $image_base_64 );

		$content = new Content( Content_Role::USER, $parts );

		$candidates = $service->get_model(
			array(
				'feature' => 'filter-ai-image-alt-text',
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
 * Reset group_id for scheduled actions to help us track the current actions
 */
function filter_ai_reset_batch_image_alt_text() {
	$actions = as_get_scheduled_actions(
		array(
			'hook'     => 'filter_ai_batch_image_alt_text',
			'group'    => 'filter-ai-current',
			'per_page' => 1,
		),
		'ids'
	);

	$in_progress_actions = as_get_scheduled_actions(
		array(
			'hook'     => 'filter_ai_batch_image_alt_text',
			'status'   => array(
				ActionScheduler_Store::STATUS_PENDING,
				ActionScheduler_Store::STATUS_RUNNING,
			),
			'group'    => 'filter-ai-current',
			'per_page' => 1,
		),
		'ids'
	);

	if ( ! empty( $actions ) && empty( $in_progress_actions ) ) {
		global $wpdb;

		$wpdb->query(
			$wpdb->prepare(
				"UPDATE {$wpdb->prefix}actionscheduler_actions
        SET `group_id` = (
          SELECT group_id FROM {$wpdb->prefix}actionscheduler_groups WHERE slug = ''
        )
        WHERE `hook` = %s AND `group_id` = (
          SELECT group_id FROM {$wpdb->prefix}actionscheduler_groups WHERE slug = %s
        )",
				'filter_ai_batch_image_alt_text',
				'filter-ai-current'
			)
		);
	}
}

/**
 * API handler to trigger batch generation of image alt text
 */
function filter_ai_api_batch_image_alt_text() {
	check_ajax_referer( 'filter_ai_api', 'nonce' );

	filter_ai_reset_batch_image_alt_text();

	$images = filter_ai_get_images_without_alt_text();

	if ( ! empty( $images ) ) {
		foreach ( $images as $image ) {
			// call action through a scheduled action
			as_enqueue_async_action(
				'filter_ai_batch_image_alt_text',
				array(
					array(
						'image_id' => $image->ID,
						'user_id'  => get_current_user_id(),
					),
				),
				'filter-ai-current'
			);

			// call action instantly (user needs to stay on the page)
			// do_action(
			// 'filter_ai_batch_image_alt_text',
			// array(
			// 'image_id' => $image->ID,
			// 'user_id' => get_current_user_id()
			// )
			// );
		}
	}

	wp_send_json_success();
}

add_action( 'wp_ajax_filter_ai_api_batch_image_alt_text', 'filter_ai_api_batch_image_alt_text' );

/**
 * Get the last log message for a scheduled action
 *
 * @param int $action_id Scheduled action ID
 *
 * @return null|string Return log message
 */
function filter_ai_get_last_log_for_action_id( $action_id ) {
	if ( ! isset( $action_id ) ) {
		return null;
	}

	global $wpdb;

	$log = null;

	try {
		$log = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT `message` FROM {$wpdb->prefix}actionscheduler_logs
        WHERE action_id = %s
        ORDER BY log_date_gmt DESC
        LIMIT 1",
				$action_id
			)
		);
	} catch ( Exception $e ) {
		$log = null;
	}

	return $log->message;
}

/**
 * API handler to get the image counts
 */
function filter_ai_api_get_image_count() {
	check_ajax_referer( 'filter_ai_api', 'nonce' );

	$actions = as_get_scheduled_actions(
		array(
			'hook'     => 'filter_ai_batch_image_alt_text',
			'group'    => 'filter-ai-current',
			'per_page' => -1,
		),
		'ids'
	);

	$pending_actions = as_get_scheduled_actions(
		array(
			'hook'     => 'filter_ai_batch_image_alt_text',
			'status'   => ActionScheduler_Store::STATUS_PENDING,
			'group'    => 'filter-ai-current',
			'per_page' => -1,
		),
		'ids'
	);

	$running_actions = as_get_scheduled_actions(
		array(
			'hook'     => 'filter_ai_batch_image_alt_text',
			'status'   => ActionScheduler_Store::STATUS_RUNNING,
			'group'    => 'filter-ai-current',
			'per_page' => -1,
		),
		'ids'
	);

	$complete_actions = as_get_scheduled_actions(
		array(
			'hook'     => 'filter_ai_batch_image_alt_text',
			'status'   => ActionScheduler_Store::STATUS_COMPLETE,
			'group'    => 'filter-ai-current',
			'per_page' => -1,
		),
		'ids'
	);

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
			$log = filter_ai_get_last_log_for_action_id( $action_id );

			$failed_actions[] = array(
				'image_id' => $action->get_args()[0]['image_id'],
				'message'  => $log,
			);
		}
	}

	wp_send_json_success(
		array(
			'images_count'                  => count( filter_ai_get_images() ),
			'images_without_alt_text_count' => count( filter_ai_get_images_without_alt_text() ),
			'actions_count'                 => count( $actions ),
			'pending_actions_count'         => count( $pending_actions ),
			'running_actions_count'         => count( $running_actions ),
			'complete_actions_count'        => count( $complete_actions ),
			'failed_actions_count'          => count( $failed_actions ),
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
