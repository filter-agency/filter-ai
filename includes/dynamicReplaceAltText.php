<?php
/**
 * Functionality to dynamically replace missing alt text
 */

// require settings
require_once 'settings.php';

/**
 * Render block filter to replace empty alt text
 *
 * @param string $block_content The block content
 * @param array  $block The full block including name and attributes
 *
 * @return string $block_content Block content
 */
function filter_ai_render_block( $block_content, $block ) {
	$settings = filter_ai_get_settings();

	if ( ! $settings['dynamic_add_alt_text_enabled'] ) {
		return $block_content;
	}

	$alt_attr = $block['attrs']['alt'];
	$image_id = $block['attrs']['id'];

	if ( ! empty( $block['attrs']['mediaAlt'] ) ) {
		$alt_attr = $block['attrs']['mediaAlt'];
	}

	if ( ! empty( $block['attrs']['mediaId'] ) ) {
		$image_id = $block['attrs']['mediaId'];
	}

	if ( ! empty( $alt_attr ) || empty( $image_id ) ) {
		return $block_content;
	}

	$alt = get_post_meta( $image_id, '_wp_attachment_image_alt', true );

	if ( empty( $alt ) ) {
		return $block_content;
	}

	return preg_replace( '/alt=\\"\\"/', 'alt="' . $alt . '"', $block_content );
}

add_filter( 'render_block_core/image', 'filter_ai_render_block', 10, 2 );
add_filter( 'render_block_core/cover', 'filter_ai_render_block', 10, 2 );
add_filter( 'render_block_core/media-text', 'filter_ai_render_block', 10, 2 );
