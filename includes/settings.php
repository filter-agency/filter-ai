<?php
/**
 * Settings functions
 */

/**
 * Get default settings
 *
 * @return array Filter Ai settings
 */
function filter_ai_get_default_settings() {
	return array(
		'common_prompt_prefix'                      => esc_html__( 'The response should only contain the answer and in plain text, so no <br> tags for line breaks.', 'filter-ai' ),
		'common_prompt_prefix_service'              => array(
			'service' => 'openai',
			'model'   => 'gpt-4o',
			'name'    => 'OpenAI (Chat-GPT)',
		),

		'common_prompt_different'                   => esc_html__( 'Making sure it is different to the current text:', 'filter-ai' ),
		'common_prompt_different_service'           => array(
			'service' => 'openai',
			'model'   => 'gpt-4o',
			'name'    => 'OpenAI (Chat-GPT)',
		),

		'brand_voice_enabled'                       => false,
		'brand_voice_prompt'                        => '',
		'brand_voice_prompt_service'                => array(
			'service' => 'openai',
			'model'   => 'gpt-4o',
			'name'    => 'OpenAI (Chat-GPT)',
		),

		'stop_words_enabled'                        => false,
		'stop_words_prompt'                         => '',
		'stop_words_prompt_service'                 => array(
			'service' => 'openai',
			'model'   => 'gpt-4o',
			'name'    => 'OpenAI (Chat-GPT)',
		),

		'stop_words_pre_prompt'                     => esc_html__( 'Please avoid using the following words in any generated response:', 'filter-ai' ),
		'stop_words_pre_prompt_service'             => array(
			'service' => 'openai',
			'model'   => 'gpt-4o',
			'name'    => 'OpenAI (Chat-GPT)',
		),

		'image_alt_text_enabled'                    => true,
		'image_alt_text_prompt'                     => esc_html__( 'Please generate a short description no more than 50 words for the following image that can be used as its alternative text. The description should be clear, succinct, and provide a sense of what the image portrays, ensuring that it is accessible to individuals using screen readers.', 'filter-ai' ),
		'image_alt_text_prompt_service'             => array(
			'service' => 'openai',
			'model'   => 'gpt-4o',
			'name'    => 'OpenAI (Chat-GPT)',
		),

		'auto_alt_text_enabled'                     => true,
		'dynamic_add_alt_text_enabled'              => true,

		'generate_image_pre_prompt'                 => esc_html__( 'Please generate an image that is optimised for web use and is based on the following prompt:', 'filter-ai' ),
		'generate_image_pre_prompt_service'         => array(
			'service' => 'openai',
			'model'   => 'gpt-4o',
			'name'    => 'OpenAI (Chat-GPT)',
		),
		'generate_image_enabled'                    => true,

		'post_title_enabled'                        => true,
		'post_title_prompt'                         => esc_html__( 'Please generate an SEO-friendly title for this page that is between 40 and 60 characters based on the following content:', 'filter-ai' ),
		'post_title_prompt_service'                 => array(
			'service' => 'openai',
			'model'   => 'gpt-4o',
			'name'    => 'OpenAI (Chat-GPT)',
		),

		'post_excerpt_enabled'                      => true,
		'post_excerpt_prompt'                       => esc_html__( 'Please generate a summary of no more than 50 words for the following content:', 'filter-ai' ),
		'post_excerpt_prompt_service'               => array(
			'service' => 'openai',
			'model'   => 'gpt-4o',
			'name'    => 'OpenAI (Chat-GPT)',
		),

		'post_tags_enabled'                         => true,
		'post_tags_prompt'                          => esc_html__( 'Please generate a list of {{number}} words that describe specific details for the following content:', 'filter-ai' ),
		'post_tags_prompt_service'                  => array(
			'service' => 'openai',
			'model'   => 'gpt-4o',
			'name'    => 'OpenAI (Chat-GPT)',
		),

		'customise_text_rewrite_enabled'            => true,
		'customise_text_rewrite_prompt'             => esc_html__( 'Please rewrite the following {{type}} into a new version that is a similar length that maintains the core ideas but presents them in a fresh and compelling way:', 'filter-ai' ),
		'customise_text_rewrite_prompt_service'     => array(
			'service' => 'openai',
			'model'   => 'gpt-4o',
			'name'    => 'OpenAI (Chat-GPT)',
		),

		'customise_text_expand_enabled'             => true,
		'customise_text_expand_prompt'              => esc_html__( 'Please expand upon the following {{type}} into a longer version:', 'filter-ai' ),
		'customise_text_expand_prompt_service'      => array(
			'service' => 'openai',
			'model'   => 'gpt-4o',
			'name'    => 'OpenAI (Chat-GPT)',
		),

		'customise_text_condense_enabled'           => true,
		'customise_text_condense_prompt'            => esc_html__( 'Please reduce the following {{type}} into a shorter version:', 'filter-ai' ),
		'customise_text_condense_prompt_service'    => array(
			'service' => 'openai',
			'model'   => 'gpt-4o',
			'name'    => 'OpenAI (Chat-GPT)',
		),

		'customise_text_summarise_enabled'          => true,
		'customise_text_summarise_prompt'           => esc_html__( 'Please generate a summary of no more than 50 words for the following {{type}}:', 'filter-ai' ),
		'customise_text_summarise_prompt_service'   => array(
			'service' => 'openai',
			'model'   => 'gpt-4o',
			'name'    => 'OpenAI (Chat-GPT)',
		),

		'customise_text_change_tone_enabled'        => true,
		'customise_text_change_tone_prompt'         => esc_html__( 'Please rewrite the following {{type}} changing its tone to make it sound more {{tone}} while keeping it a similar length:', 'filter-ai' ),
		'customise_text_change_tone_prompt_service' => array(
			'service' => 'openai',
			'model'   => 'gpt-4o',
			'name'    => 'OpenAI (Chat-GPT)',
		),

		'wc_product_description_enabled'            => true,
		'wc_product_description_prompt'             => esc_html__( 'Please generate a description based on the following product information:', 'filter-ai' ),
		'wc_product_description_prompt_service'     => array(
			'service' => 'openai',
			'model'   => 'gpt-4o',
			'name'    => 'OpenAI (Chat-GPT)',
		),

		'wc_product_excerpt_enabled'                => true,
		'wc_product_excerpt_prompt'                 => esc_html__( 'Please generate a summary of no more than 50 words based on the following product information:', 'filter-ai' ),
		'wc_product_excerpt_prompt_service'         => array(
			'service' => 'openai',
			'model'   => 'gpt-4o',
			'name'    => 'OpenAI (Chat-GPT)',
		),

		'yoast_seo_title_enabled'                   => true,
		'yoast_seo_title_prompt'                    => esc_html__( 'Please generate an SEO-friendly title for this page that is between 40 and 60 characters based on the following content:', 'filter-ai' ),
		'yoast_seo_title_prompt_service'            => array(
			'service' => 'openai',
			'model'   => 'gpt-4o',
			'name'    => 'OpenAI (Chat-GPT)',
		),

		'yoast_seo_title_pre_prompt'                => esc_html__( 'Please provide 5 options separated by 2 pipes "||", do not return anything other than your answer.', 'filter-ai' ),
		'yoast_seo_title_pre_prompt_service'        => array(
			'service' => 'openai',
			'model'   => 'gpt-4o',
			'name'    => 'OpenAI (Chat-GPT)',
		),

		'yoast_seo_meta_description_enabled'        => true,
		'yoast_seo_meta_description_prompt'         => esc_html__( 'Please generate an SEO-friendly description for this page that is between 120 and 150 characters based on the following content:', 'filter-ai' ),
		'yoast_seo_meta_description_prompt_service' => array(
			'service' => 'openai',
			'model'   => 'gpt-4o',
			'name'    => 'OpenAI (Chat-GPT)',
		),
	);
}

