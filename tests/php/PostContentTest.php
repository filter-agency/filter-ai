<?php
/**
 * Unit tests for the pure content-resolution helpers in post-content.php.
 *
 * @package Filter_AI
 */

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../includes/post-content.php';

/**
 * Pure-logic tests. The WordPress wrapper filter_ai_get_post_content()
 * (get_post + get_post_meta + apply_filters) is verified manually; this covers
 * the testable parsing and merging logic.
 */
class PostContentTest extends TestCase {

	/* ----- filter_ai_parse_custom_field_keys ----- */

	/**
	 * An empty or non-string setting yields no keys.
	 */
	public function test_parse_empty_returns_no_keys(): void {
		$this->assertSame( array(), filter_ai_parse_custom_field_keys( '' ) );
		$this->assertSame( array(), filter_ai_parse_custom_field_keys( '   ' ) );
		$this->assertSame( array(), filter_ai_parse_custom_field_keys( null ) );
	}

	/**
	 * A comma-separated string is split, trimmed, and de-duplicated.
	 */
	public function test_parse_splits_trims_and_dedupes(): void {
		$this->assertSame(
			array( 'product_blurb', '_custom_body' ),
			filter_ai_parse_custom_field_keys( ' product_blurb , _custom_body ' )
		);
		$this->assertSame(
			array( 'a', 'b' ),
			filter_ai_parse_custom_field_keys( 'a, b, a, , b' )
		);
	}

	/* ----- filter_ai_merge_post_content ----- */

	/**
	 * Post content alone is returned when no custom values are present.
	 */
	public function test_merge_uses_post_content(): void {
		$this->assertSame(
			'The body.',
			filter_ai_merge_post_content( 'The body.', array(), 'An excerpt.' )
		);
	}

	/**
	 * Post content and custom-field values are combined.
	 */
	public function test_merge_combines_content_and_custom_values(): void {
		$this->assertSame(
			"The body.\n\nField one.\n\nField two.",
			filter_ai_merge_post_content( 'The body.', array( 'Field one.', 'Field two.' ), '' )
		);
	}

	/**
	 * With empty content, custom-field values become the content.
	 */
	public function test_merge_uses_custom_values_when_content_empty(): void {
		$this->assertSame(
			'Field one.',
			filter_ai_merge_post_content( '', array( 'Field one.' ), 'An excerpt.' )
		);
	}

	/**
	 * Non-string and empty custom values are skipped.
	 */
	public function test_merge_skips_non_string_and_empty_custom_values(): void {
		$this->assertSame(
			'Field one.',
			filter_ai_merge_post_content( '', array( '', '   ', array( 'acf', 'array' ), null, 'Field one.' ), '' )
		);
	}

	/**
	 * Duplicate fragments are removed.
	 */
	public function test_merge_dedupes_fragments(): void {
		$this->assertSame(
			'Same.',
			filter_ai_merge_post_content( 'Same.', array( 'Same.' ), '' )
		);
	}

	/**
	 * Falls back to the excerpt only when content and custom values are empty.
	 */
	public function test_merge_falls_back_to_excerpt(): void {
		$this->assertSame(
			'An excerpt.',
			filter_ai_merge_post_content( '', array( '', null ), 'An excerpt.' )
		);
	}

	/**
	 * Returns an empty string when everything is empty.
	 */
	public function test_merge_returns_empty_when_all_empty(): void {
		$this->assertSame( '', filter_ai_merge_post_content( '', array(), '' ) );
		$this->assertSame( '', filter_ai_merge_post_content( '  ', array( '  ' ), '  ' ) );
	}
}
