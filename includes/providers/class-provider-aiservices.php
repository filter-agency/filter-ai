<?php
/**
 * Legacy backend — delegates to the ai-services plugin (WP < 7.0).
 *
 * Text generation is handled by generate_text(). stream_generate_text()
 * intentionally reports unsupported so the REST layer uses its one-shot SSE
 * fallback; the legacy ai-services streaming parser can reject provider-specific
 * response parts. On legacy WP, image generation and provider listing remain in
 * the editor JS via window.aiServices, so generate_image() and list_providers()
 * are interface-satisfying guards here.
 *
 * @package Filter_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/../error-log.php';
require_once __DIR__ . '/model-selection.php';

use Felix_Arntz\AI_Services\Services\API\Enums\Content_Role;
use Felix_Arntz\AI_Services\Services\API\Types\Content;
use Felix_Arntz\AI_Services\Services\API\Types\Parts;
use Felix_Arntz\AI_Services\Services\API\Helpers;

/**
 * ai-services-backed provider.
 */
class Filter_AI_Provider_AiServices implements Filter_AI_Provider {

	/**
	 * Slug of the provider resolved in the most recent generate_text() call.
	 *
	 * @var string
	 */
	private $last_provider_slug = '';

	/**
	 * Most recent HTTP response captured around a generation call.
	 *
	 * @var array|null
	 */
	private $last_http_response = null;

	/**
	 * Build the ai-services service filter.
	 *
	 * @param string[]    $capabilities  Capability slugs.
	 * @param string|null $provider_slug Optional provider/model selection.
	 * @return array
	 */
	private function filter( array $capabilities, $provider_slug ) {
		$selection     = filter_ai_parse_provider_model_selection( $provider_slug );
		$provider_slug = $selection['provider_slug'];
		$filter        = array( 'capabilities' => $capabilities );
		if ( ! empty( $provider_slug ) ) {
			$filter['slugs'] = array( $provider_slug );
		}
		return $filter;
	}

	/**
	 * Whether text generation is available for the given capabilities and provider.
	 *
	 * @param string[]    $capabilities  Capability slugs.
	 * @param string|null $provider_slug Optional provider slug.
	 * @return bool
	 */
	public function is_text_supported( array $capabilities, $provider_slug = null ) {
		return ai_services()->has_available_services( $this->filter( $capabilities, $provider_slug ) );
	}

	/**
	 * Whether image generation is available for the given provider.
	 *
	 * @param string|null $provider_slug Optional provider slug.
	 * @return bool
	 */
	public function is_image_supported( $provider_slug = null ) {
		return ai_services()->has_available_services( $this->filter( array( 'image_generation' ), $provider_slug ) );
	}

	/**
	 * Generate text (optionally multimodal) via ai-services.
	 *
	 * @param string      $prompt        Prompt text.
	 * @param array       $files         Each: [ 'mime_type' => string, 'data' => base64-or-data-uri ].
	 * @param string      $feature       Filter AI feature id.
	 * @param string[]    $capabilities  Required capabilities.
	 * @param string|null $provider_slug Optional provider slug.
	 * @return string|WP_Error
	 */
	public function generate_text( $prompt, array $files, $feature, array $capabilities, $provider_slug = null ) {
		if ( ! $this->is_text_supported( $capabilities, $provider_slug ) ) {
			return new WP_Error( 'filter_ai_unavailable', __( 'AI service not available', 'filter-ai' ) );
		}

		$selection                = filter_ai_parse_provider_model_selection( $provider_slug );
		$resolved_provider_slug   = $selection['provider_slug'];
		$model_slug               = $selection['model_slug'];
		$this->last_http_response = null;
		$http_capture             = null;
		if ( function_exists( 'add_action' ) ) {
			$http_capture = function ( $response, $context, $request_class, $args, $url ) {
				if ( 'response' !== $context || false === strpos( (string) $url, 'api.anthropic.com' ) ) {
					return;
				}
				$this->last_http_response = filter_ai_describe_http_response( $response, is_array( $args ) ? $args : array(), $url );
			};
			add_action( 'http_api_debug', $http_capture, 10, 5 );
		}

		try {
			$service = empty( $resolved_provider_slug )
				? ai_services()->get_available_service( $this->filter( $capabilities, null ) )
				: ai_services()->get_available_service( $resolved_provider_slug );

			$this->last_provider_slug = method_exists( $service, 'get_service_slug' ) ? $service->get_service_slug() : '';

			$parts = new Parts();
			$parts->add_text_part( $prompt );
			foreach ( $files as $file ) {
				$data = 0 === strpos( $file['data'], 'data:' )
					? $file['data']
					: 'data:' . $file['mime_type'] . ';base64,' . $file['data'];
				$parts->add_file_data_part( $file['mime_type'], $data );
			}

			$content      = new Content( Content_Role::USER, $parts );
			$model_params = array(
				'feature'      => $feature,
				'capabilities' => $capabilities,
			);
			if ( ! empty( $model_slug ) ) {
				$model_params['model'] = $model_slug;
			}
			$model      = $service->get_model( $model_params );
			$candidates = $model->generate_text( $content );

			return Helpers::get_text_from_contents( Helpers::get_candidate_contents( $candidates ) );
		} catch ( \Throwable $e ) {
			if ( false !== strpos( $e->getMessage(), 'unexpected content part' ) ) {
				$text = filter_ai_extract_anthropic_text_from_response( $this->last_http_response );
				if ( null !== $text ) {
					return $text;
				}
			}

			return filter_ai_wp_error_from_throwable(
				'filter_ai_generation_failed',
				$e,
				filter_ai_error_generation_context(
					$feature,
					$capabilities,
					$provider_slug,
					$files,
					array(
						'backend'           => 'ai-services',
						'resolved_provider' => $this->last_provider_slug,
						'prompt_length'     => strlen( (string) $prompt ),
						'http_response'     => $this->last_http_response,
					)
				)
			);
		} finally {
			if ( null !== $http_capture && function_exists( 'remove_action' ) ) {
				remove_action( 'http_api_debug', $http_capture, 10 );
			}
		}
	}

