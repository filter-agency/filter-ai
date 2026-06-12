<?php
/**
 * PHPUnit bootstrap file for pure-logic unit tests.
 *
 * Defines ABSPATH so that includes/*.php guards
 * (`if ( ! defined( 'ABSPATH' ) ) exit;`) pass when
 * testing outside WordPress.
 *
 * @package Filter_AI
 */

// Allow includes/*.php guards (`if ( ! defined( 'ABSPATH' ) ) exit;`) to pass
// when unit-testing pure-logic files outside WordPress.
define( 'ABSPATH', __DIR__ . '/' );

require_once __DIR__ . '/../../vendor/autoload.php';

if ( ! function_exists( '__' ) ) {
	/**
	 * Minimal translation shim for pure-logic tests outside WordPress.
	 *
	 * @param string $text Text to translate.
	 * @return string
	 */
	function __( $text ) {
		return $text;
	}
}

if ( ! defined( 'WEEK_IN_SECONDS' ) ) {
	define( 'WEEK_IN_SECONDS', 604800 );
}

if ( ! function_exists( 'admin_url' ) ) {
	/**
	 * Minimal admin URL shim for pure-logic tests outside WordPress.
	 *
	 * @param string $path Admin path.
	 * @return string
	 */
	function admin_url( $path = '' ) {
		return 'https://example.test/wp-admin/' . ltrim( (string) $path, '/' );
	}
}

if ( ! function_exists( 'add_action' ) ) {
	/**
	 * Minimal add_action shim for loading hook-registering files outside WordPress.
	 *
	 * @return bool
	 */
	function add_action() {
		return true;
	}
}

require_once __DIR__ . '/wp-error-shim.php';

if ( ! function_exists( 'is_wp_error' ) ) {
	/**
	 * Minimal is_wp_error shim for pure-logic tests outside WordPress.
	 *
	 * @param mixed $thing Value to test.
	 * @return bool
	 */
	function is_wp_error( $thing ) {
		return $thing instanceof WP_Error;
	}
}
