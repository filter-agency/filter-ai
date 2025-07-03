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

Filter AI requires the plugin [AI Services](https://wordpress.org/plugins/ai-services/) which should be automatically installed if not already present. Once the AI Services plugin has been installed within WordPress use it to configure an API key for at least one AI service within _Settings > AI Services_.

Once Filter AI is active you should see a menu item in the admin menu which gives you access to the settings and batch capabilities.

Throughout the WordPress admin look for the Filter AI button within the content toolbars.

<img src="data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2293%22%20height%3D%22162%22%20viewBox%3D%220%200%2093%20162%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Cpath%20d%3D%22M14%20122H0V37H54V51H14V73H48V86H14V122Z%22%20fill%3D%22%23012F5F%22%2F%3E%0A%3Cpath%20d%3D%22M0%20162V150H54V162H0Z%22%20fill%3D%22%23012F5F%22%2F%3E%0A%3Cpath%20d%3D%22M85%200L82.48%205.5L77%208L82.48%2010.52L85%2016L87.5%2010.52L93%208L87.5%205.5M65%206L60%2017L49%2022L60%2027L65%2038L70%2027L81%2022L70%2017M85%2028L82.48%2033.48L77%2036L82.48%2038.5L85%2044L87.5%2038.5L93%2036L87.5%2033.48%22%20fill%3D%22%23012F5F%22%2F%3E%0A%3C%2Fsvg%3E%0A" alt="Filter AI button" style="width: 20px; background-color: white; padding: 10px" />

## About Filter

[Filter](https://filter.agency/) is a leading digital agency dedicated to creating innovative solutions that help businesses leverage technology effectively. We're deeply invested in helping businesses leverage AI effectively, developing custom solutions that solve real business challenges.

Our approach to AI focuses on practical, implementable solutions that solve real business challenges – and Filter AI embodies this philosophy perfectly. By making AI accessible within the familiar WordPress environment, we're helping content teams work more efficiently without sacrificing quality or control.

Check out our other WordPress plugin, [PersonalizeWP](https://personalizewp.com/), which allows you to display personalised content on your WordPress website using the Block Editor.
