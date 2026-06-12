<?php
/**
 * Seed content for the Filter AI Docker test environments.
 *
 * Run through WP-CLI after WordPress and the requested plugins are installed.
 */

$seed_key = 'filter-ai-docker';

function filter_ai_seed_delete_existing( string $seed_key ): void {
	$ids = get_posts(
		[
			'post_type'      => [ 'post', 'page', 'product', 'attachment' ],
			'post_status'    => 'any',
			'posts_per_page' => -1,
			'fields'         => 'ids',
			'meta_key'       => '_filter_ai_seeded',
			'meta_value'     => $seed_key,
		]
	);

	foreach ( $ids as $id ) {
		wp_delete_post( (int) $id, true );
	}
}

function filter_ai_seed_term( string $name, string $taxonomy ): int {
	$term = term_exists( $name, $taxonomy );

	if ( ! $term ) {
		$term = wp_insert_term( $name, $taxonomy );
	}

	if ( is_wp_error( $term ) ) {
		WP_CLI::warning( $term->get_error_message() );
		return 0;
	}

	return (int) ( is_array( $term ) ? $term['term_id'] : $term );
}

function filter_ai_seed_attachment( string $title, string $alt_text, string $seed_key ): int {
	$source = getenv( 'FILTER_AI_SEED_IMAGE' );

	if ( ! $source || ! file_exists( $source ) ) {
		WP_CLI::warning( 'Seed image was not available; skipping media attachment.' );
		return 0;
	}

	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';

	$tmp = wp_tempnam( 'filter-ai-seed.png' );
	copy( $source, $tmp );

	$file = [
		'name'     => sanitize_title( $title ) . '.png',
		'tmp_name' => $tmp,
	];

	$id = media_handle_sideload( $file, 0, $title );

	if ( is_wp_error( $id ) ) {
		@unlink( $tmp );
		WP_CLI::warning( $id->get_error_message() );
		return 0;
	}

	update_post_meta( $id, '_wp_attachment_image_alt', $alt_text );
	update_post_meta( $id, '_filter_ai_seeded', $seed_key );

	return (int) $id;
}

function filter_ai_seed_post( array $post, array $terms, array $meta, string $seed_key ): int {
	$post_id = wp_insert_post( $post, true );

	if ( is_wp_error( $post_id ) ) {
		WP_CLI::warning( $post_id->get_error_message() );
		return 0;
	}

	update_post_meta( $post_id, '_filter_ai_seeded', $seed_key );

	foreach ( $terms as $taxonomy => $term_ids ) {
		wp_set_object_terms( $post_id, array_filter( array_map( 'intval', $term_ids ) ), $taxonomy );
	}

	foreach ( $meta as $key => $value ) {
		update_post_meta( $post_id, $key, $value );
	}

	return (int) $post_id;
}

function filter_ai_seed_product( array $data, int $category_id, int $image_id, string $seed_key ): int {
	if ( class_exists( 'WC_Product_Simple' ) ) {
		$product = new WC_Product_Simple();
		$product->set_name( $data['name'] );
		$product->set_status( $data['status'] );
		$product->set_regular_price( $data['price'] );
		$product->set_short_description( $data['short_description'] );
		$product->set_description( $data['description'] );
		$product->set_sku( $data['sku'] );

		if ( $image_id ) {
			$product->set_image_id( $image_id );
		}

		$product_id = $product->save();
	} else {
		$product_id = wp_insert_post(
			[
				'post_type'    => 'product',
				'post_status'  => $data['status'],
				'post_title'   => $data['name'],
				'post_content' => $data['description'],
				'post_excerpt' => $data['short_description'],
			],
			true
		);

		if ( is_wp_error( $product_id ) ) {
			WP_CLI::warning( $product_id->get_error_message() );
			return 0;
		}
	}

	update_post_meta( $product_id, '_filter_ai_seeded', $seed_key );
	update_post_meta( $product_id, '_regular_price', $data['price'] );
	update_post_meta( $product_id, '_price', $data['price'] );
	update_post_meta( $product_id, '_stock_status', 'instock' );

	if ( $category_id ) {
		wp_set_object_terms( $product_id, [ $category_id ], 'product_cat' );
	}

	return (int) $product_id;
}

filter_ai_seed_delete_existing( $seed_key );

$category_id      = filter_ai_seed_term( 'Filter AI Demos', 'category' );
$editorial_tag_id = filter_ai_seed_term( 'Editorial Workflow', 'post_tag' );
$ai_tag_id        = filter_ai_seed_term( 'AI Testing', 'post_tag' );
$product_cat_id   = taxonomy_exists( 'product_cat' ) ? filter_ai_seed_term( 'AI Testing Goods', 'product_cat' ) : 0;

$hero_image_id    = filter_ai_seed_attachment( 'Filter AI editorial dashboard', 'Editor reviewing AI-assisted content suggestions', $seed_key );
$missing_alt_id   = filter_ai_seed_attachment( 'Unlabelled product image for alt text testing', '', $seed_key );
$wp_version_label = getenv( 'FILTER_AI_SEED_WP_VERSION' ) ?: 'unknown';

