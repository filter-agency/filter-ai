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
require_once __DIR__ . '/../providers/model-catalog.php';
require_once __DIR__ . '/../error-log.php';

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
	 * Permission callback for editor workflows.
	 *
	 * Allows users who can edit posts to use block-editor/media AI features.
	 *
	 * @return bool True when the current user can edit posts.
	 */
	public static function permission_editor() {
		return current_user_can( 'edit_posts' );
	}

	/**
	 * Permission callback for admin-only settings/status routes.
	 *
	 * @return bool True when the current user can manage options.
	 */
	public static function permission_admin() {
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
				'permission_callback' => array( __CLASS__, 'permission_editor' ),
				'callback'            => array( __CLASS__, 'providers' ),
			)
		);
		register_rest_route(
			self::REST_NAMESPACE,
			'/provider-models',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => array( __CLASS__, 'permission_editor' ),
				'callback'            => array( __CLASS__, 'provider_models' ),
				'args'                => array(
					'capabilities' => array(
						'type'    => 'array',
						'default' => array(),
					),
				),
			)
		);
		register_rest_route(
			self::REST_NAMESPACE,
			'/is-supported',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => array( __CLASS__, 'permission_editor' ),
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
				'permission_callback' => array( __CLASS__, 'permission_editor' ),
				'callback'            => array( __CLASS__, 'generate_text' ),
			)
		);
		register_rest_route(
			self::REST_NAMESPACE,
			'/stream-generate-text',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'permission_callback' => array( __CLASS__, 'permission_editor' ),
				'callback'            => array( __CLASS__, 'stream_generate_text' ),
			)
		);
		register_rest_route(
			self::REST_NAMESPACE,
			'/generate-image',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'permission_callback' => array( __CLASS__, 'permission_editor' ),
				'callback'            => array( __CLASS__, 'generate_image' ),
			)
		);
		register_rest_route(
			self::REST_NAMESPACE,
			'/brand-voice/status',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => array( __CLASS__, 'permission_admin' ),
				'callback'            => array( __CLASS__, 'brand_voice_status' ),
			)
		);
		register_rest_route(
			self::REST_NAMESPACE,
			'/error-logs',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => array( __CLASS__, 'permission_admin' ),
				'callback'            => array( __CLASS__, 'error_logs' ),
			)
		);
		register_rest_route(
			self::REST_NAMESPACE,
			'/error-logs/(?P<id>[\d]+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => array( __CLASS__, 'permission_admin' ),
				'callback'            => array( __CLASS__, 'error_log' ),
				'args'                => array(
					'id' => array(
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
					),
				),
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
	 * Handle GET /provider-models — list selectable provider/model options.
	 *
	 * @param WP_REST_Request $request The REST request object.
	 * @return WP_REST_Response
	 */
	public static function provider_models( WP_REST_Request $request ) {
		$capabilities = is_array( $request['capabilities'] ) ? array_map( 'sanitize_text_field', $request['capabilities'] ) : array();
		$options      = filter_ai_get_provider_model_options( $capabilities );
		$out          = array();
		foreach ( $options as $option ) {
			if ( ! isset( $option['slug'] ) ) {
				continue;
			}
			$out[ $option['slug'] ] = $option;
		}
		return rest_ensure_response( $out );
	}

	/**
	 * Handle GET /error-logs — list recent error logs for the Settings tab.
	 *
	 * @param WP_REST_Request $request The REST request object.
	 * @return WP_REST_Response
	 */
	public static function error_logs( WP_REST_Request $request ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found -- Reason: required by REST callback contract.
		return rest_ensure_response( filter_ai_get_error_log_summaries() );
	}

	/**
	 * Handle GET /error-logs/:id — return a single error log for the Settings tab.
	 *
	 * @param WP_REST_Request $request The REST request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function error_log( WP_REST_Request $request ) {
		$log = filter_ai_get_error_log_detail( (int) $request['id'] );
		if ( ! $log ) {
			return new WP_Error( 'filter_ai_error_log_not_found', __( 'Error log not found.', 'filter-ai' ), array( 'status' => 404 ) );
		}

		return rest_ensure_response( $log );
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
		$files  = self::normalise_files( $request['parts'] );
		$result = $provider->generate_text(
			(string) $request['prompt'],
			$files,
			(string) $request['feature'],
			is_array( $request['capabilities'] ) ? $request['capabilities'] : array( 'text_generation' ),
			$request['provider'] ? (string) $request['provider'] : null
		);
		if ( is_wp_error( $result ) ) {
			return self::log_rest_error(
				'rest_generate_text',
				$result,
				self::generation_context(
					(string) $request['feature'],
					is_array( $request['capabilities'] ) ? $request['capabilities'] : array( 'text_generation' ),
					$request['provider'] ? (string) $request['provider'] : null,
					$files,
					array(
						'route'         => '/generate-text',
						'prompt_length' => strlen( (string) $request['prompt'] ),
					)
				)
			);
		}
		return rest_ensure_response( array( 'text' => $result ) );
	}

	/**
	 * Handle POST /stream-generate-text — emit AI-generated text as Server-Sent
	 * Events so the editor can render the response chunk-by-chunk into a block.
	 *
	 * Bypasses rest_ensure_response() entirely (which would JSON-encode and
	 * buffer a single response) and ends with exit() so the REST framework does
	 * not send a second response. On backends without streaming support
	 * (currently WP 7.0's native AI Client), falls back to one-shot
	 * generate_text() and emits a single SSE frame containing the full text —
	 * the JS consumer treats this identically to a single chunk.
	 *
	 * @param WP_REST_Request $request Body params: prompt, keywords, length, parts, feature, capabilities, provider.
	 * @return void Never returns — calls exit().
	 */
	public static function stream_generate_text( WP_REST_Request $request ) {
		$provider = filter_ai_provider();
		if ( ! $provider ) {
			self::sse_send_error( __( 'No AI backend available.', 'filter-ai' ) );
			exit;
		}

		$user_prompt = (string) $request['prompt'];
		$keywords    = is_array( $request['keywords'] ) ? array_filter( array_map( 'sanitize_text_field', $request['keywords'] ) ) : array();
		$length      = isset( $request['length'] ) ? sanitize_text_field( (string) $request['length'] ) : '';
		$feature     = (string) $request['feature'];
		if ( '' === $feature ) {
			$feature = 'filter-ai-generate-content';
		}

		try {
			$base_prompt = filter_ai_get_prompt( 'generate_content_prompt' );
		} catch ( \Throwable $e ) {
			$error = filter_ai_log_wp_error(
				'rest_stream_generate_text_prompt',
				filter_ai_wp_error_from_throwable(
					'filter_ai_prompt_failed',
					$e,
					array( 'route' => '/stream-generate-text' )
				),
				array( 'route' => '/stream-generate-text' )
			);
			self::sse_send_error( $error->get_error_message() );
			exit;
		}

		$pieces = array( $base_prompt, "\n\nUser prompt: " . $user_prompt );
		if ( ! empty( $keywords ) ) {
			$pieces[] = "\nKeywords to incorporate naturally: " . implode( ', ', $keywords );
		}
		if ( '' !== $length ) {
			$pieces[] = "\nTarget length: " . $length . '.';
		}
		$final_prompt = implode( ' ', $pieces );

		$capabilities  = is_array( $request['capabilities'] ) ? $request['capabilities'] : array( 'text_generation' );
		$provider_slug = $request['provider'] ? (string) $request['provider'] : null;
		$files         = self::normalise_files( $request['parts'] );

		$stream = $provider->stream_generate_text( $final_prompt, $files, $feature, $capabilities, $provider_slug );

		self::sse_open_stream();

		if ( is_wp_error( $stream ) ) {
			// Backend doesn't support streaming (currently WP 7.0 native) — fall back
			// to one-shot and emit as a single frame so the JS consumer is uniform.
			if ( 'filter_ai_streaming_unsupported' === $stream->get_error_code() ) {
				$one_shot = $provider->generate_text( $final_prompt, $files, $feature, $capabilities, $provider_slug );
				if ( is_wp_error( $one_shot ) ) {
					$error = self::log_rest_error(
						'rest_stream_generate_text_fallback',
						$one_shot,
						self::generation_context(
							$feature,
							$capabilities,
							$provider_slug,
							$files,
							array(
								'route'              => '/stream-generate-text',
								'prompt_length'      => strlen( $final_prompt ),
								'user_prompt_length' => strlen( $user_prompt ),
								'keywords_count'     => count( $keywords ),
								'target_length'      => $length,
							)
						)
					);
					self::sse_send_error( $error->get_error_message() );
					exit;
				}
				self::sse_send_delta( (string) $one_shot );
				self::sse_send_done();
				exit;
			}
			$error = self::log_rest_error(
				'rest_stream_generate_text',
				$stream,
				self::generation_context(
					$feature,
					$capabilities,
					$provider_slug,
					$files,
					array(
						'route'         => '/stream-generate-text',
						'prompt_length' => strlen( $final_prompt ),
					)
				)
			);
			self::sse_send_error( $error->get_error_message() );
			exit;
		}

		try {
			foreach ( $stream as $delta ) {
				if ( '' === $delta || null === $delta ) {
					continue;
				}
				self::sse_send_delta( (string) $delta );
			}
		} catch ( \Throwable $e ) {
			$error = filter_ai_log_wp_error(
				'rest_stream_generate_text_iteration',
				filter_ai_wp_error_from_throwable(
					'filter_ai_generation_failed',
					$e,
					self::generation_context(
						$feature,
						$capabilities,
						$provider_slug,
						$files,
						array(
							'route'         => '/stream-generate-text',
							'prompt_length' => strlen( $final_prompt ),
						)
					)
				),
				array( 'route' => '/stream-generate-text' )
			);
			self::sse_send_error( $error->get_error_message() );
			exit;
		}

		self::sse_send_done();
		exit;
	}

	/**
	 * Disable output buffering, send SSE headers. Mirrors the recipe used by
	 * ai-services' Service_Stream_Generate_Text_REST_Route.
	 *
	 * @return void
	 */
	private static function sse_open_stream() {
		// Disable PHP-level compression and close any output buffers WordPress
		// (and its plugins) opened — otherwise the client buffers up the whole
		// response and the user sees no progressive output. Errors silenced
		// because ini_set may be locked or zlib may be absent.
		// phpcs:disable WordPress.PHP.NoSilencedErrors.Discouraged, WordPress.PHP.IniSet.Risky -- Streaming requires that we unconditionally drop buffering; @-silencing is intentional for hosts where ini_set or ob_* are restricted.
		if ( function_exists( 'ini_set' ) ) {
			@ini_set( 'zlib.output_compression', '0' );
			@ini_set( 'output_buffering', '0' );
			@ini_set( 'implicit_flush', '1' );
		}
		while ( ob_get_level() > 0 ) {
			@ob_end_flush();
		}
		@ob_implicit_flush( true );
		// phpcs:enable WordPress.PHP.NoSilencedErrors.Discouraged, WordPress.PHP.IniSet.Risky

		header( 'Content-Type: text/event-stream; charset=UTF-8' );
		header( 'Cache-Control: no-cache, no-store, must-revalidate' );
		header( 'Pragma: no-cache' );
		header( 'Connection: keep-alive' );
		// Disables FastCGI buffering on Nginx — required for progressive output.
		header( 'X-Accel-Buffering: no' );
	}

	/**
	 * Emit a single `data: {…}` SSE frame and flush. Used by the streaming route.
	 *
	 * @param array $payload Payload to JSON-encode.
	 * @return void
	 */
	public static function sse_send_frame( array $payload ) {
		echo 'data: ' . wp_json_encode( $payload ) . "\n\n";
		if ( function_exists( 'flush' ) ) {
			@flush(); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- flush() can emit a notice when output is restricted; the stream survives either way.
		}
	}

	/**
	 * Convenience wrapper: emit a text delta.
	 *
	 * @param string $delta Text fragment.
	 * @return void
	 */
	public static function sse_send_delta( $delta ) {
		self::sse_send_frame( array( 'delta' => (string) $delta ) );
	}

	/**
	 * Convenience wrapper: emit the completion sentinel.
	 *
	 * @return void
	 */
	public static function sse_send_done() {
		self::sse_send_frame( array( 'done' => true ) );
	}

	/**
	 * Convenience wrapper: emit an error frame. Opens the SSE stream if it
	 * hasn't been opened yet so the client still receives a parseable frame
	 * instead of HTML from a WP error page.
	 *
	 * @param string $message Human-readable error.
	 * @return void
	 */
	public static function sse_send_error( $message ) {
		if ( ! headers_sent() ) {
			self::sse_open_stream();
		}
		self::sse_send_frame( array( 'error' => (string) $message ) );
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
			return self::log_rest_error(
				'rest_generate_image',
				$result,
				self::generation_context(
					(string) $request['feature'],
					array( 'image_generation' ),
					$request['provider'] ? (string) $request['provider'] : null,
					array(),
					array(
						'route'           => '/generate-image',
						'prompt_length'   => strlen( (string) $request['prompt'] ),
						'candidate_count' => (int) ( isset( $request['candidateCount'] ) ? $request['candidateCount'] : 1 ),
						'aspect_ratio'    => $request['aspectRatio'] ? (string) $request['aspectRatio'] : null,
					)
				)
			);
		}
		return rest_ensure_response( array( 'images' => $result ) );
	}

	/**
	 * Handle GET /brand-voice/status — return the current brand voice scan state
	 * so the React notice can poll for live updates instead of requiring a reload.
	 *
	 * @param WP_REST_Request $request The REST request object.
	 * @return WP_REST_Response
	 */
	public static function brand_voice_status( WP_REST_Request $request ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found -- Reason: required by REST callback contract.
		if ( ! function_exists( 'filter_ai_brand_voice_get_state' ) ) {
			return rest_ensure_response( array() );
		}
		return rest_ensure_response( filter_ai_brand_voice_get_state() );
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

	/**
	 * Build shared context for logged generation errors.
	 *
	 * @param string      $feature       Filter AI feature id.
	 * @param string[]    $capabilities  Required capabilities.
	 * @param string|null $provider_slug Requested provider slug.
	 * @param array       $files         Multimodal files.
	 * @param array       $extra         Additional route context.
	 * @return array
	 */
	private static function generation_context( $feature, array $capabilities, $provider_slug, array $files, array $extra = array() ) {
		return filter_ai_error_generation_context( $feature, $capabilities, $provider_slug, $files, $extra );
	}

	/**
	 * Persist a REST generation error and return the linked WP_Error.
	 *
	 * @param string   $source  Source label.
	 * @param WP_Error $error   Error to log.
	 * @param array    $context Diagnostic context.
	 * @param int      $status  HTTP status.
	 * @return WP_Error
	 */
	private static function log_rest_error( $source, WP_Error $error, array $context, $status = 502 ) {
		return filter_ai_log_wp_error( $source, filter_ai_error_with_status( $error, $status ), $context );
	}
}
