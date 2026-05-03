<?php
/**
 * Common batch functions
 */

// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Verify nonce + capability for a Filter AI AJAX handler. Sends a 403 and
 * exits if either check fails.
 *
 * Every filter_ai_api_* handler must call this. The shared `filter_ai_api`
 * nonce is exposed in JS to any logged-in user that loads an admin page,
 * so the nonce alone is not authorisation — we additionally require the
 * same capability the settings menu requires.
 */
function filter_ai_check_api_request() {
	check_ajax_referer( 'filter_ai_api', 'nonce' );

	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( null, 403 );
	}
}

/**
 * API handler to trigger Action Scheduler queue
 */
function filter_ai_api_batch_queue_run() {
	filter_ai_check_api_request();

	if ( class_exists( 'ActionScheduler' ) && method_exists( ActionScheduler::runner(), 'run' ) ) {
		ActionScheduler::runner()->run();
	}

	wp_send_json_success();
}

add_action( 'wp_ajax_filter_ai_api_batch_queue_run', 'filter_ai_api_batch_queue_run' );

/**
 * Get Action Scheduler logs for a action id
 *
 * @param string $action_id action id
 */
function filter_ai_get_action_logs( $action_id ) {
	if ( ! class_exists( 'ActionScheduler' ) || ! method_exists( ActionScheduler::logger(), 'get_logs' ) ) {
		return array();
	}

	return ActionScheduler::logger()->get_logs( $action_id );
}
