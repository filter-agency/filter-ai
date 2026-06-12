<?php
/**
 * Unit tests for the Brand Voice auto-generation lifecycle.
 *
 * @package Filter_AI
 */

use PHPUnit\Framework\TestCase;

if ( ! function_exists( 'get_option' ) ) {
	/**
	 * Minimal get_option shim for brand voice tests.
	 *
	 * @param string $name    Option name.
	 * @param mixed  $default Default value.
	 * @return mixed
	 */
	function get_option( $name, $default = false ) {
		return isset( $GLOBALS['filter_ai_test_options'][ $name ] ) ? $GLOBALS['filter_ai_test_options'][ $name ] : $default;
	}
}

if ( ! function_exists( 'update_option' ) ) {
	/**
	 * Minimal update_option shim for brand voice tests.
	 *
	 * @param string $name  Option name.
	 * @param mixed  $value Option value.
	 * @return bool
	 */
	function update_option( $name, $value ) {
		$GLOBALS['filter_ai_test_options'][ $name ] = $value;
		return true;
	}
}

if ( ! function_exists( 'add_option' ) ) {
	/**
	 * Minimal add_option shim for brand voice tests.
	 *
	 * @param string $name  Option name.
	 * @param mixed  $value Option value.
	 * @return bool
	 */
	function add_option( $name, $value ) {
		if ( isset( $GLOBALS['filter_ai_test_options'][ $name ] ) ) {
			return false;
		}
		$GLOBALS['filter_ai_test_options'][ $name ] = $value;
		return true;
	}
}

if ( ! function_exists( 'add_action' ) ) {
	/**
	 * Minimal add_action shim for loading lifecycle files outside WordPress.
	 *
	 * @return bool
	 */
	function add_action() {
		return true;
	}
}

if ( ! function_exists( 'wp_doing_ajax' ) ) {
	/**
	 * Tests do not run in an AJAX request.
	 *
	 * @return bool
	 */
	function wp_doing_ajax() {
		return false;
	}
}

if ( ! function_exists( 'wp_doing_cron' ) ) {
	/**
	 * Tests do not run in a cron request.
	 *
	 * @return bool
	 */
	function wp_doing_cron() {
		return false;
	}
}

if ( ! function_exists( 'as_next_scheduled_action' ) ) {
	/**
	 * Minimal Action Scheduler lookup shim.
	 *
	 * @return int|false
	 */
	function as_next_scheduled_action() {
		return isset( $GLOBALS['filter_ai_test_next_scheduled_action'] )
			? $GLOBALS['filter_ai_test_next_scheduled_action']
			: false;
	}
}

if ( ! function_exists( 'as_enqueue_async_action' ) ) {
	/**
	 * Minimal Action Scheduler enqueue shim.
	 *
	 * @param string $hook  Hook name.
	 * @param array  $args  Action args.
	 * @param string $group Action group.
	 * @return int
	 */
	function as_enqueue_async_action( $hook, $args = array(), $group = '' ) {
		$GLOBALS['filter_ai_test_enqueued_actions'][] = array(
			'hook'  => $hook,
			'args'  => $args,
			'group' => $group,
		);
		return count( $GLOBALS['filter_ai_test_enqueued_actions'] );
	}
}

require_once __DIR__ . '/../../includes/brand-voice.php';

/**
 * Tests for brand voice scan state transitions.
 */
class BrandVoiceTest extends TestCase {

	/**
	 * Reset global WordPress and scheduler shims.
	 *
	 * @return void
	 */
	protected function setUp(): void {
		parent::setUp();

		$GLOBALS['filter_ai_test_options']               = array();
		$GLOBALS['filter_ai_test_next_scheduled_action'] = false;
		$GLOBALS['filter_ai_test_enqueued_actions']      = array();
	}

	/**
	 * If a prompt was filled after scan init, the queue step should reconcile
	 * the state without relying on cron to run the scheduled handler.
	 *
	 * @return void
	 */
	public function test_maybe_queue_scan_skips_when_brand_voice_prompt_already_exists(): void {
		$GLOBALS['filter_ai_test_options'][ FILTER_AI_BRAND_VOICE_SCAN_OPTION ] = filter_ai_brand_voice_default_state();
		$GLOBALS['filter_ai_test_options']['filter_ai_settings']                = array(
			'brand_voice_prompt' => 'Write with a confident editorial voice.',
		);

		filter_ai_brand_voice_maybe_queue_scan();

		$this->assertSame( array(), $GLOBALS['filter_ai_test_enqueued_actions'] );
		$state = filter_ai_brand_voice_get_state();
		$this->assertSame( 'skipped', $state['status'] );
		$this->assertSame( 'overwritten_by_user', $state['error_code'] );
		$this->assertTrue( $state['notice_dismissed'] );
	}
}
