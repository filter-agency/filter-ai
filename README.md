# Filter AI

**Filter AI** brings the power of leading AI platforms directly into the WordPress content workflow. Built on the foundation of Felix Arntz's excellent [AI Services](https://github.com/felixarntz/ai-services) plugin, Filter AI makes it simple for content teams to harness AI for everyday content tasks.

## Development

You can either clone this repository into the plugin directory `wp-content/plugins` of your local WordPress site or work on changes within a standalone directory and then build and update the plugin manually using the generated ZIP file.

### Requirements

- [Node and NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [Composer](https://getcomposer.org/download/)

### Install dependencies

`composer install`

`npm install`

Run the following once to enable [Husky](https://typicode.github.io/husky/) locally:

`npm run prepare`

### Run locally

Serve the plugin so any changes are automatically built:

`npm run start`

### Build

Type check, build the plugin and create a ZIP file:

`npm run build`

The ZIP file can now be used to install Filter AI within WordPress.

## Usage

Filter AI requires the plugin [AI Services](https://wordpress.org/plugins/ai-services/) which should be automatically installed if not already present.

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
