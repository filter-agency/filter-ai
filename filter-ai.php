<?php
  /**
   * Plugin Name: Filter AI
   * Description: Meet your digital sidekick: Filter AI, a plugin that tackles your to-do list faster than you can say 'procrastination'!
   * Version: 0.1.18
   * Author: Filter
   * Author URI: https://filter.agency
   * Text Domain: filter-ai
   * Requires Plugins: ai-services
   */

  if (!defined('ABSPATH')) {
    exit;
  }

  require_once plugin_dir_path(__FILE__) . '/vendor/woocommerce/action-scheduler/action-scheduler.php';

  require_once plugin_dir_path(__FILE__) . 'includes/batchImageAltText.php';

  function filter_ai_settings_init() {   
    $schema = array(
      'type' => 'object',
      'properties' => array(
        'image_alt_text_enabled' => array('type' => 'boolean'),
        'image_alt_text_prompt' => array('type' => 'string'),

        'post_title_enabled' => array('type' => 'boolean'),
        'post_title_prompt' => array('type' => 'string'),

        'post_excerpt_enabled' => array('type' => 'boolean'),
        'post_excerpt_prompt' => array('type' => 'string'),

        'post_tags_enabled' => array('type' => 'boolean'),
        'post_tags_prompt' => array('type' => 'string'),

        'customise_text_rewrite_enabled' => array('type' => 'boolean'),
        'customise_text_rewrite_prompt' => array('type' => 'string'),

        'customise_text_expand_enabled' => array('type' => 'boolean'),
        'customise_text_expand_prompt' => array('type' => 'string'),

        'customise_text_condense_enabled' => array('type' => 'boolean'),
        'customise_text_condense_prompt' => array('type' => 'string'),
        
        'customise_text_summarise_enabled' => array('type' => 'boolean'),
        'customise_text_summarise_prompt' => array('type' => 'string'),

        'customise_text_change_tone_enabled' => array('type' => 'boolean'),
        'customise_text_change_tone_prompt' => array('type' => 'string'),
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

  function filter_ai_add_action_links($actions) {
    $pluginLinks = array(
      '<a href="' . admin_url('admin.php?page=filter_ai') . '">Settings</a>'
    );

    return array_merge($pluginLinks, $actions);
  }

  add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'filter_ai_add_action_links');

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
  <div class="wrap" id="filter-ai-settings-container"></div>
<?php
  }

  function filter_ai_batch_page() {
    if (!current_user_can('manage_options')) {
      return;
    }

?>
  <div class="wrap" id="filter-ai-batch-container"></div>
<?php
  }

  function filter_ai_add_admin_menu() {
    add_menu_page(
      __('Filter AI Settings', 'filter_ai'),
      __('Filter AI', 'filter_ai'),
      'manage_options',
      'filter_ai',
      'filter_ai_options_page',
      'none',
      81,
    );

    add_submenu_page(
      'filter_ai',
      __('Filter AI Settings', 'filter_ai'),
      __('Settings', 'filter_ai'),
      'manage_options',
      'filter_ai',
      'filter_ai_options_page',
    );

    add_submenu_page(
      'filter_ai',
      __('Filter AI Batch Generation', 'filter_ai'),
      __('Batch Generation', 'filter_ai'),
      'manage_options',
      'filter_ai_submenu_page_batch',
      'filter_ai_batch_page',
    );
  }

  add_action('admin_menu', 'filter_ai_add_admin_menu');

  function filter_ai_enqueue_scripts() {
    if (!function_exists('ai_services')) {
      return;
    }

    $script = plugin_dir_url(__FILE__) . 'build/index.js';
    $script_metadata = require plugin_dir_path( __FILE__ ) . 'build/index.asset.php';
		array_push($script_metadata['dependencies'], 'ais-ai-store', 'underscore', 'wp-block-editor', 'wp-core-data');

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

    wp_localize_script(
      'filter-ai-script',
      'filter_ai_api',
      array(
        'url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('filter_ai_api')
      )
    );
  }
  
  add_action('admin_enqueue_scripts', 'filter_ai_enqueue_scripts', -1);

?>
