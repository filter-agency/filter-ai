<?php
/**
 * Plugin Name: Filter AI
 * Description: Meet your digital sidekick: Filter AI, a plugin that tackles your to-do list faster than you can say 'procrastination'!
 * Version: 1.1.0
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

require_once plugin_dir_path( __FILE__ ) . '/vendor/woocommerce/action-scheduler/action-scheduler.php';

require_once plugin_dir_path( __FILE__ ) . 'includes/batchImageAltText.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/batchSEOTitle.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/batchSEOMetaDescription.php';

/**
 *  Get option schema
 *
 * @return mixed{} Returns option schema
 */
function filter_ai_get_option_schema() {
	return array(
		'type'       => 'object',
		'properties' => array(
			'auto_alt_text_enabled'              => array( 'type' => 'boolean' ),

			'image_alt_text_enabled'             => array( 'type' => 'boolean' ),
			'image_alt_text_prompt'              => array( 'type' => 'string' ),

			'post_title_enabled'                 => array( 'type' => 'boolean' ),
			'post_title_prompt'                  => array( 'type' => 'string' ),

			'post_excerpt_enabled'               => array( 'type' => 'boolean' ),
			'post_excerpt_prompt'                => array( 'type' => 'string' ),

			'post_tags_enabled'                  => array( 'type' => 'boolean' ),
			'post_tags_prompt'                   => array( 'type' => 'string' ),

			'customise_text_rewrite_enabled'     => array( 'type' => 'boolean' ),
			'customise_text_rewrite_prompt'      => array( 'type' => 'string' ),

			'customise_text_expand_enabled'      => array( 'type' => 'boolean' ),
			'customise_text_expand_prompt'       => array( 'type' => 'string' ),

			'customise_text_condense_enabled'    => array( 'type' => 'boolean' ),
			'customise_text_condense_prompt'     => array( 'type' => 'string' ),

			'customise_text_summarise_enabled'   => array( 'type' => 'boolean' ),
			'customise_text_summarise_prompt'    => array( 'type' => 'string' ),

			'customise_text_change_tone_enabled' => array( 'type' => 'boolean' ),
			'customise_text_change_tone_prompt'  => array( 'type' => 'string' ),

			'wc_product_description_enabled'     => array( 'type' => 'boolean' ),
			'wc_product_description_prompt'      => array( 'type' => 'string' ),

			'wc_product_excerpt_enabled'         => array( 'type' => 'boolean' ),
			'wc_product_excerpt_prompt'          => array( 'type' => 'string' ),

			'yoast_seo_title_enabled'            => array( 'type' => 'boolean' ),
			'yoast_seo_title_prompt'             => array( 'type' => 'string' ),

			'yoast_seo_meta_description_enabled' => array( 'type' => 'boolean' ),
			'yoast_seo_meta_description_prompt'  => array( 'type' => 'string' ),
		),
	);
}

/**
 *  Get default option value
 *
 * @return mixed{} Returns default option value
 */
function filter_ai_get_option_value_default() {
	$options_schema = filter_ai_get_option_schema();

	$default_options = array();

	foreach ( $options_schema['properties'] as $key => $value ) {
		// we only need to setup the booleans for now
		if ( 'boolean' === $value['type'] ) {
			$default_options[ $key ] = true;
		}
	}

	return $default_options;
}

/**
 *  Register settings
 */
function filter_ai_settings_init() {
	$option_schema        = filter_ai_get_option_schema();
	$option_value_default = filter_ai_get_option_value_default();

	register_setting(
		'options',
		'filter_ai_settings',
		array(
			'type'         => 'object',
			'show_in_rest' => array(
				'schema' => $option_schema,
			),
			'default'      => $option_value_default,
		)
	);
}

add_action( 'init', 'filter_ai_settings_init' );

/**
 * Add setting option on plugin activation
 */
function filter_ai_activate() {
	$option_value_default = filter_ai_get_option_value_default();

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
 *  Add scripts and styles
 */
function filter_ai_enqueue_assets() {
	if ( ! function_exists( 'ai_services' ) ) {
		return;
	}

	$script          = plugin_dir_url( __FILE__ ) . 'build/index.js';
	$script_metadata = require plugin_dir_path( __FILE__ ) . 'build/index.asset.php';
		array_push( $script_metadata['dependencies'], 'ais-ai', 'underscore', 'wp-block-editor', 'wp-core-data', 'wp-i18n' );

	wp_enqueue_script(
		'filter-ai-script',
		$script,
		$script_metadata['dependencies'],
		get_plugin_data( __FILE__ )['Version'],
		[ 'strategy' => 'defer' ]
	);

	wp_enqueue_style( 'wp-components' );
	wp_enqueue_style( 'wp-preferences' );

	wp_enqueue_style(
		'filter-ai-styles',
		plugin_dir_url( __FILE__ ) . 'build/index.css',
		array(),
		get_plugin_data( __FILE__ )['Version']
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
}

add_action( 'admin_enqueue_scripts', 'filter_ai_enqueue_assets', -1 );