/**
 * Get Filter AI settings
 *
 * @return array Filter Ai settings
 */
function filter_ai_get_settings() {
	$default_settings = filter_ai_get_default_settings();

	return get_option( 'filter_ai_settings', $default_settings );
}

/**
 *  Get default option value
 *
 * @return mixed{} Returns default option value
 */
function filter_ai_get_option_schema_properties() {
	$schema           = array();
	$default_settings = filter_ai_get_default_settings();

	foreach ( $default_settings as $key => $value ) {
		if ( is_array( $value ) && isset( $value['service'] ) && isset( $value['model'] ) ) {
			$schema[ $key ] = array(
				'type'       => 'object',
				'properties' => array(
					'service' => array( 'type' => 'string' ),
					'model'   => array( 'type' => 'string' ),
					'name'    => array( 'type' => 'string' ),
				),
			);
		} else {
			$schema[ $key ] = array( 'type' => gettype( $value ) );
		}
	}

	return $schema;
}

/**
 *  Register settings
 */
function filter_ai_settings_init() {
	$properties       = filter_ai_get_option_schema_properties();
	$default_settings = filter_ai_get_default_settings();

	register_setting(
		'options',
		'filter_ai_settings',
		array(
			'type'         => 'object',
			'show_in_rest' => array(
				'schema' => array(
					'type'       => 'object',
					'properties' => $properties,
				),
			),
			'default'      => $default_settings,
		)
	);
}

add_action( 'init', 'filter_ai_settings_init' );

/**
 * Filters the value of Filter AI settings option
 *
 * @param mixed $option Value of the option
 *
 * @return mixed New value of the option
 */
function filter_ai_pre_filter_option( $option ) {
	$default_settings = filter_ai_get_default_settings();

	$merge = array();

	foreach ( $default_settings as $key => $value ) {
		if ( gettype( $value ) === 'boolean' ) {
			$merge[ $key ] = isset( $option[ $key ] ) ? $option[ $key ] : $value;
		} else {
			$merge[ $key ] = ! empty( $option[ $key ] ) ? $option[ $key ] : $value;
		}
	}

	return $merge;
}

add_filter( 'option_filter_ai_settings', 'filter_ai_pre_filter_option' );

/**
 * Get prompt
 *
 * @param string $key Key for the prompt
 *
 * @throws Exception If $key doesn't exist within settings
 *
 * @return string Prompt text
 */
function filter_ai_get_prompt( $key ) {
	$settings = filter_ai_get_settings();

	if ( empty( $settings[ $key ] ) ) {
		throw new Exception( esc_html__( 'There is was an issue retrieving the prompt.', 'filter-ai' ) );
	}

	$prompt = $settings[ $key ];

	$pre_prompt = ! empty( $settings['common_prompt_prefix'] ) ? $settings['common_prompt_prefix'] : '';

	$stop_words_prompt = ! empty( $settings['stop_words_prompt'] ) && ! empty( $settings['stop_words_pre_prompt'] ) ? $settings['stop_words_pre_prompt'] . ' ' . $settings['stop_words_prompt'] : '';

	$brand_voice_prompt = ! empty( $settings['brand_voice_prompt'] ) ? $settings['brand_voice_prompt'] : '';

	return $pre_prompt . ' ' . $brand_voice_prompt . ' ' . $stop_words_prompt . ' ' . $prompt;
}
