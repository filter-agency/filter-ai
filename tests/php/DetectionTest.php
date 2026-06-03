<?php
/**
 * Unit tests for backend detection logic.
 *
 * @package Filter_AI
 */

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../includes/providers/detection.php';

/**
 * Tests for filter_ai_detect_backend().
 */
class DetectionTest extends TestCase {

	/**
	 * Native is preferred when both backends are present.
	 *
	 * @return void
	 */
	public function test_prefers_native_when_both_present(): void {
		$this->assertSame( 'native', filter_ai_detect_backend( true, true ) );
	}

	/**
	 * Returns 'native' when only the native backend is available.
	 *
	 * @return void
	 */
	public function test_native_when_only_native(): void {
		$this->assertSame( 'native', filter_ai_detect_backend( true, false ) );
	}

	/**
	 * Returns 'legacy' when only the legacy backend is available.
	 *
	 * @return void
	 */
	public function test_legacy_when_only_legacy(): void {
		$this->assertSame( 'legacy', filter_ai_detect_backend( false, true ) );
	}

	/**
	 * Returns 'none' when neither backend is available.
	 *
	 * @return void
	 */
	public function test_none_when_neither(): void {
		$this->assertSame( 'none', filter_ai_detect_backend( false, false ) );
	}
}
