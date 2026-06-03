<?php
/**
 * Filter AI: decide whether to load admin assets on the current screen.
 *
 * Historically the plugin's JS/CSS loaded on every admin page, which meant
 * the React app's settings fetch (GET /wp/v2/settings) fired on screens
 * with no Filter AI UI — including the Updates screen, where in-flight
 * requests can return 503 from maintenance mode while plugins are being
 * updated. See Asana ticket 1212305396787864.
 *
 * @package Filter_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Whether Filter AI's admin assets should be enqueued on the current screen.
 *
 * Centralised so future per-screen logic can reuse the same rule. Pure: only
 * inspects the passed-in WP_Screen-like object and (if WordPress is loaded)
 * the maintenance-mode flag. Safe to unit-test outside WordPress.
 *
 * @param object|null $screen WP_Screen, or a stdClass with ->id and ->base. May be null
 *                            when called before get_current_screen() is available.
 * @return bool
 */
function filter_ai_should_enqueue_assets( $screen ) {
	if ( ! $screen ) {
		return false;
	}

	// Defensive: never enqueue during maintenance mode. The Updates screen is
	// also excluded by the allowlist below, but this catches the rarer case
	// where a user happens to be on a Filter AI screen while another admin
	// runs a plugin/theme update from elsewhere.
	if ( function_exists( 'wp_is_maintenance_mode' ) && wp_is_maintenance_mode() ) {
		return false;
	}

	$id   = isset( $screen->id ) ? (string) $screen->id : '';
	$base = isset( $screen->base ) ? (string) $screen->base : '';

	$allowed_ids = array(
		'toplevel_page_filter_ai',                       // Settings page.
		'filter-ai_page_filter_ai_submenu_page_batch',   // Batch Generation page.
		'upload',                                         // Media Library — Generate AI Image button.
	);
	if ( in_array( $id, $allowed_ids, true ) ) {
		return true;
	}

	// All post-edit screens (post.php, post-new.php) regardless of post type —
	// covers block + classic editors, attachment edit, WooCommerce products,
	// and any other CPT. The Posts/Pages LIST screen has base 'edit', not 'post'.
	if ( 'post' === $base ) {
		return true;
	}

	return false;
}
