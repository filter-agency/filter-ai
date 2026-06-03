<?php
/**
 * First-party REST layer for the block-editor JS on WP 7.0+ (`filter-ai/v1`).
 * Each route delegates to the active Filter_AI_Provider.
 *
 * @package Filter_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/../providers/detection.php';

/**
 * Registers and handles the filter-ai/v1 REST routes.
 */
class Filter_AI_REST_Controller {

	const REST_NAMESPACE = 'filter-ai/v1';

	/**
	 * Wire the register_routes callback into rest_api_init.
	 *
	 * @return void
	 */
	public static function register() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/**
	 * Permission callback — requires manage_options capability.
	 *
	 * @return bool True when the current user can manage options.
	 */
	public static function permission() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Register all filter-ai/v1 routes with the REST server.
	 *
	 * @return void
	 */
	public static function register_routes() {
		register_rest_route(
			self::REST_NAMESPACE,
			'/providers',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => array( __CLASS__, 'permission' ),
				'callback'            => array( __CLASS__, 'providers' ),
			)
		);
		register_rest_route(
			self::REST_NAMESPACE,
			'/is-supported',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => array( __CLASS__, 'permission' ),
				'callback'            => array( __CLASS__, 'is_supported' ),
				'args'                => array(
					'capability' => array(
						'type'    => 'string',
						'default' => 'text',
					),
				),
			)
		);
		register_rest_route(
			self::REST_NAMESPACE,
			'/generate-text',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'permission_callback' => array( __CLASS__, 'permission' ),
				'callback'            => array( __CLASS__, 'generate_text' ),
			)
		);
		register_rest_route(
			self::REST_NAMESPACE,
			'/generate-image',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'permission_callback' => array( __CLASS__, 'permission' ),
				'callback'            => array( __CLASS__, 'generate_image' ),
			)
		);
	}

	/**
	 * Handle GET /providers — list configured AI providers from the active backend.
	 *
	 * @param WP_REST_Request $request The REST request object.
	 * @return WP_REST_Response
	 */
	public static function providers( WP_REST_Request $request ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found -- Reason: required by REST callback contract.
		$provider = filter_ai_provider();
		return rest_ensure_response( $provider ? $provider->list_providers() : array() );
	}

	/**
	 * Handle GET /is-supported — return whether text or image generation is available.
	 *
	 * @param WP_REST_Request $request The REST request object; supports `capability` param ('text'|'image').
	 * @return WP_REST_Response
	 */
	public static function is_supported( WP_REST_Request $request ) {
		$provider = filter_ai_provider();
		if ( ! $provider ) {
			return rest_ensure_response( array( 'supported' => false ) );
		}
		$supported = 'image' === $request['capability']
			? $provider->is_image_supported()
			: $provider->is_text_supported( array( 'text_generation' ) );
		return rest_ensure_response( array( 'supported' => (bool) $supported ) );
	}

	/**
	 * Handle POST /generate-text — generate text via the active backend.
	 *
	 * @param WP_REST_Request $request Body params: prompt, parts, feature, capabilities, provider.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function generate_text( WP_REST_Request $request ) {
		$provider = filter_ai_provider();
		if ( ! $provider ) {
			return new WP_Error( 'filter_ai_unavailable', __( 'No AI backend available.', 'filter-ai' ), array( 'status' => 503 ) );
		}
		$result = $provider->generate_text(
			(string) $request['prompt'],
			self::normalise_files( $request['parts'] ),
			(string) $request['feature'],
			is_array( $request['capabilities'] ) ? $request['capabilities'] : array( 'text_generation' ),
			$request['provider'] ? (string) $request['provider'] : null
		);
		if ( is_wp_error( $result ) ) {
			$result->add_data( array( 'status' => 502 ) );
			return $result;
		}
		return rest_ensure_response( array( 'text' => $result ) );
	}

	/**
	 * Handle POST /generate-image — generate one or more images via the active backend.
	 *
	 * @param WP_REST_Request $request Body params: prompt, candidateCount, aspectRatio, feature, provider.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function generate_image( WP_REST_Request $request ) {
		$provider = filter_ai_provider();
		if ( ! $provider ) {
			return new WP_Error( 'filter_ai_unavailable', __( 'No AI backend available.', 'filter-ai' ), array( 'status' => 503 ) );
		}
		$result = $provider->generate_image(
			(string) $request['prompt'],
			array(
				'candidate_count' => (int) ( isset( $request['candidateCount'] ) ? $request['candidateCount'] : 1 ),
				'aspect_ratio'    => $request['aspectRatio'] ? (string) $request['aspectRatio'] : null,
			),
			(string) $request['feature'],
			$request['provider'] ? (string) $request['provider'] : null
		);
		if ( is_wp_error( $result ) ) {
			$result->add_data( array( 'status' => 502 ) );
			return $result;
		}
		return rest_ensure_response( array( 'images' => $result ) );
	}

	/**
	 * Convert the editor's `parts` shape into the provider's `files` shape.
	 *
	 * @param mixed $parts Array of part objects, each optionally containing inlineData.
	 * @return array Array of [ 'mime_type' => string, 'data' => string ] entries.
	 */
	private static function normalise_files( $parts ) {
		$files = array();
		foreach ( (array) $parts as $part ) {
			if ( isset( $part['inlineData']['data'] ) ) {
				$files[] = array(
					'mime_type' => isset( $part['inlineData']['mimeType'] ) ? $part['inlineData']['mimeType'] : '',
					'data'      => $part['inlineData']['data'],
				);
			}
		}
		return $files;
	}
}
