<?php
/**
 * Common batch functions
 */

/**
 * API handler to trigger Action Scheduler queue
 */
function filter_ai_api_batch_queue_run() {
	check_ajax_referer( 'filter_ai_api', 'nonce' );

	do_action( 'action_scheduler_run_queue' );

	wp_send_json_success();
}

add_action( 'wp_ajax_filter_ai_api_batch_queue_run', 'filter_ai_api_batch_queue_run' );
