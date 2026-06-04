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
	 * Native wins when it is present AND has at least one configured provider,
	 * even if legacy is also present.
	 *
	 * @return void
	 */
	public function test_prefers_native_when_configured(): void {
		$this->assertSame( 'native', filter_ai_detect_backend( true, true, true ) );
		$this->assertSame( 'native', filter_ai_detect_backend( true, false, true ) );
	}

	/**
	 * The migration grace period: when native is present but has no configured
	 * providers, legacy takes precedence so users who relied on ai-services keys
	 * before upgrading to WP 7.0 keep working until they move their keys to
	 * Connectors. Without this, an upgrade silently breaks generation.
	 *
	 * @return void
	 */
	public function test_falls_back_to_legacy_when_native_has_no_providers(): void {
		$this->assertSame( 'legacy', filter_ai_detect_backend( true, true, false ) );
	}

	/**
	 * Returns 'native' when only the native backend is available, regardless of
	 * provider configuration — so the UI can show the right "configure a
	 * connector" guidance.
	 *
	 * @return void
	 */
	public function test_native_when_only_native(): void {
		$this->assertSame( 'native', filter_ai_detect_backend( true, false, true ) );
		$this->assertSame( 'native', filter_ai_detect_backend( true, false, false ) );
	}

	/**
	 * Returns 'legacy' when only the legacy backend is available.
	 *
	 * @return void
	 */
	public function test_legacy_when_only_legacy(): void {
		$this->assertSame( 'legacy', filter_ai_detect_backend( false, true, false ) );
		// Also when native is absent, the native-has-providers flag is irrelevant.
		$this->assertSame( 'legacy', filter_ai_detect_backend( false, true, true ) );
	}

	/**
	 * Returns 'none' when neither backend is available.
	 *
	 * @return void
	 */
	public function test_none_when_neither(): void {
		$this->assertSame( 'none', filter_ai_detect_backend( false, false, false ) );
	}
}
