<?php
/**
 * Bootstraps the StellarWP telemetry library for Filter AI.
 *
 * Uses the Filter-prefixed (Strauss) namespace so multiple Filter plugins can
 * each ship their own copy without class collisions. Server URL defaults to
 * the production receiver and can be overridden via the
 * FILTER_AI_TELEMETRY_URL constant in wp-config.php for local testing.
 *
 * @package filter-ai
 */

declare(strict_types=1);

// phpcs:disable Generic.Files.OneObjectStructurePerFile.MultipleFound -- Reason: Three closely-related telemetry helper classes kept together for legibility.

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Filter_AI\Vendor\StellarWP\ContainerContract\ContainerInterface;
use Filter_AI\Vendor\StellarWP\Telemetry\Config;
use Filter_AI\Vendor\StellarWP\Telemetry\Contracts\Data_Provider;
use Filter_AI\Vendor\StellarWP\Telemetry\Core as Telemetry;
use Filter_AI\Vendor\lucatume\DI52\Container;

/**
 * Adapter so di52's Container satisfies StellarWP's ContainerInterface contract.
 * di52 already provides every required method; we just need the formal interface.
 */
final class Filter_AI_Telemetry_Container extends Container implements ContainerInterface {
}

/**
 * Minimal data provider — just the fields we actually use for the receiver UI,
 * instead of the ~60KB WP_Debug_Data dump that StellarWP sends by default.
 */
final class Filter_AI_Data_Provider implements Data_Provider {

	/**
	 * Build the telemetry payload sent on each StellarWP heartbeat.
	 *
	 * @return array Telemetry data.
	 */
	public function get_data(): array {
		global $wp_version;

		return [
			'wp_version'     => (string) $wp_version,
			'php_version'    => PHP_VERSION,
			'site_url'       => home_url(),
			'locale'         => get_locale(),
			'multisite'      => is_multisite(),
			'filter_plugins' => self::filter_plugin_versions(),
		];
	}

	/**
	 * Map of active Filter plugin slugs to their installed versions.
	 *
	 * @return array<string, string> Map of slug => version for active Filter plugins.
	 */
	private static function filter_plugin_versions(): array {
		$known = [ 'filter-abilities', 'filter-ai', 'personalize-wp' ];

		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$active = (array) get_option( 'active_plugins', [] );
		$all    = get_plugins();
		$out    = [];

		foreach ( $all as $file => $data ) {
			$slug = dirname( $file );
			if ( in_array( $slug, $known, true ) && in_array( $file, $active, true ) ) {
				$out[ $slug ] = (string) ( $data['Version'] ?? '' );
			}
		}

		return $out;
	}
}

/**
 * Bootstraps StellarWP's telemetry runtime for Filter AI and exposes a
 * fire-and-forget event POST helper for activation/deactivation hooks.
 */
class Filter_AI_Telemetry {

	private const HOOK_PREFIX  = 'filter-ai';
	private const STELLAR_SLUG = 'filter-ai';
	private const DEFAULT_URL  = 'https://telemetry.filter.agency/wp-json/filter-telemetry/v1';

	/**
	 * Initialise StellarWP's telemetry runtime and wire up our customisations.
	 */
	public static function bootstrap(): void {
		if ( ! class_exists( Telemetry::class ) ) {
			return;
		}

		Config::set_container( new Filter_AI_Telemetry_Container() );
		Config::set_server_url( self::endpoint_url() );
		Config::set_hook_prefix( self::HOOK_PREFIX );
		Config::set_stellar_slug( self::STELLAR_SLUG );

		Telemetry::instance()->init( FILTER_AI_FILE );

		// Replace StellarWP's default Debug_Data provider (~60KB per ping)
		// with our minimal one (~500 bytes).
		Config::get_container()->bind( Data_Provider::class, Filter_AI_Data_Provider::class );

		// Strip the admin's name + email from telemetry. StellarWP collects
		// these via register_user() on opt-in and re-attaches them on every
		// send as opt_in_user. We promised users anonymous data — keep it so.
		// Note the trailing slash: Config::set_hook_prefix() normalises the
		// prefix to end in '/', so the actual hook name StellarWP fires is
		// `stellarwp/telemetry/filter-ai/register_site_user_details`.
		add_filter( 'stellarwp/telemetry/' . self::HOOK_PREFIX . '/register_site_user_details', '__return_empty_array' );
		add_filter( 'option_stellarwp_telemetry_user_info', '__return_empty_array' );
		add_filter( 'default_option_stellarwp_telemetry_user_info', '__return_empty_array' );

		add_action( 'admin_notices', [ self::class, 'maybe_render_optin_modal' ] );
	}

	/**
	 * Fire-and-forget event POST to the receiver. Skips if the site hasn't
	 * registered (no token) — we only track events for opted-in sites.
	 *
	 * @param string $event_type Event identifier (e.g. 'activated', 'deactivated').
	 */
	public static function send_event( string $event_type ): void {
		$option = (array) get_option( 'stellarwp_telemetry', [] );
		$token  = $option['token'] ?? '';
		if ( ! is_string( $token ) || '' === $token ) {
			return;
		}

		$endpoint = ( defined( 'FILTER_AI_TELEMETRY_URL' ) ? rtrim( (string) FILTER_AI_TELEMETRY_URL, '/' ) : self::DEFAULT_URL ) . '/event';

		wp_remote_post(
			$endpoint,
			[
				'timeout'  => 5,
				'blocking' => false,
				'body'     => [
					'token'          => $token,
					'event_type'     => $event_type,
					'plugin_slug'    => self::STELLAR_SLUG,
					'plugin_version' => defined( 'FILTER_AI_VERSION' ) ? FILTER_AI_VERSION : '',
				],
			]
		);
	}

	/**
	 * Fires the StellarWP optin action so the library can render the modal if
	 * its own should_render() check passes (i.e. the site hasn't already opted
	 * in or dismissed it).
	 */
	public static function maybe_render_optin_modal(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		// phpcs:ignore WordPress.NamingConventions.ValidHookName.UseUnderscores -- Reason: Hook name is defined by the third-party StellarWP Telemetry library.
		do_action( 'stellarwp/telemetry/optin', self::STELLAR_SLUG );
	}

	/**
	 * Resolve the telemetry receiver URL, allowing override via constant.
	 *
	 * @return string Endpoint URL with no trailing slash.
	 */
	private static function endpoint_url(): string {
		return defined( 'FILTER_AI_TELEMETRY_URL' )
			? rtrim( (string) FILTER_AI_TELEMETRY_URL, '/' )
			: self::DEFAULT_URL;
	}
}
