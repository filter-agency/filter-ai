<?php
/**
 * Plugin Name: Filter AI
 * Plugin URI: https://filteraiplugin.com
 * Description: Meet your digital sidekick: Filter AI, a plugin that tackles your to-do list faster than you can say 'procrastination'!
 * Version: 1.7.0
 * Author: Filter
 * Author URI: https://filter.agency
 * Requires at least: 6.3
 * Requires PHP: 7.4
 * License: GPLv3
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain: filter-ai
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'FILTER_AI_VERSION', '1.7.0' );
define( 'FILTER_AI_PATH', plugin_dir_path( __FILE__ ) );
define( 'FILTER_AI_FILE', __FILE__ );

// Strauss-prefixed dependencies (StellarWP Telemetry, di52, etc.) and the
// telemetry classes that depend on them. If vendor-prefixed/ is missing
// (e.g. installed from git without `composer install`), skip telemetry
// entirely — the class declarations below extend Strauss-prefixed parents
// and would fatal if loaded.
if ( file_exists( FILTER_AI_PATH . 'vendor-prefixed/autoload.php' ) ) {
	require_once FILTER_AI_PATH . 'vendor-prefixed/autoload.php';
	require_once FILTER_AI_PATH . 'includes/class-telemetry.php';
	require_once FILTER_AI_PATH . 'includes/class-telemetry-modals.php';
	add_action( 'plugins_loaded', [ 'Filter_AI_Telemetry', 'bootstrap' ] );
	add_action( 'plugins_loaded', [ 'Filter_AI_Telemetry_Modals', 'bootstrap' ] );
}

if ( ! class_exists( 'ActionScheduler' ) ) {
	require_once plugin_dir_path( __FILE__ ) . 'packages/action-scheduler/action-scheduler.php';
}

require_once plugin_dir_path( __FILE__ ) . 'includes/settings.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/batch.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/batchImageAltText.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/batchSEOTitle.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/batchSEOMetaDescription.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/dynamicReplaceAltText.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/providers/detection.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/rest/class-rest-controller.php';
Filter_AI_REST_Controller::register();

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
 *  Contains a hidden div.wrap to hide admin notices
 */
function filter_ai_options_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	?>
	<div class="wrap" style="display:none;"><h2></h2></div>
	<div class="filter-wrap" id="filter-ai-settings-container"></div>
	<?php
}

/**
 *  Add batch page
 *  Contains a hidden div.wrap to hide admin notices
 */
function filter_ai_batch_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	?>
	<div class="wrap" style="display:none;"><h2></h2></div>
	<div class="filter-wrap" id="filter-ai-batch-container"></div>
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
 * Show an admin notice when no AI backend (native client or ai-services) is available.
 */
function filter_ai_no_backend_notice() {
	if ( ! current_user_can( 'activate_plugins' ) ) {
		return;
	}

	$backend = filter_ai_detect_backend(
		function_exists( 'wp_ai_client_prompt' ),
		function_exists( 'ai_services' )
	);

	if ( 'none' !== $backend ) {
		return;
	}

	$message = __( 'Filter AI needs an AI backend to work. On WordPress 7.0 or later, add an AI provider key under Settings → Connectors. On earlier versions, install and activate the AI Services plugin.', 'filter-ai' );

	printf( '<div class="notice notice-error"><p>%s</p></div>', esc_html( $message ) );
}

add_action( 'admin_notices', 'filter_ai_no_backend_notice' );

/**
 * Add setting option on plugin activation
 */
function filter_ai_activate() {
	$option_value_default = filter_ai_get_default_settings();

	if ( ! empty( $option_value_default ) ) {
		add_option( 'filter_ai_settings', $option_value_default );
	}

	if ( class_exists( 'Filter_AI_Telemetry' ) ) {
		Filter_AI_Telemetry::send_event( 'activated' );
	}
}

register_activation_hook( __FILE__, 'filter_ai_activate' );

/**
 * Fire a deactivation telemetry event.
 */
function filter_ai_deactivate() {
	if ( class_exists( 'Filter_AI_Telemetry' ) ) {
		Filter_AI_Telemetry::send_event( 'deactivated' );
	}
}

register_deactivation_hook( __FILE__, 'filter_ai_deactivate' );

/**
 * Remove setting option when the plugin in uninstalled
 */
function filter_ai_uninstall() {
	delete_option( 'filter_ai_settings' );
	delete_option( 'filter_ai_last_ai_image_alt_text_service' );
	delete_option( 'filter_ai_last_seo_meta_description_service' );
	delete_option( 'filter_ai_last_seo_title_service' );
}

