<?php
/**
 * Unit tests for provider slug-map resolver logic.
 *
 * @package Filter_AI
 */

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../includes/providers/slug-map.php';

/**
 * Tests for filter_ai_map_service_slug().
 */
class SlugMapTest extends TestCase {

	/**
	 * An empty stored slug means automatic provider selection (null).
	 *
	 * @return void
	 */
	public function test_empty_stored_slug_means_auto(): void {
		$this->assertNull( filter_ai_map_service_slug( '', array( 'openai', 'anthropic' ) ) );
	}

	/**
	 * Returns the slug when it is present in the available list.
	 *
	 * @return void
	 */
	public function test_returns_slug_when_available(): void {
		$this->assertSame( 'openai', filter_ai_map_service_slug( 'openai', array( 'openai', 'google' ) ) );
	}

	/**
	 * Falls back to null (auto) when the stored slug is not in the available list.
	 *
	 * @return void
	 */
	public function test_falls_back_to_auto_when_unavailable(): void {
		$this->assertNull( filter_ai_map_service_slug( 'cohere', array( 'openai', 'google' ) ) );
	}
}
