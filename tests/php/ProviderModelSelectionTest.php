<?php
/**
 * Unit tests for provider/model selection helpers and model catalog caching.
 *
 * @package Filter_AI
 */

use PHPUnit\Framework\TestCase;

if ( ! function_exists( 'get_option' ) ) {
	/**
	 * Minimal get_option shim for provider model cache tests.
	 *
	 * @param string $name    Option name.
	 * @param mixed  $default Default value.
	 * @return mixed
	 */
	function get_option( $name, $default = false ) {
		return isset( $GLOBALS['filter_ai_test_options'][ $name ] ) ? $GLOBALS['filter_ai_test_options'][ $name ] : $default;
	}
}

if ( ! function_exists( 'update_option' ) ) {
	/**
	 * Minimal update_option shim for provider model cache tests.
	 *
	 * @param string $name  Option name.
	 * @param mixed  $value Option value.
	 * @return bool
	 */
	function update_option( $name, $value ) {
		$GLOBALS['filter_ai_test_options'][ $name ] = $value;
		return true;
	}
}

require_once __DIR__ . '/../../includes/providers/model-selection.php';
require_once __DIR__ . '/../../includes/providers/model-catalog.php';

/**
 * Tests for provider/model selection helpers.
 */
class ProviderModelSelectionTest extends TestCase {

	/**
	 * Set up WordPress option shims used by the cache helpers.
	 *
	 * @return void
	 */
	protected function setUp(): void {
		parent::setUp();
		$GLOBALS['filter_ai_test_options'] = array();
	}

	/**
	 * The stored selection format should preserve old provider-only values and
	 * expose explicit model choices when present.
	 *
	 * @return void
	 */
	public function test_provider_model_selection_round_trips_provider_and_model(): void {
		$this->assertSame(
			array(
				'provider_slug' => null,
				'model_slug'    => null,
			),
			filter_ai_parse_provider_model_selection( '' )
		);

		$this->assertSame(
			array(
				'provider_slug' => 'anthropic',
				'model_slug'    => null,
			),
			filter_ai_parse_provider_model_selection( 'anthropic' )
		);

		$this->assertSame(
			array(
				'provider_slug' => 'anthropic',
				'model_slug'    => 'claude-opus-4',
			),
			filter_ai_parse_provider_model_selection( 'anthropic::claude-opus-4' )
		);

		$this->assertSame( 'anthropic::claude-opus-4', filter_ai_format_provider_model_selection( 'anthropic', 'claude-opus-4' ) );
		$this->assertSame( 'anthropic', filter_ai_format_provider_model_selection( 'anthropic', '' ) );
	}

	/**
	 * Capability filtering should keep provider Auto options and matching models,
	 * while excluding models that cannot satisfy the feature.
	 *
	 * @return void
	 */
	public function test_model_options_are_filtered_by_required_capabilities(): void {
		$options = array(
			array(
				'slug'          => 'anthropic',
				'provider_slug' => 'anthropic',
				'model_slug'    => '',
				'capabilities'  => array( 'text_generation', 'multimodal_input' ),
			),
			array(
				'slug'          => 'anthropic::claude-opus-4',
				'provider_slug' => 'anthropic',
				'model_slug'    => 'claude-opus-4',
				'capabilities'  => array( 'text_generation', 'multimodal_input' ),
			),
			array(
				'slug'          => 'openai::gpt-image-1',
				'provider_slug' => 'openai',
				'model_slug'    => 'gpt-image-1',
				'capabilities'  => array( 'image_generation' ),
			),
		);

		$filtered = filter_ai_filter_provider_model_options( $options, array( 'text_generation' ) );

		$this->assertSame( array( 'anthropic', 'anthropic::claude-opus-4' ), array_column( $filtered, 'slug' ) );
	}

	/**
	 * A failed refresh should retain and return the last successful catalog.
	 *
	 * @return void
	 */
	public function test_stale_catalog_is_returned_when_refresh_fails(): void {
		$cached = array(
			'backend'    => 'native',
			'fetched_at' => 1700000000,
			'options'    => array(
				array(
					'slug'          => 'anthropic::claude-opus-4',
					'provider_slug' => 'anthropic',
					'model_slug'    => 'claude-opus-4',
					'capabilities'  => array( 'text_generation' ),
				),
			),
		);

		filter_ai_store_provider_model_catalog( $cached );

		$result = filter_ai_get_provider_model_catalog(
			'native',
			static function () {
				throw new RuntimeException( 'Provider API failed.' );
			},
			true
		);

		$this->assertSame( $cached, $result );
	}
}
