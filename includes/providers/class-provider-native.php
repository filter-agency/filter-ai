<?php
/**
 * Native backend — WordPress 7.0+ AI Client (`wp_ai_client_prompt()`).
 *
 * @package Filter_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * WordPress-7.0-native AI provider.
 */
class Filter_AI_Provider_Native implements Filter_AI_Provider {

	/**
	 * Slug of the provider preferred in the most recent generate_text() call.
	 *
	 * @var string
	 */
	private $last_provider_slug = '';

	/**
	 * Build a prompt builder, attaching any multimodal input files.
	 *
	 * @param string $prompt Prompt text.
	 * @param array  $files  Each: [ 'mime_type' => string, 'data' => base64-or-data-uri ].
	 * @return WP_AI_Client_Prompt_Builder
	 */
	private function builder( $prompt, array $files = array() ) {
		$builder = wp_ai_client_prompt( $prompt );
		foreach ( $files as $file ) {
			$data    = 0 === strpos( $file['data'], 'data:' )
				? $file['data']
				: 'data:' . $file['mime_type'] . ';base64,' . $file['data'];
			$builder = $builder->with_file( $data );
		}
		return $builder;
	}

	/**
	 * Check whether text generation is supported.
	 *
	 * @param string[]    $capabilities  Capability slugs.
	 * @param string|null $provider_slug Optional provider slug.
	 * @return bool
	 */
	public function is_text_supported( array $capabilities, $provider_slug = null ) {
		try {
			return (bool) $this->builder( 'capability check' )->is_supported_for_text_generation();
		} catch ( \Throwable $e ) {
			return false;
		}
	}

	/**
	 * Check whether image generation is supported.
	 *
	 * @param string|null $provider_slug Optional provider slug.
	 * @return bool
	 */
	public function is_image_supported( $provider_slug = null ) {
		try {
			return (bool) $this->builder( 'capability check' )->is_supported_for_image_generation();
		} catch ( \Throwable $e ) {
			return false;
		}
	}

	/**
	 * Generate text from a prompt with optional multimodal files.
	 *
	 * @param string      $prompt        Prompt text.
	 * @param array       $files         Multimodal input files.
	 * @param string      $feature       Filter AI feature id.
	 * @param string[]    $capabilities  Required capabilities.
	 * @param string|null $provider_slug Optional provider slug.
	 * @return string|WP_Error
	 */
	public function generate_text( $prompt, array $files, $feature, array $capabilities, $provider_slug = null ) {
		try {
			$this->last_provider_slug = $provider_slug ? (string) $provider_slug : '';

			$builder = $this->builder( $prompt, $files );
			if ( ! $builder->is_supported_for_text_generation() ) {
				return new WP_Error( 'filter_ai_unavailable', __( 'No AI provider is configured for text generation.', 'filter-ai' ) );
			}
			return $builder->generate_text();
		} catch ( \Throwable $e ) {
			return new WP_Error( 'filter_ai_generation_failed', $e->getMessage() );
		}
	}

	/**
	 * Generate one or more images from a prompt.
	 *
	 * @param string      $prompt        Prompt text.
	 * @param array       $config        Generation config (candidate_count, aspect_ratio).
	 * @param string      $feature       Filter AI feature id.
	 * @param string|null $provider_slug Optional provider slug.
	 * @return array|WP_Error
	 */
	public function generate_image( $prompt, array $config, $feature, $provider_slug = null ) {
		try {
			$builder = $this->builder( $prompt );
			if ( ! $builder->is_supported_for_image_generation() ) {
				return new WP_Error( 'filter_ai_unavailable', __( 'No AI provider is configured for image generation.', 'filter-ai' ) );
			}
			$file = $builder->generate_image();
			if ( is_wp_error( $file ) ) {
				return $file;
			}
			return array( $file->getDataUri() );
		} catch ( \Throwable $e ) {
			return new WP_Error( 'filter_ai_generation_failed', $e->getMessage() );
		}
	}

	/**
	 * Slug of the provider preferred in the most recent generate_text() call.
	 *
	 * @return string Provider slug, or '' if unknown / none used yet.
	 */
	public function last_provider_slug() {
		return $this->last_provider_slug;
	}

	/**
	 * List configured AI-provider connectors (excludes non-AI connectors like Akismet).
	 *
	 * @return array Map of slug => [ label, capabilities, is_available ].
	 */
	public function list_providers() {
		$out = array();
		if ( ! function_exists( 'wp_get_connectors' ) ) {
			return $out;
		}
		$registry = class_exists( 'WordPress\\AiClient\\AiClient' ) ? WordPress\AiClient\AiClient::defaultRegistry() : null;
		foreach ( (array) wp_get_connectors() as $slug => $connector ) {
			if ( ! is_string( $slug ) || ! is_array( $connector ) || 'ai_provider' !== ( isset( $connector['type'] ) ? $connector['type'] : '' ) ) {
				continue;
			}
			$out[ $slug ] = array(
				'label'        => isset( $connector['name'] ) ? $connector['name'] : $slug,
				'capabilities' => array(),
				'is_available' => $registry ? (bool) $registry->isProviderConfigured( $slug ) : false,
			);
		}
		return $out;
	}
}