	/**
	 * Stream text generation via ai-services.
	 *
	 * The ai-services streaming API can surface provider-specific response parts
	 * that are not accepted by its legacy Parts parser, resulting in "Invalid
	 * part data." during iteration. Report streaming as unsupported so the REST
	 * layer uses the compatible one-shot generate_text() fallback and still emits
	 * a single SSE frame to the editor.
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
			__( 'Streaming text is not supported by the legacy AI Services backend.', 'filter-ai' )
		);
	}

	/**
	 * Not used on the legacy path (editor JS handles image generation).
	 *
	 * @param string      $prompt        Prompt text.
	 * @param array       $config        Generation config.
	 * @param string      $feature       Filter AI feature id.
	 * @param string|null $provider_slug Optional provider slug.
	 * @return array|WP_Error
	 */
	public function generate_image( $prompt, array $config, $feature, $provider_slug = null ) {
		return new WP_Error(
			'filter_ai_legacy_no_php_image',
			__( 'Image generation is handled in the editor on this WordPress version.', 'filter-ai' )
		);
	}

	/**
	 * Not used on the legacy path (editor reads providers from window.aiServices).
	 *
	 * @return array
	 */
	public function list_providers() {
		$out = array();
		if ( ! function_exists( 'ai_services' ) || ! method_exists( ai_services(), 'get_registered_service_slugs' ) ) {
			return $out;
		}

		foreach ( ai_services()->get_registered_service_slugs() as $slug ) {
			$metadata     = ai_services()->get_service_metadata( $slug );
			$out[ $slug ] = array(
				'label'        => $metadata && method_exists( $metadata, 'get_name' ) ? $metadata->get_name() : $slug,
				'capabilities' => $metadata && method_exists( $metadata, 'get_capabilities' ) ? $metadata->get_capabilities() : array(),
				'is_available' => ai_services()->is_service_available( $slug ),
			);
		}
		return $out;
	}

	/**
	 * List selectable provider/model options.
	 *
	 * @return array[]
	 */
	public function list_provider_models() {
		$options = array();
		foreach ( $this->list_providers() as $provider_slug => $provider ) {
			if ( empty( $provider['is_available'] ) ) {
				continue;
			}

			$provider_label        = isset( $provider['label'] ) ? $provider['label'] : $provider_slug;
			$provider_capabilities = isset( $provider['capabilities'] ) && is_array( $provider['capabilities'] ) ? $provider['capabilities'] : array();
			$options[]             = filter_ai_provider_model_option( $provider_slug, $provider_label, '', __( 'Auto', 'filter-ai' ), $provider_capabilities );

			try {
				$service = ai_services()->get_available_service( $provider_slug );
				if ( ! method_exists( $service, 'list_models' ) ) {
					continue;
				}
				foreach ( $service->list_models() as $model_slug => $model_metadata ) {
					$model_label        = is_object( $model_metadata ) && method_exists( $model_metadata, 'get_name' )
						? $model_metadata->get_name()
						: (string) $model_slug;
					$model_capabilities = is_object( $model_metadata ) && method_exists( $model_metadata, 'get_capabilities' )
						? $model_metadata->get_capabilities()
						: $provider_capabilities;
					$options[]          = filter_ai_provider_model_option( $provider_slug, $provider_label, (string) $model_slug, $model_label, $model_capabilities );
				}
			} catch ( \Throwable $e ) {
				continue;
			}
		}
		return $options;
	}

	/**
	 * Slug of the provider resolved in the most recent generate_text() call.
	 *
	 * @return string Provider slug, or '' if unknown / none used yet.
	 */
	public function last_provider_slug() {
		return $this->last_provider_slug;
	}
}
