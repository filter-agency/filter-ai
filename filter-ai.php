<?php
  /**
   * Plugin Name: Filter AI
   * Description: Meet your digital sidekick: Filter AI, a plugin that tackles your to-do list faster than you can say 'procrastination'!
   * Version: 0.1.0
   * Author: Filter
   * Author URI: https://filter.agency
   * Text Domain: filter-ai
   * Requires Plugins: ai-services
   */

  if (!defined('ABSPATH')) {
    exit;
  }
?>

<?php
  function filter_ai_settings_init() {
    register_setting('filterAI', 'filter_ai_settings');
  }

  add_action('admin_init', 'filter_ai_settings_init');
?>

<?php
  function add_action_links($actions) {
    $pluginLinks = array(
      '<a href="' . admin_url('options-general.php?page=filter_ai') . '">Settings</a>'
    );

    return array_merge($pluginLinks, $actions);
  }

  add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'add_action_links');
?>

<?php
  function filter_ai_options_page() {
?>
  <div>
    <h1>Filter AI Settings</h1>
    <p>Version: <?php echo get_plugin_data(__FILE__)['Version']; ?></p>
  </div>
<?php
  }
?>

<?php
  function filter_ai_add_admin_menu() {
    add_options_page('Filter AI', 'Filter AI', 'manage_options', 'filter_ai', 'filter_ai_options_page');
  }

  add_action('admin_menu', 'filter_ai_add_admin_menu');
?>

<?php
  function filter_ai_enqueue_scripts() {
    if (!function_exists('ai_services')) {
      return;
    }

    $script = plugin_dir_url(__FILE__) . 'build/index.js';
    $script_metadata = require plugin_dir_path( __FILE__ ) . 'build/index.asset.php';
		$script_metadata['dependencies'][] = 'ais-ai-store';

    wp_enqueue_script(
      'filter-ai-script',
      $script,
      $script_metadata['dependencies'],
      get_plugin_data(__FILE__)['Version'],
      ['strategy' => 'defer']
    );

    wp_enqueue_style(
      'filter-ai-styles',
      plugin_dir_url(__FILE__) . 'build/index.css',
      array(),
      get_plugin_data(__FILE__)['Version']
    );
  }
  
  add_action('admin_enqueue_scripts', 'filter_ai_enqueue_scripts', -1);
?>
