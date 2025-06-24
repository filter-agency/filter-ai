<?php
/**
 * Helper functions for batch jobs
 */

/**
 * Reset group_id for scheduled actions to help us track the current actions
 *
 * @param string $hook Name of hook
 */
function filter_ai_reset_batch( $hook ) {
	if ( empty( $hook ) ) {
		return;
	}

	$actions = as_get_scheduled_actions(
		array(
			'hook'     => $hook,
			'group'    => 'filter-ai-current',
			'per_page' => 1,
		),
		'ids'
	);

	$in_progress_actions = as_get_scheduled_actions(
		array(
			'hook'     => $hook,
			'status'   => array(
				ActionScheduler_Store::STATUS_PENDING,
				ActionScheduler_Store::STATUS_RUNNING,
			),
			'group'    => 'filter-ai-current',
			'per_page' => 1,
		),
		'ids'
	);

	if ( ! empty( $actions ) && empty( $in_progress_actions ) ) {
		global $wpdb;

		$wpdb->query(
			$wpdb->prepare(
				"UPDATE {$wpdb->prefix}actionscheduler_actions
        SET `group_id` = (
          SELECT group_id FROM {$wpdb->prefix}actionscheduler_groups WHERE slug = ''
        )
        WHERE `hook` = %s AND `group_id` = (
          SELECT group_id FROM {$wpdb->prefix}actionscheduler_groups WHERE slug = %s
        )",
				$hook,
				'filter-ai-current'
			)
		);
	}
}

/**
 * Get scheduled action count for a specific hook
 *
 * @param string $hook Name of hook
 */
function filter_ai_get_action_count( $hook ) {
	if ( empty( $hook ) ) {
		return array(
			'total'    => 0,
			'pending'  => 0,
			'running'  => 0,
			'complete' => 0,
			'failed'   => 0,
		);
	}

	$actions = as_get_scheduled_actions(
		array(
			'hook'     => $hook,
			'group'    => 'filter-ai-current',
			'per_page' => -1,
		),
		'ids'
	);

	$pending_actions = as_get_scheduled_actions(
		array(
			'hook'     => $hook,
			'status'   => ActionScheduler_Store::STATUS_PENDING,
			'group'    => 'filter-ai-current',
			'per_page' => -1,
		),
		'ids'
	);

	$running_actions = as_get_scheduled_actions(
		array(
			'hook'     => $hook,
			'status'   => ActionScheduler_Store::STATUS_RUNNING,
			'group'    => 'filter-ai-current',
			'per_page' => -1,
		),
		'ids'
	);

	$complete_actions = as_get_scheduled_actions(
		array(
			'hook'     => $hook,
			'status'   => ActionScheduler_Store::STATUS_COMPLETE,
			'group'    => 'filter-ai-current',
			'per_page' => -1,
		),
		'ids',
	);

	$failed_actions = as_get_scheduled_actions(
		array(
			'hook'     => $hook,
			'status'   => ActionScheduler_Store::STATUS_FAILED,
			'group'    => 'filter-ai-current',
			'per_page' => -1,
		),
		'ids',
	);

	return (object) array(
		'total'    => count( $actions ),
		'pending'  => count( $pending_actions ),
		'running'  => count( $running_actions ),
		'complete' => count( $complete_actions ),
		'failed'   => count( $failed_actions ),
	);
}
