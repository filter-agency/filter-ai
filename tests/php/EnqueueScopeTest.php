<?php
/**
 * Unit tests for filter_ai_should_enqueue_assets().
 *
 * @package Filter_AI
 */

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../includes/enqueue-scope.php';

/**
 * Pure-logic unit tests — no WordPress bootstrap needed. The helper guards
 * against missing wp_is_maintenance_mode() via function_exists, so it runs
 * cleanly outside WP. Screen objects are stdClass mocks; the helper only
 * reads ->id and ->base.
 */
class EnqueueScopeTest extends TestCase {

	/**
	 * Build a screen mock.
	 *
	 * @param string $id   Screen id.
	 * @param string $base Screen base.
	 * @return stdClass
	 */
	private function screen( string $id, string $base = '' ): stdClass {
		$s       = new stdClass();
		$s->id   = $id;
		$s->base = '' === $base ? $id : $base;
		return $s;
	}

	/**
	 * Null screen means the hook fired before get_current_screen was available.
	 */
	public function test_returns_false_for_null_screen(): void {
		$this->assertFalse( filter_ai_should_enqueue_assets( null ) );
	}

	/**
	 * Filter AI's own pages must always load the assets.
	 */
	public function test_filter_ai_settings_page_is_allowed(): void {
		$this->assertTrue(
			filter_ai_should_enqueue_assets( $this->screen( 'toplevel_page_filter_ai' ) )
		);
	}

	/**
	 * Batch Generation page is allowed.
	 */
	public function test_batch_generation_page_is_allowed(): void {
		$this->assertTrue(
			filter_ai_should_enqueue_assets(
				$this->screen( 'filter-ai_page_filter_ai_submenu_page_batch' )
			)
		);
	}

	/**
	 * The Media Library grid hosts the Generate AI Image button.
	 */
	public function test_media_library_is_allowed(): void {
		$this->assertTrue(
			filter_ai_should_enqueue_assets( $this->screen( 'upload' ) )
		);
	}

	/**
	 * The Updates screen — the exact case in the ticket — must NOT load assets.
	 */
	public function test_updates_screen_is_blocked(): void {
		$this->assertFalse(
			filter_ai_should_enqueue_assets( $this->screen( 'update-core' ) )
		);
	}

	/**
	 * Dashboard, Plugins, and other generic admin screens must not load assets.
	 */
	public function test_unrelated_screens_are_blocked(): void {
		$this->assertFalse( filter_ai_should_enqueue_assets( $this->screen( 'dashboard' ) ) );
		$this->assertFalse( filter_ai_should_enqueue_assets( $this->screen( 'plugins' ) ) );
		$this->assertFalse( filter_ai_should_enqueue_assets( $this->screen( 'themes' ) ) );
		$this->assertFalse( filter_ai_should_enqueue_assets( $this->screen( 'users' ) ) );
		$this->assertFalse( filter_ai_should_enqueue_assets( $this->screen( 'options-general' ) ) );
	}

	/**
	 * The posts/pages LIST screen has no Filter AI UI — block it.
	 */
	public function test_post_list_screen_is_blocked(): void {
		$this->assertFalse(
			filter_ai_should_enqueue_assets( $this->screen( 'edit-post', 'edit' ) )
		);
	}

	/**
	 * Post-edit screens (block + classic, any post type) all have $screen->base === 'post'.
	 */
	public function test_post_edit_screen_is_allowed(): void {
		$this->assertTrue(
			filter_ai_should_enqueue_assets( $this->screen( 'post', 'post' ) )
		);
	}

	/**
	 * Page edit screen.
	 */
	public function test_page_edit_screen_is_allowed(): void {
		$this->assertTrue(
			filter_ai_should_enqueue_assets( $this->screen( 'page', 'post' ) )
		);
	}

	/**
	 * Edit Media (attachment edit) screen — used by the classic alt-text editor.
	 */
	public function test_attachment_edit_screen_is_allowed(): void {
		$this->assertTrue(
			filter_ai_should_enqueue_assets( $this->screen( 'attachment', 'post' ) )
		);
	}

	/**
	 * WooCommerce product edit screen — used by the product description toolbar.
	 */
	public function test_woocommerce_product_edit_screen_is_allowed(): void {
		$this->assertTrue(
			filter_ai_should_enqueue_assets( $this->screen( 'product', 'post' ) )
		);
	}
}
