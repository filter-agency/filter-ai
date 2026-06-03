<?php
/**
 * Smoke test to verify the PHPUnit bootstrap runs correctly.
 *
 * @package Filter_AI
 */

use PHPUnit\Framework\TestCase;

/**
 * Verifies the test bootstrap defines the ABSPATH constant.
 */
class SmokeTest extends TestCase {

	/**
	 * Confirms that ABSPATH is defined by the bootstrap file.
	 *
	 * @return void
	 */
	public function test_bootstrap_defines_abspath(): void {
		$this->assertTrue( defined( 'ABSPATH' ) );
	}
}
