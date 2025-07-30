=== Filter AI === 
Contributors: filterdigital, paulfhalfpenny, ianharrisfilter, davecpage
Tags: ai, content generation, artificial intelligence, openai, anthropic
Requires at least: 6.3 
Tested up to: 6.8
Stable tag: 1.3.0
Requires PHP: 7.4 
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0.html

Powerful AI content creation tools integrated directly into your WordPress editor for effortless content generation.

== Description ==

**Filter AI** brings the power of leading AI platforms directly into your WordPress content workflow. Built on the foundation of Felix Arntz's excellent AI Services plugin, Filter AI makes it simple for content teams to harness AI for everyday content tasks.

This free plugin integrates seamlessly with WordPress to help content admins:

* Generate compelling ALT text for images
* Create engaging titles and headings
* Write introductions and conclusions
* Create WooCommerce Product Descriptions
* Rewrite and improve existing content
* Summarise long-form content
* Get content ideas and inspiration

You bring your own API key from any AI platform supported by AI Services (such as OpenAI, Anthropic, or Gemini), giving you complete control over your AI usage and spending.

### Key Features:

* **Full Block Editor Integration** - Access AI tools right where you need them in the WordPress block editor
* **Customisable Prompts** - Tailor AI prompts to match your brand voice and content guidelines
* **Multiple AI Services** - Works with OpenAI, Anthropic, Gemini, and other providers supported by AI Services
* **Budget Control** - Bring your own API key and manage spending limits
* **Time-Saving Tools** - Automate routine content tasks while maintaining creative control
* **Easy to Use** - Intuitive interface designed for content creators, not developers

From writing titles to rewriting paragraphs, Filter AI takes care of the busy work – so you can focus on the big ideas.

== Installation ==
1. Upload the `filter-ai` folder to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to Settings > Filter AI to configure your API key
4. Start using AI content tools in the block editor

### Required Dependencies:

* [AI Services](https://wordpress.org/plugins/ai-services/) plugin - Will be automatically installed if not present

== Frequently Asked Questions ==

= Do I need to provide my own API key? =

Yes, Filter AI requires an API key from one of the supported AI services (OpenAI, Anthropic, or Gemini). This approach gives you complete control over your AI usage and spending. You can obtain an API key by signing up at the respective service's website.

= Is the plugin free to use? =

Yes, the Filter AI plugin is completely free to use. You only pay for the AI service API usage according to the provider's pricing model.

= Can I customise the AI prompts? =

Absolutely! Filter AI allows you to customise the AI prompts for each generation tool. This means you can tailor the AI outputs to match your brand voice, content guidelines, or specific requirements.

= Which AI services are supported? =

Filter AI works with any AI service supported by the AI Services plugin, including OpenAI (GPT models), Anthropic (Claude models), and Google's Gemini. As AI Services adds support for more providers, Filter AI will support them too.

= How do I control costs when using AI services? =

Since you bring your own API key, you can set spending limits directly with your AI service provider. Additionally, Filter AI is designed to use tokens efficiently, and you can adjust the length and complexity of content generated to manage costs.

= Is Filter AI compatible with my theme or other plugins? =

Filter AI is designed to work with the WordPress block editor (Gutenberg) and should be compatible with most modern WordPress themes and plugins. If you encounter any compatibility issues, please let us know in the support forum.

= Where can I get support? =

If you need help with Filter AI, you can visit our support forum or [contact us directly](https://filter.agency/contact/).

== Screenshots ==

1. Filter AI integration in the block editor
2. Settings page with AI service configuration
3. Generating ALT text for images
4. Creating content with customised prompts
5. Rewriting existing content with AI assistance

== Changelog ==

= 1.3.0 =

**Enhancements:**

* Custom image generation
* Dynamically replace missing alt text
* Automatic plugin updates

= 1.2.2 =

**Bug fixes:**

* Standardise location of composer/package files for WooCommerce Action Scheduler


= 1.2.1 =

**Enhancements:**

* Update Github actions to automatically trigger on releases
* Update composer setup to support releasing onto Packagist.org


= 1.2.0 =

**Enhancements:**

* Add features to generate Yoast SEO title and meta descriptions including batch generation
* Add feature to generate image ALT text on upload
* Add option to add stop words to the AI prompt
* Add option to add a brand voice to the AI prompt
* Generating modal UI improvements

**Bug fixes:**

* Update settings page features to respond to status of required plugins
* Code stability improvements


= 1.1.0 =

**Enhancements:**

* Improved text generation prompts for AI requests
* Settings screen UX improvement
* Improved compatibility with AI Services plugin
* Improved general database performance when batch updating images
* Decreased timeout issues arising from batch updating images

**Bug fixes:**

* Correct link to edit an image that doesn't have its alt text updated during batching


= 1.0.0 =

* Initial public release of Filter AI

== Upgrade Notice ==

= 1.0.0 = First public release of Filter AI - install now to enhance your WordPress content creation workflow with AI tools.

== About Filter ==

[Filter](https://filter.agency/) is a leading digital agency dedicated to creating innovative solutions that help businesses leverage technology effectively. We're deeply invested in helping businesses leverage AI effectively, developing custom solutions that solve real business challenges.

Our approach to AI focuses on practical, implementable solutions that solve real business challenges – and Filter AI embodies this philosophy perfectly. By making AI accessible within the familiar WordPress environment, we're helping content teams work more efficiently without sacrificing quality or control.

Check out our other WordPress plugin, [PersonalizeWP](https://personalizewp.com/), which allows you to display personalised content on your WordPress website using the Block Editor.

