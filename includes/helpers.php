<?php
/**
 * Helper functions for batch jobs
 */

// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

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

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery -- Reason: Action Scheduler don't offer another way to do this group_id swapping
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.NoCaching -- Reason: we just need to do the UPDATE and don't need the result
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
		// phpcs:enable
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

/**
 * Get count for a specific post_type
 *
 * @param string $post_type (optional) post type name
 *
 * @return number Number of posts
 */
function filter_ai_get_posts_count( $post_type = 'any' ) {
	if ( empty( $post_type ) ) {
		return 0;
	}

	$query = new WP_Query(
		array(
			'post_type'              => $post_type,
			'public'                 => true,
			'posts_per_page'         => 1,
			'paged'                  => 1,
			'update_post_term_cache' => false,
			'fields'                 => 'ids',
		)
	);

	return $query->found_posts;
}

/**
 * Get posts for a specific post_type that is missing a specific meta query
 *
 * @param string $query_key Query key
 * @param int    $paged Page number
 * @param int    $posts_per_page Number of posts per page
 * @param string $post_type Post type
 *
 * @return WP_Query Return WP_Query
 */
function filter_ai_get_posts_missing_meta_query( $query_key, $paged = 1, $posts_per_page = 500, $post_type = 'any' ) {
	// phpcs:disable WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- Reason: filtering by specific meta key
	$query = new WP_Query(
		array(
			'post_type'              => $post_type,
			'public'                 => true,
			'posts_per_page'         => $posts_per_page,
			'paged'                  => $paged,
			'meta_query'             => array(
				'relation' => 'OR',
				array(
					'key'     => $query_key,
					'value'   => '',
					'compare' => 'NOT EXISTS',
				),
				array(
					'key'     => $query_key,
					'value'   => '',
					'compare' => '=',
				),
			),
			'update_post_term_cache' => false,
			'fields'                 => 'ids',
		)
	);
	// phpcs:enable

	return $query;
}

/**
 * Get posts for a specific post_type that has a specific meta query
 *
 * @param string $query_key Query key
 * @param int    $paged Page number
 * @param int    $posts_per_page Number of posts per page
 * @param string $post_type Post type
 *
 * @return WP_Query Return WP_Query
 */
function filter_ai_get_posts_has_meta_query( $query_key, $paged = 1, $posts_per_page = 500, $post_type = 'any' ) {
	// phpcs:disable WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- Reason: filtering by meta key
	$query = new WP_Query(
		array(
			'post_type'              => $post_type,
			'public'                 => true,
			'posts_per_page'         => $posts_per_page,
			'paged'                  => $paged,
			'meta_query'             => array(
				array(
					'key'     => $query_key,
					'compare' => 'EXISTS',
				),
			),
			'update_post_term_cache' => false,
			'fields'                 => 'ids',
		)
	);
	// phpcs:enable

	return $query;
}
