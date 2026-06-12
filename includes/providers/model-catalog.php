<?php
/**
 * Cached provider/model catalog for settings dropdowns.
 *
 * @package Filter_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/model-selection.php';

if ( ! defined( 'FILTER_AI_PROVIDER_MODEL_CATALOG_OPTION' ) ) {
	define( 'FILTER_AI_PROVIDER_MODEL_CATALOG_OPTION', 'filter_ai_provider_model_catalog' );
}

/**
 * Get the cached provider/model catalog.
 *
 * @return array|null
 */
function filter_ai_get_stored_provider_model_catalog() {
	$catalog = function_exists( 'get_option' ) ? get_option( FILTER_AI_PROVIDER_MODEL_CATALOG_OPTION, null ) : null;
	return is_array( $catalog ) ? $catalog : null;
}

/**
 * Store a successful provider/model catalog refresh.
 *
 * @param array $catalog Catalog payload.
 * @return void
 */
function filter_ai_store_provider_model_catalog( array $catalog ) {
	if ( function_exists( 'update_option' ) ) {
		update_option( FILTER_AI_PROVIDER_MODEL_CATALOG_OPTION, $catalog, false );
	}
}

/**
 * Resolve the active backend name for cache scoping.
 *
 * @param Filter_AI_Provider|null $provider Active provider instance.
 * @return string
 */
function filter_ai_provider_model_backend_slug( $provider = null ) {
	if ( is_object( $provider ) ) {
		if ( $provider instanceof Filter_AI_Provider_Native ) {
			return 'native';
		}
		if ( $provider instanceof Filter_AI_Provider_AiServices ) {
			return 'ai-services';
		}
		return get_class( $provider );
	}

	$active_provider = function_exists( 'filter_ai_provider' ) ? filter_ai_provider() : null;
	return filter_ai_provider_model_backend_slug( $active_provider );
}

/**
 * Get or refresh the provider/model catalog, preserving stale cache on failure.
 *
 * @param string   $backend Backend cache key.
 * @param callable $loader  Callback returning provider/model options.
 * @param bool     $force   Whether to force refresh.
 * @return array
 */
function filter_ai_get_provider_model_catalog( $backend, callable $loader, $force = false ) {
	$stored = filter_ai_get_stored_provider_model_catalog();
	if (
		! $force
		&& is_array( $stored )
		&& isset( $stored['backend'] )
		&& $backend === $stored['backend']
		&& ! empty( $stored['options'] )
	) {
		return $stored;
	}

	try {
		$options = call_user_func( $loader );
		if ( ! is_array( $options ) ) {
			$options = array();
		}
		$catalog = array(
			'backend'    => (string) $backend,
			'fetched_at' => time(),
			'options'    => array_values( $options ),
		);
		filter_ai_store_provider_model_catalog( $catalog );
		return $catalog;
	} catch ( \Throwable $e ) {
		if ( function_exists( 'filter_ai_log_wp_error' ) && class_exists( 'WP_Error' ) ) {
			filter_ai_log_wp_error(
				'provider_model_refresh',
				new WP_Error( 'filter_ai_provider_models_refresh_failed', $e->getMessage() ),
				array(
					'backend' => (string) $backend,
				)
			);
		}
		if ( is_array( $stored ) && isset( $stored['backend'] ) && $backend === $stored['backend'] ) {
			return $stored;
		}
		return array(
			'backend'    => (string) $backend,
			'fetched_at' => 0,
			'options'    => array(),
			'error'      => $e->getMessage(),
		);
	}
}

/**
 * Return filtered provider/model options for the active backend.
 *
 * @param string[] $capabilities Required capability slugs.
 * @param bool     $force        Whether to force a refresh.
 * @return array[]
 */
function filter_ai_get_provider_model_options( array $capabilities = array(), $force = false ) {
	$provider = function_exists( 'filter_ai_provider' ) ? filter_ai_provider() : null;
	if ( ! $provider || ! method_exists( $provider, 'list_provider_models' ) ) {
		return array();
	}

	$backend = filter_ai_provider_model_backend_slug( $provider );
	$catalog = filter_ai_get_provider_model_catalog(
		$backend,
		static function () use ( $provider ) {
			return $provider->list_provider_models();
		},
		$force
	);

	$options = isset( $catalog['options'] ) && is_array( $catalog['options'] ) ? $catalog['options'] : array();
	return filter_ai_filter_provider_model_options( $options, $capabilities );
}

/**
 * Refresh the active provider/model catalog.
 *
 * @return void
 */
function filter_ai_refresh_provider_model_catalog() {
	filter_ai_get_provider_model_options( array(), true );
}

/**
 * Schedule daily provider/model refresh via Action Scheduler or WP-Cron.
 *
 * @return void
 */
function filter_ai_schedule_provider_model_refresh() {
	if ( function_exists( 'as_next_scheduled_action' ) && function_exists( 'as_schedule_recurring_action' ) ) {
		if ( ! as_next_scheduled_action( 'filter_ai_refresh_provider_models', array(), 'filter-ai' ) ) {
			as_schedule_recurring_action( time() + HOUR_IN_SECONDS, DAY_IN_SECONDS, 'filter_ai_refresh_provider_models', array(), 'filter-ai' );
		}
		return;
	}

	if ( function_exists( 'wp_next_scheduled' ) && function_exists( 'wp_schedule_event' ) && ! wp_next_scheduled( 'filter_ai_refresh_provider_models' ) ) {
		wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'filter_ai_refresh_provider_models' );
	}
}

if ( function_exists( 'add_action' ) ) {
	add_action( 'filter_ai_refresh_provider_models', 'filter_ai_refresh_provider_model_catalog' );
	add_action( 'init', 'filter_ai_schedule_provider_model_refresh', 20 );
}
