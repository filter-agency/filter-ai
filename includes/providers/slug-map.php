<?php
/**
 * Reconcile a stored per-feature provider slug with the providers actually
 * available on the active backend.
 *
 * @package Filter_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Map a stored provider slug to an available one (or null for auto).
 *
 * @param string   $stored_slug The saved *_prompt_service value ('' = auto).
 * @param string[] $available   Slugs currently configured/available.
 * @return string|null The slug to prefer, or null for automatic selection.
 */
function filter_ai_map_service_slug( $stored_slug, array $available ) {
	if ( '' === $stored_slug ) {
		return null;
	}
	// ai-services and Connectors both use 'openai' / 'anthropic' / 'google'
	// (confirmed against a live WP 7.0 install). Extend this alias map only if
	// a future provider's slugs diverge between the two backends.
	$aliases    = array();
	$normalised = isset( $aliases[ $stored_slug ] ) ? $aliases[ $stored_slug ] : $stored_slug;

	return in_array( $normalised, $available, true ) ? $normalised : null;
}
