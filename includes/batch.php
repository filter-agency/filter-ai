<?php
/**
 * Common batch functions
 */

// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * API handler to trigger Action Scheduler queue
 */
function filter_ai_api_batch_queue_run() {
	check_ajax_referer( 'filter_ai_api', 'nonce' );

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
