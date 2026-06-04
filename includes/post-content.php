<?php
/**
 * Resolve the content Filter AI feeds to per-post generation (Batch Generation
 * SEO titles & descriptions, etc.).
 *
 * Batch jobs historically read only $post->post_content. That is empty for post
 * types whose content lives elsewhere — WooCommerce products, ACF fields, page
 * builders — so batch generation failed with "Missing content" on those posts.
 * See Asana ticket 1211920629937080.
 *
 * Resolution order:
 *   1. post_content
 *   2. values of any custom-field (meta) keys registered in Settings
 *      (the `content_custom_fields` option — see the Batch Generation screen)
 *   3. post_excerpt (fallback; this is where WooCommerce keeps the product
 *      short description, for example)
 * The result is then passed through the `filter_ai_post_content` filter so a
 * site can supply or adjust content programmatically as well.
 *
 * @package Filter_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Parse the comma-separated `content_custom_fields` setting into a clean list
 * of meta keys. Pure helper (no WordPress calls) so it can be unit-tested.
 *
 * @param mixed $raw The raw setting value (comma-separated string).
 * @return string[] De-duplicated, trimmed, non-empty meta keys.
 */
function filter_ai_parse_custom_field_keys( $raw ) {
	if ( ! is_string( $raw ) || '' === trim( $raw ) ) {
		return array();
	}
	$keys = array_map( 'trim', explode( ',', $raw ) );
	$keys = array_filter(
		$keys,
		static function ( $key ) {
			return '' !== $key;
		}
	);
	return array_values( array_unique( $keys ) );
}

/**
 * Merge a post's content, custom-field values, and excerpt into one string.
 *
 * Pure helper (no WordPress calls) so it can be unit-tested. Uses post_content
 * plus any non-empty custom-field values; if none of those produce text, falls
 * back to the excerpt. Non-string custom-field values (e.g. ACF arrays) are
 * skipped. Duplicate fragments are removed and the rest joined with blank lines.
 *
 * @param mixed   $post_content  The post_content value.
 * @param mixed[] $custom_values Values read from the registered custom fields.
 * @param mixed   $post_excerpt  The post_excerpt value.
 * @return string Merged content, or '' when nothing usable is available.
 */
function filter_ai_merge_post_content( $post_content, array $custom_values, $post_excerpt ) {
	$parts = array();

	if ( is_string( $post_content ) && '' !== trim( $post_content ) ) {
		$parts[] = trim( $post_content );
	}

	foreach ( $custom_values as $value ) {
		if ( is_string( $value ) && '' !== trim( $value ) ) {
			$parts[] = trim( $value );
		}
	}

	if ( ! empty( $parts ) ) {
		return implode( "\n\n", array_values( array_unique( $parts ) ) );
	}

	return is_string( $post_excerpt ) ? trim( $post_excerpt ) : '';
}

/**
 * Get the content Filter AI should use to generate output for a post.
 *
 * @param int|WP_Post $post Post ID or object.
 * @return string Content for generation (may be empty if nothing is available).
 */
function filter_ai_get_post_content( $post ) {
	$post = get_post( $post );
	if ( ! $post instanceof WP_Post ) {
		return '';
	}

	$settings = function_exists( 'filter_ai_get_settings' ) ? filter_ai_get_settings() : array();
	$keys     = filter_ai_parse_custom_field_keys( isset( $settings['content_custom_fields'] ) ? $settings['content_custom_fields'] : '' );

	$custom_values = array();
	foreach ( $keys as $key ) {
		$custom_values[] = get_post_meta( $post->ID, $key, true );
	}

	$content = filter_ai_merge_post_content( $post->post_content, $custom_values, $post->post_excerpt );

	/**
	 * Filters the content Filter AI uses for per-post generation (SEO titles,
	 * meta descriptions, and other content-derived output).
	 *
	 * Most sites can register their custom fields under Settings instead, but
	 * this filter remains available for content that needs code to assemble
	 * (e.g. ACF repeater/flexible-content fields):
	 *
	 *     add_filter( 'filter_ai_post_content', function ( $content, $post ) {
	 *         // append/replace $content as needed
	 *         return $content;
	 *     }, 10, 2 );
	 *
	 * @param string  $content The resolved content (may be empty).
	 * @param WP_Post $post    The post being processed.
	 */
	$content = apply_filters( 'filter_ai_post_content', $content, $post );

	return is_string( $content ) ? trim( $content ) : '';
}
