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
