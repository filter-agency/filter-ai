<?php
/**
 * Unit tests for filter_ai_choose_post_content().
 *
 * @package Filter_AI
 */

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../includes/post-content.php';

/**
 * Pure-logic tests for the content/excerpt fallback selection. The WordPress
 * wrapper filter_ai_get_post_content() (get_post + apply_filters) is verified
 * manually; this covers the testable decision logic.
 */
class PostContentTest extends TestCase {

	/**
	 * Post content is used when present.
	 */
	public function test_uses_post_content_when_present(): void {
		$this->assertSame(
			'The body text.',
			filter_ai_choose_post_content( 'The body text.', 'An excerpt.' )
		);
	}

	/**
	 * Falls back to the excerpt when content is empty.
	 */
	public function test_falls_back_to_excerpt_when_content_empty(): void {
		$this->assertSame(
			'An excerpt.',
			filter_ai_choose_post_content( '', 'An excerpt.' )
		);
	}

	/**
	 * Whitespace-only content is treated as empty and falls back to the excerpt.
	 */
	public function test_whitespace_content_falls_back_to_excerpt(): void {
		$this->assertSame(
			'An excerpt.',
			filter_ai_choose_post_content( "   \n\t  ", 'An excerpt.' )
		);
	}

	/**
	 * Returns an empty string when both content and excerpt are empty.
	 */
	public function test_returns_empty_when_both_empty(): void {
		$this->assertSame( '', filter_ai_choose_post_content( '', '' ) );
		$this->assertSame( '', filter_ai_choose_post_content( '   ', '   ' ) );
	}

	/**
	 * Non-string inputs (e.g. null) are coerced to an empty string.
	 */
	public function test_handles_non_string_inputs(): void {
		$this->assertSame( 'Body.', filter_ai_choose_post_content( 'Body.', null ) );
		$this->assertSame( 'Excerpt.', filter_ai_choose_post_content( null, 'Excerpt.' ) );
		$this->assertSame( '', filter_ai_choose_post_content( null, null ) );
	}

	/**
	 * Content and excerpt are trimmed.
	 */
	public function test_trims_returned_value(): void {
		$this->assertSame( 'Body.', filter_ai_choose_post_content( '  Body.  ', '' ) );
		$this->assertSame( 'Excerpt.', filter_ai_choose_post_content( '', '  Excerpt.  ' ) );
	}
}
