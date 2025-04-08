<?php
  /**
   * Plugin Name: Filter AI
   * Description: Meet your digital sidekick: Filter AI, a plugin that tackles your to-do list faster than you can say 'procrastination'!
   * Version: 0.1.3
   * Author: Filter
   * Author URI: https://filter.agency
   * Text Domain: filter-ai
   * Requires Plugins: ai-services
   */

  if (!defined('ABSPATH')) {
    exit;
  }

  function filter_ai_settings_init() {   
    $schema = array(
      'type' => 'object',
      'properties' => array(
        'image_alt_text_enabled' => array('type' => 'boolean'),
        'image_alt_text_prompt' => array('type' => 'string'),
        'post_excerpt_enabled' => array('type' => 'boolean'),
        'post_excerpt_prompt' => array('type' => 'string'),
      )
    );

    register_setting(
      'options', 
      'filter_ai_settings', 
      array(
        'type' => 'object',
        'show_in_rest' => array(
          'schema' => $schema
        )
      )
    );
  }
  
  add_action('init', 'filter_ai_settings_init');

  function add_action_links($actions) {
    $pluginLinks = array(
      '<a href="' . admin_url('options-general.php?page=filter_ai') . '">Settings</a>'
    );

    return array_merge($pluginLinks, $actions);
  }

  add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'add_action_links');

  function filter_ai_options_page() {
    if (!current_user_can('manage_options')) {
      return;
    }

    try {
      ai_services()->get_available_service();
    } catch (InvalidArgumentException $e) {
      add_settings_error(
        'filter_ai_messages',
        'filter_ai_message_missing_plugin',
        __('Please activate an AI within the <a href="options-general.php?page=ais_services">AI Services</a> plugin.', 'filter_ai'),
        'warning'
      );
    }

    settings_errors('filter_ai_messages');
?>
  <div class="wrap">
    <h1>Filter AI Settings</h1>
    <div id="filter-ai-settings-container"></div>
  </div>
<?php
  }

  function filter_ai_add_admin_menu() {
    add_options_page('Filter AI', 'Filter AI', 'manage_options', 'filter_ai', 'filter_ai_options_page');
  }

  add_action('admin_menu', 'filter_ai_add_admin_menu');

  function filter_ai_enqueue_scripts() {
    if (!function_exists('ai_services')) {
      return;
    }

    $script = plugin_dir_url(__FILE__) . 'build/index.js';
    $script_metadata = require plugin_dir_path( __FILE__ ) . 'build/index.asset.php';
		array_push($script_metadata['dependencies'], 'ais-ai-store', 'underscore');

    wp_enqueue_script(
      'filter-ai-script',
      $script,
      $script_metadata['dependencies'],
      get_plugin_data(__FILE__)['Version'],
      ['strategy' => 'defer']
    );

    wp_enqueue_style('wp-components');
    wp_enqueue_style('wp-preferences');

    wp_enqueue_style(
      'filter-ai-styles',
      plugin_dir_url(__FILE__) . 'build/index.css',
      array(),
      get_plugin_data(__FILE__)['Version']
    );
  }
  
  add_action('admin_enqueue_scripts', 'filter_ai_enqueue_scripts', -1);
?>
