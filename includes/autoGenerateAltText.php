<?php
/**
 * Batch image alt text functions
 */

use Felix_Arntz\AI_Services\Services\API\Enums\AI_Capability;
use Felix_Arntz\AI_Services\Services\API\Enums\Content_Role;
use Felix_Arntz\AI_Services\Services\API\Types\Content;
use Felix_Arntz\AI_Services\Services\API\Types\Parts;
use Felix_Arntz\AI_Services\Services\API\Helpers;

add_action( 'add_attachment', 'auto_generate_alt_text', 10, 1 );

/**
 * Auto-generates alt text using AI.
 *
 * @param int $attachment_id The ID of the image attachment.
 * @throws Exception If the attachment ID is not set or AI service is unavailable.
 * @return void
 */
function auto_generate_alt_text( $attachment_id ) {

	if ( ! isset( $attachment_id ) ) {
		throw new Exception( esc_html__( 'Missing image', 'filter-ai' ) );
	}

	$mime = get_post_mime_type( $attachment_id );
	if ( ! $mime || strpos( $mime, 'image/' ) !== 0 ) {
		throw new Exception( esc_html__( 'Filter AI: Not an image attachment MIME', 'filter-ai' ) );
	}

	$settings         = get_option( 'filter_ai_settings', [] );
	$auto_img_enabled = isset( $settings['image_alt_text_enabled'] ) ? $settings['image_alt_text_enabled'] : false;
	if ( ! $auto_img_enabled ) {
		throw new Exception( esc_html__( 'Filter AI: Auto-generate setting is disabled.', 'filter-ai' ) );
	}

	$existing_alt = get_post_meta( $attachment_id, '_wp_attachment_image_alt', true );
	if ( ! empty( $existing_alt ) ) {
		throw new Exception( esc_html__( 'Filter AI: Alt text already exists', 'filter-ai' ) );
	}

	$url = wp_get_attachment_url( $attachment_id );
	if ( ! $url ) {
		throw new Exception( esc_html__( 'Filter AI: Could not get attachment URL.', 'filter-ai' ) );
	}

	$file_path = get_attached_file( $attachment_id );
	if ( ! file_exists( $file_path ) ) {
		throw new Exception( esc_html__( 'Filter AI: File does not exist at path', 'filter-ai' ) );
	}

	$mime_type            = mime_content_type( $file_path );
	$supported_mime_types = [ 'image/jpeg', 'image/png', 'image/webp' ];
	if ( ! in_array( $mime_type, $supported_mime_types, true ) ) {
		throw new Exception( esc_html__( 'Filter AI: Unsupported MIME type', 'filter-ai' ) );
	}

	$image_data = file_get_contents( $file_path );

	// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Used safely for image data in API request
	$image_base_64   = 'data:' . $mime_type . ';base64,' . base64_encode( $image_data );
	$current_user_id = get_current_user_id();

	$base_prompt        = ! empty( $settings['image_alt_text_prompt'] )
	? $settings['image_alt_text_prompt']
	: 'Please generate a short description no more than 50 words for the following image that can be used as its alternative text. The description should be clear, succinct, and provide a sense of what the image portrays, ensuring that it is accessible to individuals using screen readers.';
	$stop_words_prompt  = isset( $settings['stop_words_prompt'] ) ? $settings['stop_words_prompt'] : '';
	$brand_voice_prompt = isset( $settings['brand_voice_prompt'] ) ? $settings['brand_voice_prompt'] : '';
	$pre_prompt         = 'The response should only contain the answer and in plain text, so no <br> tags for line breaks. ';

	$full_prompt = trim( "$base_prompt $brand_voice_prompt $stop_words_prompt $pre_prompt" );

	$parts = new Parts();
	$parts->add_text_part( $full_prompt );
	$parts->add_file_data_part( $mime_type, $image_base_64 );
	$content = new Content( Content_role::USER, $parts );

	if ( ! function_exists( 'ai_services' ) || ! ai_services()->has_available_services() ) {
		throw new Exception( esc_html__( 'Filter AI: No available AI service.', 'filter-ai' ) );
	}

	$required_capabilities = array(
		'capabilities' => array(
			AI_Capability::MULTIMODAL_INPUT,
			AI_Capability::TEXT_GENERATION,
		),
	);

	try {

		if ( ai_services()->has_available_services( $required_capabilities ) === false ) {
			throw new Exception( __( 'AI service not available', 'filter-ai' ) );
		}

		$service = ai_services()->get_available_service( $required_capabilities );

		$candidates = $service->get_model(
			array_merge(
				array( 'feature' => 'filter-ai-image-alt-text' ),
				$required_capabilities
			)
		)->generate_text( $content );

		$text = Helpers::get_text_from_contents(
			Helpers::get_candidate_contents( $candidates )
		);

		if ( ! empty( $text ) ) {
			update_post_meta( $attachment_id, '_wp_attachment_image_alt', sanitize_text_field( $text ) );
		}
	} finally {
		wp_set_current_user( $current_user_id );
	}
}
