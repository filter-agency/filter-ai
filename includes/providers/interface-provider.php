<?php
/**
 * Contract every AI backend implements. The version branch lives only in the
 * factory (Task 6); callers depend on this interface.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

interface Filter_AI_Provider {

	/**
	 * Whether text generation is supported for the given capabilities and provider.
	 *
	 * @param string[]    $capabilities  Capability slugs the feature needs.
	 * @param string|null $provider_slug Stored per-feature provider, or null for auto.
	 * @return bool
	 */
	public function is_text_supported( array $capabilities, $provider_slug = null );

	/**
	 * Whether image generation is supported for the given provider.
	 *
	 * @param string|null $provider_slug Stored per-feature provider, or null.
	 * @return bool
	 */
	public function is_image_supported( $provider_slug = null );

	/**
	 * Generate text from a prompt, optional multimodal files, and capability requirements.
	 *
	 * @param string      $prompt        The prompt text.
	 * @param array       $files         Each: [ 'mime_type' => string, 'data' => base64-or-data-uri ].
	 * @param string      $feature       Filter AI feature id (e.g. 'filter-ai-seo-title').
	 * @param string[]    $capabilities  Required capabilities.
	 * @param string|null $provider_slug Stored per-feature provider, or null.
	 * @return string|WP_Error Generated text, or WP_Error on failure.
	 */
	public function generate_text( $prompt, array $files, $feature, array $capabilities, $provider_slug = null );

	/**
	 * Stream text generation from a prompt. Implementations that don't support
	 * streaming should return WP_Error with code 'filter_ai_streaming_unsupported'
	 * so the REST layer can fall back to one-shot generate_text() and emit a
	 * single SSE frame.
	 *
	 * @param string      $prompt        The prompt text.
	 * @param array       $files         Each: [ 'mime_type' => string, 'data' => base64-or-data-uri ].
	 * @param string      $feature       Filter AI feature id.
	 * @param string[]    $capabilities  Required capabilities.
	 * @param string|null $provider_slug Stored per-feature provider, or null.
	 * @return Generator|WP_Error Generator yielding text fragments, or WP_Error.
	 */
	public function stream_generate_text( $prompt, array $files, $feature, array $capabilities, $provider_slug = null );

	/**
	 * Generate one or more images from a prompt.
	 *
	 * @param string      $prompt        The prompt text.
	 * @param array       $config        [ 'candidate_count' => int, 'aspect_ratio' => string ].
	 * @param string      $feature       Filter AI feature id.
	 * @param string|null $provider_slug Stored per-feature provider, or null.
	 * @return array|WP_Error List of image data URIs / URLs, or WP_Error.
	 */
	public function generate_image( $prompt, array $config, $feature, $provider_slug = null );

	/**
	 * List all configured providers with their labels and capabilities.
	 *
	 * @return array Map of slug => [ 'label' => string, 'capabilities' => string[] ] for configured providers.
	 */
	public function list_providers();

	/**
	 * List flattened provider/model options for settings dropdowns.
	 *
	 * @return array[] List of selectable provider/model options.
	 */
	public function list_provider_models();

	/**
	 * Slug of the provider used by the most recent generate_text() call.
	 *
	 * @return string Provider slug, or '' if unknown / none used yet.
	 */
	public function last_provider_slug();
}
