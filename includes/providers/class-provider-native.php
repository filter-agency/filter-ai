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
	 * @param string      $prompt        Prompt text.
	 * @param array       $files         Each: [ 'mime_type' => string, 'data' => base64-or-data-uri ].
	 * @param string|null $provider_slug Per-feature provider slug, or null for automatic selection.
	 * @param string[]    $capabilities  Required capability slugs (e.g. 'text_generation').
	 * @return WP_AI_Client_Prompt_Builder
	 */
	private function builder( $prompt, array $files = array(), $provider_slug = null, array $capabilities = array() ) {
		$builder = wp_ai_client_prompt( $prompt );
		foreach ( $files as $file ) {
			$data    = 0 === strpos( $file['data'], 'data:' )
				? $file['data']
				: 'data:' . $file['mime_type'] . ';base64,' . $file['data'];
			$builder = $builder->with_file( $data );
		}
		$model = $this->preferred_model( $provider_slug, $capabilities );
		if ( $model ) {
			$builder = $builder->using_model_preference( $model );
		}
		return $builder;
	}

	/**
	 * Resolve a model id for the chosen provider, or null for automatic selection.
	 *
	 * Uses WordPress\AiClient\Providers\ProviderRegistry::findProviderModelsMetadataForSupport()
	 * which requires a ModelRequirements DTO (confirmed via reflection on the live install).
	 * Capabilities are passed as CapabilityEnum instances built from the string slugs.
	 * Any failure (missing class, unconfigured provider, bad capability slug, etc.) returns
	 * null so the caller falls back to automatic model selection — never fatal.
	 *
	 * @param string|null $provider_slug Stored per-feature provider slug.
	 * @param string[]    $capabilities  Required capabilities (e.g. ['text_generation']).
	 * @return string|null Model ID to prefer, or null for automatic selection.
	 */
	private function preferred_model( $provider_slug, array $capabilities ) {
		if ( empty( $provider_slug ) || ! class_exists( 'WordPress\\AiClient\\AiClient' ) ) {
			return null;
		}
		try {
			$available = array_keys( $this->list_providers() );
			require_once __DIR__ . '/slug-map.php';
			$slug = filter_ai_map_service_slug( $provider_slug, $available );
			if ( null === $slug ) {
				return null;
			}
			$registry = WordPress\AiClient\AiClient::defaultRegistry();
			if ( ! $registry->isProviderConfigured( $slug ) ) {
				return null;
			}

			// Build capability enum instances from string slugs.
			$capability_class   = 'WordPress\\AiClient\\Providers\\Models\\Enums\\CapabilityEnum';
			$requirements_class = 'WordPress\\AiClient\\Providers\\Models\\DTO\\ModelRequirements';
			if ( ! class_exists( $capability_class ) || ! class_exists( $requirements_class ) ) {
				return null;
			}
			$capability_enums = array();
			foreach ( $capabilities as $cap ) {
				$enum = $capability_class::tryFrom( (string) $cap );
				if ( null !== $enum ) {
					$capability_enums[] = $enum;
				}
			}
			// Use an empty requirements object if no valid capabilities were supplied —
			// the registry will return all models for the provider.
			$requirements = new $requirements_class( $capability_enums, array() );
			$models       = $registry->findProviderModelsMetadataForSupport( $slug, $requirements );
			$first        = is_array( $models ) ? reset( $models ) : $models;
			return ( is_object( $first ) && method_exists( $first, 'getId' ) ) ? $first->getId() : null;
		} catch ( \Throwable $e ) {
			return null; // any failure → automatic selection
		}
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

			$builder = $this->builder( $prompt, $files, $provider_slug, $capabilities );
			if ( ! $builder->is_supported_for_text_generation() ) {
				return new WP_Error( 'filter_ai_unavailable', __( 'No AI provider is configured for text generation.', 'filter-ai' ) );
			}
			return $builder->generate_text();
		} catch ( \Throwable $e ) {
			return new WP_Error( 'filter_ai_generation_failed', $e->getMessage() );
		}
	}

	/**
	 * Stream text generation. WordPress 7.0's WP_AI_Client_Prompt_Builder ships
	 * no streaming method today — the underlying PHP AI Client SDK exposes only
	 * synchronous generateText(). Return WP_Error so the REST layer falls back
	 * to one-shot generate_text() and emits a single SSE frame. When core adds
	 * streaming (likely a 7.x point release), replace this stub with a
	 * $builder->stream_generate_text() call via the existing __call proxy —
	 * zero JS changes required.
	 *
	 * @param string      $prompt        Prompt text.
	 * @param array       $files         Multimodal input files.
	 * @param string      $feature       Filter AI feature id.
	 * @param string[]    $capabilities  Required capabilities.
	 * @param string|null $provider_slug Optional provider slug.
	 * @return Generator|WP_Error
	 */
	public function stream_generate_text( $prompt, array $files, $feature, array $capabilities, $provider_slug = null ) {
		return new WP_Error(
			'filter_ai_streaming_unsupported',
			__( 'Streaming text is not yet supported by the WordPress 7.0 native AI Client.', 'filter-ai' )
		);
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
			$builder = $this->builder( $prompt, array(), $provider_slug, array() );

			// Image generation routinely takes longer than the AI Client's 30s default
			// HTTP timeout, so raise the ceiling for this request (the default is set in
			// WP_AI_Client_Prompt_Builder's constructor; using_request_options() overrides
			// it). Also force inline (base64) output so getDataUri() always has data to
			// return — some providers otherwise hand back a remote URL, for which
			// getDataUri() yields null. Mirrors the core "ai" plugin's image path.
			$request_options = new WordPress\AiClient\Providers\Http\DTO\RequestOptions();
			$request_options->setTimeout( 120 );
			$builder = $builder
				->using_request_options( $request_options )
				->as_output_file_type( WordPress\AiClient\Files\Enums\FileTypeEnum::inline() );

			if ( ! $builder->is_supported_for_image_generation() ) {
				return new WP_Error( 'filter_ai_unavailable', __( 'No AI provider is configured for image generation.', 'filter-ai' ) );
			}

			// Honour the request's generation config (candidate count + aspect ratio)
			// so native (WP 7.0+) behaves like the legacy ai-services path; both are
			// driven by the same request from src/utils/ai/getGeneratedImages.ts.
			// These are image-specific, so they are applied here rather than in
			// builder(). Aspect ratio is set after the support check to keep that
			// check's model-matching behaviour identical to before.
			$aspect_ratio = isset( $config['aspect_ratio'] ) ? $config['aspect_ratio'] : null;
			if ( ! empty( $aspect_ratio ) ) {
				$builder = $builder->as_output_media_aspect_ratio( (string) $aspect_ratio );
			}

			$candidate_count = isset( $config['candidate_count'] ) ? (int) $config['candidate_count'] : 1;
			if ( $candidate_count < 1 ) {
				$candidate_count = 1;
			}

			$files = $builder->generate_images( $candidate_count );
			if ( is_wp_error( $files ) ) {
				return $files;
			}

			$images = array();
			foreach ( (array) $files as $file ) {
				if ( is_object( $file ) && method_exists( $file, 'getDataUri' ) ) {
					$data_uri = $file->getDataUri();
					if ( ! empty( $data_uri ) ) {
						$images[] = $data_uri;
					}
				}
			}
			return $images;
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
