<?php
/**
 * Updater functionality
 */

if ( ! class_exists( 'filter_ai_updater' ) ) {
	/**
	 * Filter AI plugin's update functionality
	 */
	class Filter_AI_Updater {
		/**
		 * Plugin slug
		 *
		 * @var string
		 */
		public $plugin_slug;

		/**
		 * Plugin version
		 *
		 * @var string
		 */
		public $version;

		/**
		 * Plugin cache key
		 *
		 * @var string
		 */
		public $cache_key;

		/**
		 * Cache flag
		 *
		 * @var boolean
		 */
		public $cache_allowed;

		/**
		 * Constructor
		 */
		public function __construct() {
			$this->plugin_slug   = 'filter-ai';
			$this->version       = get_plugin_data( FILTER_AI_PATH . '/filter-ai.php' )['Version'];
			$this->cache_key     = 'filter_ai_updater_cache';
			$this->cache_allowed = true;

			add_filter( 'plugins_api', array( $this, 'info' ), 20, 3 );
			add_filter( 'site_transient_update_plugins', array( $this, 'update' ) );
			add_filter( 'upgrader_process_complete', array( $this, 'purge' ), 10, 2 );
		}

		/**
		 * Function to request the plugin info json
		 *
		 * @return mixed Plugin info json
		 */
		public function request() {
			$remote = get_transient( $this->cache_key );

			if ( false === $remote || ! $this->cache_allowed ) {
				$remote = wp_remote_get(
					'https://github.com/filter-agency/filter-ai/raw/refs/heads/main/filter-ai.json',
					array(
						'timeout' => 10,
						'headers' => array(
							'Accept' => 'application/json',
						),
					)
				);

				if (
					is_wp_error( $remote )
					|| 200 !== wp_remote_retrieve_response_code( $remote )
					|| empty( wp_remote_retrieve_body( $remote ) )
				) {
					return false;
				}

				set_transient( $this->cache_key, $remote, DAY_IN_SECONDS );
			}

			$remote = json_decode( wp_remote_retrieve_body( $remote ) );

			return $remote;
		}

		/**
		 * Function to filter the response for the current WordPress.org plugin installation API request
		 *
		 * @param false|object|array $res The result object or array. Default false.
		 * @param string             $action The type of information being requested from the Plugin Installation API.
		 * @param object             $args Plugin API arguments.
		 */
		public function info( $res, $action, $args ) {
			// do nothing if you're not getting plugin information right now
			if ( 'plugin_information' !== $action ) {
				return $res;
			}

			// do nothing if it is not our plugin
			if ( $this->plugin_slug !== $args->slug ) {
				return $res;
			}

			// get updates
			$remote = $this->request();

			if ( ! $remote ) {
				return $res;
			}

			$res = new stdClass();

			$res->name           = $remote->name;
			$res->slug           = $remote->slug;
			$res->version        = $remote->version;
			$res->tested         = $remote->tested;
			$res->requires       = $remote->requires;
			$res->author         = $remote->author;
			$res->author_profile = $remote->author_profile;
			$res->homepage       = $remote->homepage;
			$res->download_link  = $remote->download_url;
			$res->trunk          = $remote->download_url;
			$res->requires_php   = $remote->requires_php;
			$res->last_updated   = $remote->last_updated;

			$res->sections = array(
				'description'  => $remote->sections->description,
				'installation' => $remote->sections->installation,
				'faq'          => $remote->sections->faq,
				'changelog'    => $remote->sections->changelog,
			);

			if ( ! empty( $remote->banners ) ) {
				$res->banners = array(
					'low'  => $remote->banners->low,
					'high' => $remote->banners->high,
				);
			}

			return $res;
		}

		/**
		 * Update function
		 *
		 * @param mixed $transient Value of site transient
		 *
		 * @return mixed Updated $transient
		 */
		public function update( $transient ) {
			if ( empty( $transient->checked ) ) {
				return $transient;
			}

			$remote = $this->request();

			if ( $remote ) {
				$res = new stdClass();

				$res->slug        = $this->plugin_slug;
				$res->plugin      = plugin_basename( FILTER_AI_PATH . '/filter-ai.php' );
				$res->new_version = $remote->version;
				$res->tested      = $remote->tested;
				$res->package     = $remote->download_url;

				if (
				version_compare( $this->version, $remote->version, '<' ) &&
				version_compare( $remote->requires, get_bloginfo( 'version' ), '<=' ) &&
				version_compare( $remote->requires_php, PHP_VERSION, '<' ) ) {
					$transient->response[ $res->plugin ] = $res;
				} else {
					$transient->no_update[ $res->plugin ] = $res;
				}
			}

			return $transient;
		}

		/**
		 * Purge function to clear cache after plugin has been updated
		 *
		 * @param WP_Upgrader $upgrader Plugin_Upgrader instance
		 * @param array       $options Array of bulk item update data
		 */
		public function purge( $upgrader, $options ) {
			if ( $this->cache_allowed && 'update' === $options['action'] && 'plugin' === $options['type'] ) {
				delete_transient( $this->cache_key );
			}
		}
	}

	new Filter_AI_Updater();
}
