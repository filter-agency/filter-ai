# Filter AI

**Filter AI** brings the power of leading AI platforms directly into the WordPress content workflow. It uses the native WordPress AI Client on WordPress 7.0 and later, and falls back to Felix Arntz's excellent [AI Services](https://github.com/felixarntz/ai-services) plugin on earlier WordPress versions, making it simple for content teams to harness AI for everyday content tasks.

## Release Notes

### 1.8.0

#### Added

- Choose a specific AI model for each provider directly from the feature settings. Provider selections now include model-aware options such as `Anthropic (Claude) - Auto`, `Anthropic (Claude) - Claude Opus`, and `Anthropic (Claude) - Claude Haiku`.
- Keep using automatic model selection from the same `AI Provider / Model` dropdown by choosing a provider's `Auto` option, such as `Anthropic (Claude) - Auto`.
- Refresh available provider models daily and cache the last successful model catalogue, keeping stale model options visible if a refresh fails.

#### Fixed

- Prevent unsupported AI features from being enabled when no configured provider can handle the required capability, such as image generation with text-only providers.
- Move AI error logs into the Settings screen and improve admin links so failed requests are easier to review.
- Avoid queueing a brand voice scan when a brand voice prompt has already been filled.
- Improve compatibility with Anthropic responses from AI Services when tool or thinking response parts are present.

## Development

You can either clone this repository into the plugin directory `wp-content/plugins` of your local WordPress site or work on changes within a standalone directory and then build and update the plugin manually using the generated ZIP file.

### Requirements

- [Node and NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [Composer](https://getcomposer.org/download/)

### Install dependencies

```
composer install
```

`npm install` and `npm run build` are run afterwards automatically.

### Husky

Run the following once to enable [Husky](https://typicode.github.io/husky/) locally:

```
npm run prepare
```

### Run locally

Serve the plugin so any changes are automatically built:

```
npm run start
```

### Build

Type check, and build the plugin:

```
npm run build
```

### ZIP

To package the plugin so it can be installed within WordPress:

```
npm run plugin-zip
```

## Usage

Filter AI uses the native WordPress AI Client when running on WordPress 7.0 or later with configured AI provider connectors. On earlier WordPress versions, Filter AI uses the [AI Services](https://wordpress.org/plugins/ai-services/) plugin, which should be automatically installed if not already present.

Once Filter AI is active you should see a menu item in the admin menu which gives you access to the settings and batch capabilities.

Throughout the WordPress admin look for the Filter AI button within the content toolbars.

<img src="src/assets/filter-ai-logo.svg" alt="Filter AI button" style="width: 20px; background-color: white; padding: 10px" />

## Feedback

We welcome feedback whether you have a question, found a bug or thought of a great new feature. Please [open an issue](https://github.com/filter-agency/filter-ai/issues/new) to let us know.

## Contributing

First off, thank you for your interest in contributing to Filter AI.

If you do decide to contribute to this plugin, please abide by the [WordPress Code of Conduct](https://make.wordpress.org/handbook/community-code-of-conduct/) and follow the [WordPress Coding Standards and best practices](https://developer.wordpress.org/coding-standards/). Anything that you do submit will be released under the [GPLv3 license](LICENSE).

When you commit a change, Husky will run the following:

- WordPress coding standards check
- type check
- lint-staged will prettify the staged files

## About Filter

[Filter](https://filter.agency/) is a leading digital agency dedicated to creating innovative solutions that help businesses leverage technology effectively. We're deeply invested in helping businesses leverage AI effectively, developing custom solutions that solve real business challenges.

Our approach to AI focuses on practical, implementable solutions that solve real business challenges – and Filter AI embodies this philosophy perfectly. By making AI accessible within the familiar WordPress environment, we're helping content teams work more efficiently without sacrificing quality or control.

Check out our other WordPress plugin, [PersonalizeWP](https://personalizewp.com/), which allows you to display personalised content on your WordPress website using the Block Editor.
