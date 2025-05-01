<?php

use Felix_Arntz\AI_Services\Services\API\Enums\AI_Capability;
use Felix_Arntz\AI_Services\Services\API\Enums\Content_Role;
use Felix_Arntz\AI_Services\Services\API\Types\Content;
use Felix_Arntz\AI_Services\Services\API\Types\Parts;
use Felix_Arntz\AI_Services\Services\API\Helpers;

function filter_ai_mime_types() {
  $post_mime_types = array(
    'image/png',
    'image/gif',
    'image/webp',
    'image/jpeg'
  );

  return implode(',', $post_mime_types);
}

function filter_ai_get_images() {
  $args = array(
    'post_type' => 'attachment',
    'post_mime_type' => filter_ai_mime_types(),
    'posts_per_page' => -1,
    'post_status' => 'inherit'    
  );

  return get_posts($args);
}

function filter_ai_get_images_without_alt_text() {
  $args = array(
    'post_type' => 'attachment',
    'post_mime_type' => filter_ai_mime_types(),
    'posts_per_page' => -1,
    'post_status' => 'inherit',
    'meta_query' => array(
      'relation' => 'OR',
      array(
        'key' => '_wp_attachment_image_alt',
        'value' => '',
        'compare' => 'NOT EXISTS',
      ),
      array(
        'key' => '_wp_attachment_image_alt',
        'value' => '',
        'compare' => '='
      )
    )      
  );

  return get_posts($args);
}

function filter_ai_process_batch_image_alt_text($imageId) {
  $imageAltText = get_post_meta($imageId, '_wp_attachment_image_alt', true);
  $imageUrl = wp_get_attachment_image_url($imageId);
  $imageMimeType = get_post_mime_type($imageId);

  if (!empty($imageAltText)) {
    return;
  }
  
  if(empty($imageUrl)) {
    throw new Exception('Missing image url');
  }

  if (empty($imageMimeType)) {
    throw new Exception('Missing image mime type');
  }

  $required_capabilities = array(
    'capabilities' => array(
      AI_Capability::MULTIMODAL_INPUT,
      AI_Capability::TEXT_GENERATION
    )
  );

  if (ai_services()->has_available_services($required_capabilities) == false) {
    throw new Exception('AI service not available');
  }

  $service = ai_services()->get_available_service($required_capabilities);

  $parts = new Parts();

  $prompt = 'Please generate a short description no more than 50 words for the following image that can be used as its alternative text. The description should be clear, succinct, and provide a sense of what the image portrays, ensuring that it is accessible to individuals using screen readers.';

  $settings = get_option('filter_ai_settings');

  if (!empty($settings['image_alt_text_prompt'])) {
    $prompt = $settings['image_alt_text_prompt'];
  }

  $parts->add_text_part($prompt);

  $imageData = file_get_contents($imageUrl);
  $imageBase64 = 'data:' . $imageMimeType . ';base64,' . base64_encode($imageData);

  $parts->add_file_data_part($imageMimeType, $imageBase64);

  $content = new Content(Content_Role::USER, $parts);

  $candidates = $service->get_model(
    array(
      'feature' => 'filter-ai-image-alt-text',
      $required_capabilities
    )
  )->generate_text($content);

  $text = Helpers::get_text_from_contents(
    Helpers::get_candidate_contents($candidates)
  );

  if (empty($text)) {
    throw new Exception('Issue generating alt text');
  }
  
  update_post_meta($imageId, '_wp_attachment_image_alt', $text);
}

add_action('filter_ai_batch_image_alt_text', 'filter_ai_process_batch_image_alt_text');

function filter_ai_reset_batch_image_alt_text() {
  $actions = as_get_scheduled_actions(
    array(
      'hook' => 'filter_ai_batch_image_alt_text',
      'group' => 'filter-ai-current',
      'per_page' => 1
    ),
    'ids'
  );

  $inProgressActions = as_get_scheduled_actions(
    array(
      'hook' => 'filter_ai_batch_image_alt_text',
      'status' => array(
        ActionScheduler_Store::STATUS_PENDING, 
        ActionScheduler_Store::STATUS_RUNNING, 
        ActionScheduler_Store::STATUS_CANCELED
      ),
      'group' => 'filter-ai-current',
      'per_page' => 1
    ),
    'ids'
  );

  if (!empty($actions) && empty($inProgressActions)) {
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
        'filter_ai_batch_image_alt_text',
        'filter-ai-current'
      )
    );
  }
}

