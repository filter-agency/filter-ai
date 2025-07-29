<?php
/**
 * Plugin Name: Filter AI
 * Description: Meet your digital sidekick: Filter AI, a plugin that tackles your to-do list faster than you can say 'procrastination'!
 * Version: 1.2.2
 * Author: Filter
 * Author URI: https://filter.agency
 * Requires at least: 6.3
 * Requires PHP: 7.4
 * License: GPLv3
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain: filter-ai
 * Requires Plugins: ai-services
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'FILTER_AI_PATH', plugin_dir_path( __FILE__ ) );

require_once plugin_dir_path( __FILE__ ) . 'packages/action-scheduler/action-scheduler.php';

require_once plugin_dir_path( __FILE__ ) . 'includes/settings.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/batch.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/batchImageAltText.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/batchSEOTitle.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/batchSEOMetaDescription.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/dynamicReplaceAltText.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/updater.php';

/**
 *  Add settings link to the plugin action links
 *
 * @param string[] $actions Array of action links
 *
 * @return string[] Returns an array containing previous action links and the settings link
 */
function filter_ai_add_action_links( $actions ) {
	$plugin_links = array(
		sprintf(
			'<a href="' . admin_url( 'admin.php?page=filter_ai' ) . '">%s</a>',
			__( 'Settings', 'filter-ai' ),
		),
	);

	return array_merge( $plugin_links, $actions );
}

add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'filter_ai_add_action_links' );

/**
 *  Add settings page
 */
function filter_ai_options_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	try {
		ai_services()->get_available_service();
	} catch ( InvalidArgumentException $e ) {
		add_settings_error(
			'filter_ai_messages',
			'filter_ai_message_missing_plugin',
			sprintf(
			/* translators: 1: %s expands to a website link to AI Services settings, 2: </a> closing tag. */
				esc_html__( 'Please activate an AI within the %1$sAI Services%2$s plugin.', 'filter-ai' ),
				'<a href="options-general.php?page=ais_services">',
				'</a>'
			),
			'warning'
		);
	}

	settings_errors( 'filter_ai_messages' );
	?>
	<div class="wrap" id="filter-ai-settings-container"></div>
	<?php
}

/**
 *  Add batch page
 */
function filter_ai_batch_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	?>
	<div class="wrap" id="filter-ai-batch-container"></div>
	<?php
}

/**
 *  Set up admin menu
 */
function filter_ai_add_admin_menu() {
	add_menu_page(
		__( 'Filter AI Settings', 'filter-ai' ),
		__( 'Filter AI', 'filter-ai' ),
		'manage_options',
		'filter_ai',
		'filter_ai_options_page',
		'none',
		81,
	);

	add_submenu_page(
		'filter_ai',
		__( 'Filter AI Settings', 'filter-ai' ),
		__( 'Settings', 'filter-ai' ),
		'manage_options',
		'filter_ai',
		'filter_ai_options_page',
	);

	add_submenu_page(
		'filter_ai',
		__( 'Filter AI Batch Generation', 'filter-ai' ),
		__( 'Batch Generation', 'filter-ai' ),
		'manage_options',
		'filter_ai_submenu_page_batch',
		'filter_ai_batch_page',
	);
}

add_action( 'admin_menu', 'filter_ai_add_admin_menu' );

/**
 * Add setting option on plugin activation
 */
function filter_ai_activate() {
	$option_value_default = filter_ai_get_default_settings();

	if ( ! empty( $option_value_default ) ) {
		add_option( 'filter_ai_settings', $option_value_default );
	}
}

register_activation_hook( __FILE__, 'filter_ai_activate' );

/**
 * Remove setting option when the plugin in uninstalled
 */
function filter_ai_uninstall() {
	delete_option( 'filter_ai_settings' );
}

register_uninstall_hook( __FILE__, 'filter_ai_uninstall' );

/**
 *  Add scripts and styles
 */
function filter_ai_enqueue_assets() {
	if ( ! function_exists( 'ai_services' ) ) {
		return;
	}

	$asset_metadata = require plugin_dir_path( __FILE__ ) . 'build/index.asset.php';
	array_push( $asset_metadata['dependencies'], 'ais-ai', 'underscore', 'wp-block-editor', 'wp-core-data', 'wp-i18n' );

	wp_enqueue_script(
		'filter-ai-script',
		plugin_dir_url( __FILE__ ) . 'build/index.js',
		$asset_metadata['dependencies'],
		$asset_metadata['version'],
		[ 'strategy' => 'defer' ]
	);

	wp_enqueue_style( 'wp-components' );
	wp_enqueue_style( 'wp-preferences' );

	wp_enqueue_style(
		'filter-ai-styles',
		plugin_dir_url( __FILE__ ) . 'build/index.css',
		array(),
		$asset_metadata['version'],
	);

	wp_add_inline_script(
		'filter-ai-script',
		'window.filter_ai_api = ' . wp_json_encode(
			array(
				'url'   => admin_url( 'admin-ajax.php' ),
				'nonce' => wp_create_nonce( 'filter_ai_api' ),
			)
		) . ';',
		'before'
	);

	wp_add_inline_script(
		'filter-ai-script',
		'window.filter_ai_dependencies = ' . wp_json_encode(
			array(
				'wc'        => is_plugin_active( 'woocommerce/woocommerce.php' ),
				'yoast_seo' => is_plugin_active( 'wordpress-seo/wp-seo.php' ) || is_plugin_active( 'wordpress-seo-premium/wp-seo-premium.php' ),
			)
		) . ';',
		'before'
	);

	wp_add_inline_script(
		'filter-ai-script',
		'window.filter_ai_default_settings = ' . wp_json_encode(
			filter_ai_get_default_settings()
		) . ';',
		'before'
	);
}

add_action( 'admin_enqueue_scripts', 'filter_ai_enqueue_assets', -1 );
