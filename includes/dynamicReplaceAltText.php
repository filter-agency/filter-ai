<?php
/**
 * Functionality to dynamically replace missing alt text
 */

// require settings
require_once __DIR__ . '/settings.php';

/**
 * Render block filter to replace empty alt text
 *
 * @param string $block_content The block content
 * @param array  $block The full block, including name and attributes
 *
 * @return string $block_content Block content
 */
function filter_ai_render_block( $block_content, $block ) {
	$settings = filter_ai_get_settings();

	if ( ! $settings['dynamic_add_alt_text_enabled'] ) {
		return $block_content;
	}

	$image_id;

	if ( ! empty( $block['attrs']['mediaId'] ) ) {
		$image_id = $block['attrs']['mediaId'];
	}

	if ( ! empty( $block['attrs']['id'] ) ) {
		$image_id = $block['attrs']['id'];
	}

	if ( empty( $image_id ) ) {
		return $block_content;
	}

	return preg_replace_callback(
		'/<img[^>]+class="[^"]*wp-image-\d+[^"]*"[^>]*>/i',
		function ( $matches ) use ( $image_id ) {
			if ( ! str_contains( $matches[0], 'alt=""' ) ) {
				return $matches[0];
			}

			preg_match( '/wp-image-(\d+)/', $matches[0], $id_matches );

			if ( empty( $id_matches[1] ) || $id_matches[1] !== (string) $image_id ) {
				return $matches[0];
			}

			$alt = get_post_meta( $image_id, '_wp_attachment_image_alt', true );

			if ( empty( $alt ) ) {
				return $matches[0];
			}

			return str_replace( 'alt=""', 'alt="' . esc_attr( $alt ) . '"', $matches[0] );
		},
		$block_content
	);
}

add_filter( 'render_block_core/image', 'filter_ai_render_block', 10, 2 );
add_filter( 'render_block_core/cover', 'filter_ai_render_block', 10, 2 );
add_filter( 'render_block_core/media-text', 'filter_ai_render_block', 10, 2 );