register_uninstall_hook( __FILE__, 'filter_ai_uninstall' );

/**
 *  Add scripts and styles
 */
function filter_ai_enqueue_assets() {
	$backend = filter_ai_detect_backend(
		function_exists( 'wp_ai_client_prompt' ),
		function_exists( 'ai_services' )
	);
	if ( 'none' === $backend ) {
		return;
	}

	$asset_metadata = require plugin_dir_path( __FILE__ ) . 'build/index.asset.php';
	array_push( $asset_metadata['dependencies'], 'underscore', 'wp-block-editor', 'wp-core-data', 'wp-i18n', 'wp-api-fetch' );
	if ( 'legacy' === $backend ) {
		array_push( $asset_metadata['dependencies'], 'ais-ai', 'ais-settings', 'ais-components' );
	}

	wp_enqueue_script(
		'filter-ai-script',
		plugin_dir_url( __FILE__ ) . 'build/index.js',
		$asset_metadata['dependencies'],
		$asset_metadata['version'],
		[ 'strategy' => 'defer' ]
	);

	$style_deps = array( 'wp-components', 'wp-preferences' );
	if ( 'legacy' === $backend ) {
		$style_deps[] = 'ais-components';
	}

	wp_enqueue_style(
		'filter-ai-styles',
		plugin_dir_url( __FILE__ ) . 'build/index.css',
		$style_deps,
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
				'wc'           => is_plugin_active( 'woocommerce/woocommerce.php' ),
				'yoast_seo'    => is_plugin_active( 'wordpress-seo/wp-seo.php' ) || is_plugin_active( 'wordpress-seo-premium/wp-seo-premium.php' ),
				'block_editor' => method_exists( get_current_screen(), 'is_block_editor' ) && get_current_screen()->is_block_editor(),
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

	wp_add_inline_script(
		'filter-ai-script',
		'window.filter_ai_initial_settings = ' . wp_json_encode( filter_ai_get_settings() ) . ';',
		'before'
	);

	wp_add_inline_script(
		'filter-ai-script',
		'window.filter_ai_ai = ' . wp_json_encode(
			array(
				'mode'    => 'native' === $backend ? 'native' : 'legacy',
				'restUrl' => esc_url_raw( rest_url( 'filter-ai/v1' ) ),
				'nonce'   => wp_create_nonce( 'wp_rest' ),
			)
		) . ';',
		'before'
	);
}

add_action( 'admin_enqueue_scripts', 'filter_ai_enqueue_assets', -1 );

if ( function_exists( 'ai_services' ) ) {
	add_filter(
		'ai_services_request_timeout',
		function () {
			return 60;
		}
	);
}

/**
 * Add block category
 *
 * @param array[] $block_categories Array of categories for block types.
 *
 * @return array[] Returns an array containing array of categories for block types including our custom ones.
 */
function register_custom_block_category( $block_categories ) {
	return array_merge(
		$block_categories,
		[
			[
				'slug'  => 'filter-ai',
				'title' => esc_html__( 'Filter AI', 'filter-ai' ),
			],
		]
	);
}

add_filter( 'block_categories_all', 'register_custom_block_category', 10, 1 );

/**
 * Registers the blocks using the metadata loaded from the `block.json` file.
 * Behind the scenes, it registers also all assets so they can be enqueued
 * through the block editor in the corresponding context.
 *
 * @see https://developer.wordpress.org/reference/functions/register_block_type/
 */
function filter_ai_block_init() {
	register_block_type_from_metadata( __DIR__ . '/build/blocks/faq-item' );
	register_block_type_from_metadata( __DIR__ . '/build/blocks/faqs' );
	register_block_type_from_metadata( __DIR__ . '/build/blocks/summary' );
}

add_action( 'init', 'filter_ai_block_init' );

/**
 * Ignore vendor packages and external library directories when running the plugin check plugin.
 *
 * @param array[] $dirs_to_ignore An array of directories to ignore.
 *
 * @return array[] Returns an array of directories to ignore.
 */
function filter_ai_wp_plugin_check_ignore_directories( $dirs_to_ignore ) {
	return array_merge(
		$dirs_to_ignore,
		array(
			'packages',
		)
	);
}

add_filter( 'wp_plugin_check_ignore_directories', 'filter_ai_wp_plugin_check_ignore_directories', 10, 2 );