$post_with_meta_id = filter_ai_seed_post(
	[
		'post_type'    => 'post',
		'post_status'  => 'publish',
		'post_title'   => 'Seven Prompts for Faster Editorial QA',
		'post_excerpt' => 'A compact seeded article with finished Yoast metadata for comparison.',
		'post_content' => '<!-- wp:paragraph --><p>This seeded article gives Filter AI enough realistic body copy to test title, excerpt, grammar, tag, FAQ, and summary generation from the block editor.</p><!-- /wp:paragraph --><!-- wp:list --><ul><li>Check tone against the brand voice.</li><li>Generate a concise SEO title.</li><li>Rewrite the introduction for a product launch audience.</li></ul><!-- /wp:list -->',
	],
	[
		'category' => [ $category_id ],
		'post_tag' => [ $editorial_tag_id, $ai_tag_id ],
	],
	[
		'_thumbnail_id'         => $hero_image_id,
		'_yoast_wpseo_title'    => 'Editorial QA Prompts for AI Content Teams',
		'_yoast_wpseo_metadesc' => 'A seeded article for testing Filter AI prompts, Yoast metadata, summaries, FAQs, and editorial rewriting.',
		'_yoast_wpseo_focuskw'  => 'editorial QA prompts',
	],
	$seed_key
);

$post_missing_meta_id = filter_ai_seed_post(
	[
		'post_type'    => 'post',
		'post_status'  => 'draft',
		'post_title'   => 'Untuned Seasonal Campaign Brief',
		'post_excerpt' => '',
		'post_content' => '<!-- wp:paragraph --><p>This draft intentionally has no Yoast title or meta description so batch SEO generation has something useful to find.</p><!-- /wp:paragraph --><!-- wp:paragraph --><p>The campaign covers product education, launch messaging, customer objections, and follow-up email content.</p><!-- /wp:paragraph -->',
	],
	[
		'category' => [ $category_id ],
		'post_tag' => [ $ai_tag_id ],
	],
	[
		'_thumbnail_id' => $missing_alt_id,
	],
	$seed_key
);

$page_id = filter_ai_seed_post(
	[
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Filter AI Playground',
		'post_content' => '<!-- wp:heading --><h2>Seeded content playground</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Use this page to test block toolbar actions, summaries, FAQs, tone changes, and native AI provider routing.</p><!-- /wp:paragraph --><!-- wp:filter-ai/summary {"title":"Seed Summary"} /--><!-- wp:filter-ai/faqs /-->',
	],
	[],
	[
		'_yoast_wpseo_title' => '',
	],
	$seed_key
);

$product_one_id = filter_ai_seed_product(
	[
		'name'              => 'Prompt QA Notebook',
		'status'            => 'publish',
		'price'             => '29.00',
		'sku'               => 'FILTER-QA-NOTEBOOK',
		'short_description' => 'A seeded WooCommerce product with a short description ready for AI rewriting.',
		'description'       => 'A practical notebook for marketing teams that want repeatable prompt testing, approval notes, and content QA checklists.',
	],
	$product_cat_id,
	$hero_image_id,
	$seed_key
);

$product_two_id = filter_ai_seed_product(
	[
		'name'              => 'Metadata Review Sprint',
		'status'            => 'draft',
		'price'             => '149.00',
		'sku'               => 'FILTER-META-SPRINT',
		'short_description' => '',
		'description'       => 'A draft service product with sparse copy so the WooCommerce product description tools have a realistic blank canvas.',
	],
	$product_cat_id,
	$missing_alt_id,
	$seed_key
);

if ( function_exists( 'filter_ai_get_default_settings' ) ) {
	$settings = array_merge(
		filter_ai_get_default_settings(),
		(array) get_option( 'filter_ai_settings', [] ),
		[
			'brand_voice_enabled' => true,
			'brand_voice_prompt'  => 'Write with a clear agency voice: specific, practical, confident, and useful to busy editorial and ecommerce teams.',
			'stop_words_enabled'  => true,
			'stop_words_prompt'   => 'cutting-edge, game-changing, leverage, seamless, unlock, transformative',
		]
	);

	update_option( 'filter_ai_settings', $settings );
}

$wpseo_titles                  = (array) get_option( 'wpseo_titles', [] );
$wpseo_titles['title-post']    = '%%title%% %%sep%% %%sitename%%';
$wpseo_titles['metadesc-post'] = '%%excerpt%%';
$wpseo_titles['title-page']    = '%%title%% %%sep%% %%sitename%%';
update_option( 'wpseo_titles', $wpseo_titles );

update_option( 'woocommerce_onboarding_profile', [ 'completed' => true ] );
update_option( 'woocommerce_task_list_hidden', 'yes' );
update_option( 'woocommerce_allow_tracking', 'no' );

WP_CLI::success(
	sprintf(
		'Seeded WordPress %s with posts %d/%d, page %d, products %d/%d, media %d/%d.',
		$wp_version_label,
		$post_with_meta_id,
		$post_missing_meta_id,
		$page_id,
		$product_one_id,
		$product_two_id,
		$hero_image_id,
		$missing_alt_id
	)
);
