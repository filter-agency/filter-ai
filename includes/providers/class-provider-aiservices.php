<?php
/**
 * Legacy backend — delegates to the ai-services plugin (WP < 7.0).
 *
 * Only is_text_supported() and generate_text() are exercised on the legacy
 * path (the three PHP batch jobs, including multimodal alt-text). On legacy WP,
 * image generation and provider listing remain in the editor JS via
 * window.aiServices, so generate_image() and list_providers() are
 * interface-satisfying guards here.
 *
 * @package Filter_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

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
	 * Build the ai-services service filter.
	 *
	 * @param string[]    $capabilities  Capability slugs.
	 * @param string|null $provider_slug Optional provider slug.
	 * @return array
	 */
	private function filter( array $capabilities, $provider_slug ) {
		$filter = array( 'capabilities' => $capabilities );
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

		try {
			$service = empty( $provider_slug )
				? ai_services()->get_available_service( $this->filter( $capabilities, null ) )
				: ai_services()->get_available_service( $provider_slug );

			$this->last_provider_slug = method_exists( $service, 'get_service_slug' ) ? $service->get_service_slug() : '';

			$parts = new Parts();
			$parts->add_text_part( $prompt );
			foreach ( $files as $file ) {
				$data = 0 === strpos( $file['data'], 'data:' )
					? $file['data']
					: 'data:' . $file['mime_type'] . ';base64,' . $file['data'];
				$parts->add_file_data_part( $file['mime_type'], $data );
			}

			$content    = new Content( Content_Role::USER, $parts );
			$model      = $service->get_model(
				array(
					'feature'      => $feature,
					'capabilities' => $capabilities,
				)
			);
			$candidates = $model->generate_text( $content );

			return Helpers::get_text_from_contents( Helpers::get_candidate_contents( $candidates ) );
		} catch ( \Throwable $e ) {
			return new WP_Error( 'filter_ai_generation_failed', $e->getMessage() );
		}
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
		return array();
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