function filter_ai_api_batch_image_alt_text() {
  check_ajax_referer('filter_ai_api', 'nonce');

  filter_ai_reset_batch_image_alt_text();

  $images = filter_ai_get_images_without_alt_text();
     
  if (!empty($images)) {
    foreach($images as $image) {
      // call action through a scheduled action
      as_enqueue_async_action(
        'filter_ai_batch_image_alt_text',
        array($image->ID),
        'filter-ai-current'
      );

      // call action instantly (user needs to stay on the page)
      // do_action('filter_ai_batch_image_alt_text', $image->ID);
    }
  }

  wp_send_json_success();
}

add_action('wp_ajax_filter_ai_api_batch_image_alt_text', 'filter_ai_api_batch_image_alt_text');

function filter_ai_get_last_log_for_action_id($actionId) {
  if (!isset($actionId)) {
    return null;
  }

  global $wpdb;

  $log = null;

  try {
    $log = $wpdb->get_row(
      $wpdb->prepare(
        "SELECT `message` FROM {$wpdb->prefix}actionscheduler_logs
        WHERE action_id = %s
        ORDER BY log_date_gmt DESC
        LIMIT 1",
        $actionId  
      )
    );
  } catch(Exception $e) {}

  return $log;
}

function filter_ai_api_get_image_count() {
  check_ajax_referer('filter_ai_api', 'nonce');
  
  $actions = as_get_scheduled_actions(
    array(
      'hook' => 'filter_ai_batch_image_alt_text',
      'group' => 'filter-ai-current',
      'per_page' => -1
    ),
    'ids'
  );

  $pendingActions = as_get_scheduled_actions(
    array(
      'hook' => 'filter_ai_batch_image_alt_text',
      'status' => ActionScheduler_Store::STATUS_PENDING,
      'group' => 'filter-ai-current',
      'per_page' => -1
    ),
    'ids'
  );

  $runningActions = as_get_scheduled_actions(
    array(
      'hook' => 'filter_ai_batch_image_alt_text',
      'status' => ActionScheduler_Store::STATUS_RUNNING,
      'group' => 'filter-ai-current',
      'per_page' => -1
    ),
    'ids'
  );

  $completeActions = as_get_scheduled_actions(
    array(
      'hook' => 'filter_ai_batch_image_alt_text',
      'status' => ActionScheduler_Store::STATUS_COMPLETE,
      'group' => 'filter-ai-current',
      'per_page' => -1
    ),
    'ids'
  );

  $canceledActions = as_get_scheduled_actions(
    array(
      'hook' => 'filter_ai_batch_image_alt_text',
      'status' => ActionScheduler_Store::STATUS_CANCELED,
      'group' => 'filter-ai-current',
      'per_page' => -1
    ),
    'ids'
  );

  $failedActionsRaw = as_get_scheduled_actions(
    array(
      'hook' => 'filter_ai_batch_image_alt_text',
      'status' => ActionScheduler_Store::STATUS_FAILED,
      'group' => 'filter-ai-current',
      'per_page' => -1
    ),
    'OBJECT'
  );

  $failedActions = array();

  if (!empty($failedActionsRaw)) {
    foreach($failedActionsRaw as $actionId => $action) {
      $log = filter_ai_get_last_log_for_action_id($actionId);
      $message = explode(': ', $log->message);

      $failedActions[] = array(
        'image_id' => $action->get_args()[0],
        'message' => end($message)
      );
    }
  }

  wp_send_json_success(
    array(
      'images_count' => count(filter_ai_get_images()),
      'images_without_alt_text_count' => count(filter_ai_get_images_without_alt_text()),
      'actions_count' => count($actions),
      'pending_actions_count' => count($pendingActions),
      'running_actions_count' => count($runningActions),
      'complete_actions_count' => count($completeActions),
      'canceled_actions_count' => count($canceledActions),
      'failed_actions_count' => count($failedActions),
      'failed_actions' => $failedActions
    )
  );
}

add_action('wp_ajax_filter_ai_api_get_image_count', 'filter_ai_api_get_image_count');

function filter_ai_api_cancel_batch_image_alt_text() {
  check_ajax_referer('filter_ai_api', 'nonce');

  as_unschedule_all_actions('filter_ai_batch_image_alt_text');

  wp_send_json_success();
}

add_action('wp_ajax_filter_ai_api_cancel_batch_image_alt_text', 'filter_ai_api_cancel_batch_image_alt_text');

?>