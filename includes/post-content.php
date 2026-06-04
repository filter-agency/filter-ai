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
 * This adds a sensible automatic fallback to the excerpt (which is where, for
 * example, WooCommerce stores the product short description) and, crucially,
 * exposes the `filter_ai_post_content` filter so a site can supply content from
 * its own custom fields and keep using the Batch Generation tool.
 *
 * @package Filter_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Choose the base generation content from a post's content and excerpt.
 *
 * Pure helper (no WordPress calls) so it can be unit-tested. Prefers the post
 * content; falls back to the excerpt when the content is empty or whitespace.
 *
 * @param mixed $post_content The post_content value.
 * @param mixed $post_excerpt The post_excerpt value.
 * @return string Trimmed content, or '' when both are empty.
 */
function filter_ai_choose_post_content( $post_content, $post_excerpt ) {
	$content = is_string( $post_content ) ? trim( $post_content ) : '';
	if ( '' !== $content ) {
		return $content;
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

	$content = filter_ai_choose_post_content( $post->post_content, $post->post_excerpt );

	/**
	 * Filters the content Filter AI uses for per-post generation (SEO titles,
	 * meta descriptions, and other content-derived output).
	 *
	 * Sites whose post content lives in custom fields — ACF, page builders,
	 * WooCommerce, etc. — can append or replace the content here so the Batch
	 * Generation tool has something to work with. Example:
	 *
	 *     add_filter( 'filter_ai_post_content', function ( $content, $post ) {
	 *         if ( 'product' === $post->post_type ) {
	 *             $custom = get_post_meta( $post->ID, 'my_product_blurb', true );
	 *             if ( $custom ) {
	 *                 $content = trim( $content . "\n\n" . $custom );
	 *             }
	 *         }
	 *         return $content;
	 *     }, 10, 2 );
	 *
	 * @param string  $content The resolved content (post_content, or excerpt fallback; may be empty).
	 * @param WP_Post $post    The post being processed.
	 */
	$content = apply_filters( 'filter_ai_post_content', $content, $post );

	return is_string( $content ) ? trim( $content ) : '';
}
