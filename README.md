# Filter AI

A WordPress plugin containing AI tools.

## Requirements

This plugin requires the plugin [AI Services](https://wordpress.org/plugins/ai-services/).

Once AI Services has been installed navigate to `Settings > AI Services` and configure an API key for at least one AI service.

## Development

You can either add this repository directly into the plugin directory `wp-content/plugins` of your local WordPress site or work on changes within a standalone directory and then build and update the plugin manually using the generated zip file.

Install dependencies.

`npm install`

Serve the plugin so any changes are automatically built.

`npm run start`

Typecheck, build the plugin and create a zip file. This command is also run automatically prior to committing.

`npm run build`

## Further reading

[WordPress Gutenberg Package Reference Guide](https://developer.wordpress.org/block-editor/reference-guides/packages/)

[WordPress Gutenberg Components Storybook](https://wordpress.github.io/gutenberg/)

[WordPress Gutenberg Packages GitHub](https://github.com/WordPress/gutenberg/tree/trunk/packages)

[AI Services Plugin Documentation](https://github.com/felixarntz/ai-services/blob/main/docs/Accessing-AI-Services-in-JavaScript.md)
