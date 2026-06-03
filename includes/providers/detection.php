<?php
/**
 * Backend detection + provider factory.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Decide which AI backend to use. Pure function — unit-testable.
 *
 * @param bool $has_native Whether the WP 7.0 native client is present.
 * @param bool $has_legacy Whether the ai-services plugin is present.
 * @return string 'native' | 'legacy' | 'none'.
 */
function filter_ai_detect_backend( $has_native, $has_legacy ) {
	if ( $has_native ) {
		return 'native';
	}
	if ( $has_legacy ) {
		return 'legacy';
	}
	return 'none';
}

/**
 * Resolve the active AI backend (cached for the request).
 *
 * @return Filter_AI_Provider|null Null when no backend is available.
 */
function filter_ai_provider() {
	static $instance = null;
	static $resolved = false;

	if ( $resolved ) {
		return $instance;
	}
	$resolved = true;

	$backend = filter_ai_detect_backend(
		function_exists( 'wp_ai_client_prompt' ),
		function_exists( 'ai_services' )
	);

	if ( 'native' === $backend ) {
		require_once __DIR__ . '/interface-provider.php';
		require_once __DIR__ . '/slug-map.php';
		require_once __DIR__ . '/class-provider-native.php';
		$instance = new Filter_AI_Provider_Native();
	} elseif ( 'legacy' === $backend ) {
		require_once __DIR__ . '/interface-provider.php';
		require_once __DIR__ . '/class-provider-aiservices.php';
		$instance = new Filter_AI_Provider_AiServices();
	}

	return $instance;
}
