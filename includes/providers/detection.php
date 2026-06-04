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
 * Precedence rules (in order):
 *
 *  1. **Native with configured providers** — best path: WP 7.0+ AI Client is
 *     present AND has at least one configured connector. Use the modern API.
 *  2. **Legacy** — falls back to the ai-services plugin when native is either
 *     absent or present-but-unconfigured. This is the migration grace period:
 *     users who upgrade to WP 7.0 while still relying on ai-services keys keep
 *     working until they migrate their keys to Connectors.
 *  3. **Native (unconfigured)** — last resort: WP 7.0+ is present but nothing
 *     is configured anywhere. Still return 'native' so the UI surfaces the
 *     correct (modern) "no provider configured" guidance.
 *  4. **None** — nothing available at all.
 *
 * @param bool $has_native            Whether the WP 7.0 native client is present.
 * @param bool $has_legacy            Whether the ai-services plugin is present.
 * @param bool $native_has_providers  Whether the native client has any configured
 *                                    provider connectors (only meaningful when
 *                                    $has_native is true).
 * @return string 'native' | 'legacy' | 'none'.
 */
function filter_ai_detect_backend( $has_native, $has_legacy, $native_has_providers = false ) {
	if ( $has_native && $native_has_providers ) {
		return 'native';
	}
	if ( $has_legacy ) {
		return 'legacy';
	}
	if ( $has_native ) {
		return 'native';
	}
	return 'none';
}

/**
 * Whether the WP 7.0+ native AI Client has at least one configured provider.
 *
 * Live check — iterates wp_get_connectors() and asks the AiClient registry
 * whether each `ai_provider` connector is configured. Guarded against missing
 * functions/classes so it is safe to call before knowing the WP version.
 * Returns false (rather than throwing) on any reflection / registry error so a
 * misbehaving connector doesn't break backend detection.
 *
 * @return bool
 */
function filter_ai_native_has_configured_providers() {
	if ( ! function_exists( 'wp_get_connectors' ) || ! class_exists( 'WordPress\\AiClient\\AiClient' ) ) {
		return false;
	}
	try {
		$registry = WordPress\AiClient\AiClient::defaultRegistry();
		foreach ( (array) wp_get_connectors() as $slug => $connector ) {
			if ( ! is_string( $slug ) || ! is_array( $connector ) ) {
				continue;
			}
			$type = isset( $connector['type'] ) ? $connector['type'] : '';
			if ( 'ai_provider' !== $type ) {
				continue;
			}
			if ( $registry->isProviderConfigured( $slug ) ) {
				return true;
			}
		}
	} catch ( \Throwable $e ) {
		return false;
	}
	return false;
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

	$has_native = function_exists( 'wp_ai_client_prompt' );
	$backend    = filter_ai_detect_backend(
		$has_native,
		function_exists( 'ai_services' ),
		$has_native && filter_ai_native_has_configured_providers()
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
