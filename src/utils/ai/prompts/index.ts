export const prompts = {
  common: {
    different: 'Making sure it is different to the current text:',
    prefix: 'The response should only contain the answer and in plain text, so no <br> tags for line breaks.',
  },

  brand_voice_prompt: '',

  stop_words_pre_prompt: 'Please avoid using the following words in any generated response:',
  stop_words_prompt: '',

  image_alt_text_prompt:
    'Please generate a short description no more than 50 words for the following image that can be used as its alternative text. The description should be clear, succinct, and provide a sense of what the image portrays, ensuring that it is accessible to individuals using screen readers.',

  post_title_prompt:
    'Please generate an SEO-friendly title for this page that is between 40 and 60 characters based on the following content:',
  post_excerpt_prompt: 'Please generate a summary of no more than 50 words for the following content:',
  post_tags_prompt:
    'Please generate a list of {{number}} words that describe specific details for the following content:',

  customise_text_rewrite_prompt:
    'Please rewrite the following {{type}} into a new version that is a similar length that maintains the core ideas but presents them in a fresh and compelling way:',
  customise_text_expand_prompt: 'Please expand upon the following {{type}} into a longer version:',
  customise_text_condense_prompt: 'Please reduce the following {{type}} into a shorter version:',
  customise_text_summarise_prompt: 'Please generate a summary of no more than 50 words for the following {{type}}:',
  customise_text_change_tone_prompt:
    'Please rewrite the following {{type}} changing its tone to make it sound more {{tone}} while keeping it a similar length:',

  wc_product_description_prompt: 'Please generate a description based on the following product information:',

  wc_product_excerpt_prompt:
    'Please generate a summary of no more than 50 words based on the following product information:',

  yoast_seo_title_prompt:
    'Please generate an SEO-friendly title for this page that is between 40 and 60 characters based on the following content:',

  yoast_seo_meta_description_prompt:
    'Please generate an SEO-friendly description for this page that is between 120 and 150 characters based on the following content:',
};
