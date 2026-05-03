<?php
/**
 * Rebrand the StellarWP Telemetry opt-in and exit-interview modals so all
 * Liquid Web / Nexcess references are replaced with Filter Digital branding.
 *
 * @package filter-ai
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Rebrand the StellarWP Telemetry opt-in and exit-interview modals.
 */
class Filter_AI_Telemetry_Modals {

	private const PLUGIN_NAME     = 'Filter AI';
	private const FILTER_HOMEPAGE = 'https://filter.agency';

	/**
	 * Register hooks that retitle the modals and tweak the rendered styles.
	 */
	public static function bootstrap(): void {
		add_filter( 'stellarwp/telemetry/optin_args', [ self::class, 'rebrand_optin' ], 10, 1 );
		add_filter( 'stellarwp/telemetry/exit_interview_args', [ self::class, 'rebrand_exit_interview' ], 10, 1 );
		add_action( 'admin_enqueue_scripts', [ self::class, 'inline_styles' ], 20 );
	}

	/**
	 * Hide the hardcoded permissions / ToS / privacy link list in the opt-in
	 * modal — those URLs aren't relevant for clients running Filter plugins.
	 */
	public static function inline_styles(): void {
		$css = '
			.stellarwp-telemetry-links { display: none !important; }
			.stellarwp-telemetry-modal__inner { width: 50% !important; }
			.stellarwp-telemetry main p,
			.stellarwp-telemetry__intro { font-size: 14px !important; line-height: 18px !important; }
		';
		wp_add_inline_style( 'stellarwp-telemetry-admin', $css );
	}

	/**
	 * Replace the StellarWP-default opt-in modal copy and branding with ours.
	 *
	 * @param array $args Args passed to the StellarWP opt-in template.
	 * @return array Filtered args.
	 */
	public static function rebrand_optin( array $args ): array {
		$args['plugin_logo']        = self::logo_url();
		$args['plugin_logo_width']  = 140;
		$args['plugin_logo_height'] = 40;
		$args['plugin_logo_alt']    = 'Filter Digital';
		$args['plugin_name']        = self::PLUGIN_NAME;
		$args['heading']            = sprintf(
			/* translators: %s: plugin name. */
			__( 'Help us improve %s.', 'filter-ai' ),
			self::PLUGIN_NAME
		);
		$args['intro']           = __( 'We\'d like you to share anonymous usage data with us so that we can keep improving our plugins. We collect your WordPress and PHP versions, locale, and which Filter plugins are active — never post content, user data, or anything personally identifiable. We will not use this data to market to you.', 'filter-ai' );
		$args['permissions_url'] = self::FILTER_HOMEPAGE . '/data-collection/';
		$args['tos_url']         = self::FILTER_HOMEPAGE . '/terms/';
		$args['privacy_url']     = self::FILTER_HOMEPAGE . '/privacy/';
		return $args;
	}

	/**
	 * Replace the StellarWP-default exit-interview modal copy and branding with ours.
	 *
	 * @param array $args Args passed to the StellarWP exit-interview template.
	 * @return array Filtered args.
	 */
	public static function rebrand_exit_interview( array $args ): array {
		$args['plugin_logo']        = self::logo_url();
		$args['plugin_logo_width']  = 140;
		$args['plugin_logo_height'] = 40;
		$args['plugin_logo_alt']    = 'Filter Digital';
		$args['heading']            = __( 'Sorry to see you go.', 'filter-ai' );
		$args['intro']              = __( 'If you have a moment, please let us know what made you deactivate the plugin.', 'filter-ai' );
		return $args;
	}

	/**
	 * Public URL of the Filter logo used in the modals.
	 *
	 * @return string Logo URL.
	 */
	private static function logo_url(): string {
		return plugins_url( 'assets/filter-logo-blue.svg', FILTER_AI_FILE );
	}
}
