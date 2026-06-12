<?php
/**
 * Unit tests for Filter AI error log helpers.
 *
 * @package Filter_AI
 */

use PHPUnit\Framework\TestCase;

if ( ! function_exists( 'current_user_can' ) ) {
	/**
	 * Minimal capability shim for rendering the read-only admin page.
	 *
	 * @return bool
	 */
	function current_user_can() {
		return true;
	}
}

if ( ! function_exists( 'esc_html__' ) ) {
	/**
	 * Minimal escaped translation shim.
	 *
	 * @param string $text Text to translate.
	 * @return string
	 */
	function esc_html__( $text ) {
		return htmlspecialchars( $text, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_html' ) ) {
	/**
	 * Minimal HTML escape shim.
	 *
	 * @param string $text Text to escape.
	 * @return string
	 */
	function esc_html( $text ) {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_url' ) ) {
	/**
	 * Minimal URL escape shim.
	 *
	 * @param string $url URL to escape.
	 * @return string
	 */
	function esc_url( $url ) {
		return htmlspecialchars( (string) $url, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'absint' ) ) {
	/**
	 * Minimal absint shim.
	 *
	 * @param mixed $value Value to convert.
	 * @return int
	 */
	function absint( $value ) {
		return abs( (int) $value );
	}
}

if ( ! function_exists( 'wp_unslash' ) ) {
	/**
	 * Minimal wp_unslash shim.
	 *
	 * @param mixed $value Value to unslash.
	 * @return mixed
	 */
	function wp_unslash( $value ) {
		return is_string( $value ) ? stripslashes( $value ) : $value;
	}
}

if ( ! function_exists( 'get_posts' ) ) {
	/**
	 * Minimal get_posts shim for the empty error log list.
	 *
	 * @return array
	 */
	function get_posts() {
		return array();
	}
}

/**
 * Tests for the error log model and WP_Error linking helpers.
 */
class ErrorLogTest extends TestCase {

	/**
	 * Load the module under test, failing as an assertion until it exists.
	 *
	 * @return void
	 */
	protected function setUp(): void {
		parent::setUp();

		$file = __DIR__ . '/../../includes/error-log.php';
		if ( ! file_exists( $file ) ) {
			$this->fail( 'includes/error-log.php should define the Filter AI error log helpers.' );
		}
		require_once $file;
	}

	/**
	 * Full provider response payloads must be retained for diagnosis.
	 *
	 * @return void
	 */
	public function test_payload_keeps_full_error_response(): void {
		$response = array(
			'id'      => 'msg_123',
			'type'    => 'message',
			'content' => array(
				array(
					'type'  => 'server_tool_use',
					'id'    => 'srvtoolu_123',
					'name'  => 'web_search',
					'input' => array( 'query' => 'Filter AI WordPress' ),
				),
				array(
					'type' => 'text',
					'text' => 'Generated copy',
				),
			),
		);

		$payload = filter_ai_error_log_payload(
			'legacy_provider',
			'Invalid part data.',
			array( 'response' => $response ),
			array( 'feature' => 'filter-ai-generate-content' ),
			1700000000
		);

		$this->assertSame( 'legacy_provider', $payload['source'] );
		$this->assertSame( 'Invalid part data.', $payload['message'] );
		$this->assertSame( $response, $payload['details']['response'] );
		$this->assertSame( 'filter-ai-generate-content', $payload['context']['feature'] );
		$this->assertSame( 1700000000, $payload['timestamp'] );
	}

	/**
	 * Pruning should only target logs older than one week.
	 *
	 * @return void
	 */
	public function test_prune_cutoff_keeps_at_least_one_week(): void {
		$this->assertSame( 1700000000 - WEEK_IN_SECONDS, filter_ai_error_log_cutoff_timestamp( 1700000000 ) );
	}

	/**
	 * User-facing WP errors should carry and mention the specific log URL.
	 *
	 * @return void
	 */
	public function test_wp_error_includes_log_url_in_message_and_data(): void {
		$error  = new WP_Error( 'filter_ai_generation_failed', 'Invalid part data.', array( 'status' => 502 ) );
		$linked = filter_ai_error_with_log_link( $error, 42 );

		$this->assertSame( 'filter_ai_generation_failed', $linked->get_error_code() );
		$this->assertStringContainsString( 'Invalid part data.', $linked->get_error_message() );
		$this->assertStringContainsString( 'https://example.test/wp-admin/admin.php?page=filter_ai&filter_ai_log_id=42#error_logs', $linked->get_error_message() );

		$data = $linked->get_error_data();
		$this->assertSame( 502, $data['status'] );
		$this->assertSame( 42, $data['error_log_id'] );
		$this->assertSame( 'https://example.test/wp-admin/admin.php?page=filter_ai&filter_ai_log_id=42#error_logs', $data['error_log_url'] );
	}

	/**
	 * Captured provider HTTP responses should preserve body details while redacting auth.
	 *
	 * @return void
	 */
	public function test_http_response_description_keeps_body_and_redacts_auth_headers(): void {
		$response = array(
			'response' => array(
				'code'    => 200,
				'message' => 'OK',
			),
			'headers'  => array(
				'content-type' => 'application/json',
			),
			'body'     => '{"content":[{"type":"thinking","thinking":"hidden chain"},{"type":"text","text":"Hello"}]}',
		);
		$args     = array(
			'method'  => 'POST',
			'headers' => array(
				'x-api-key'     => 'sk-ant-secret',
				'anthropic-key' => 'another-secret',
			),
		);

		$description = filter_ai_describe_http_response( $response, $args, 'https://api.anthropic.com/v1/messages' );

		$this->assertSame( 'https://api.anthropic.com/v1/messages', $description['url'] );
		$this->assertSame( 200, $description['status'] );
		$this->assertSame( 'OK', $description['response_message'] );
		$this->assertSame( 'POST', $description['method'] );
		$this->assertSame( '[redacted]', $description['request_headers']['x-api-key'] );
		$this->assertSame( '[redacted]', $description['request_headers']['anthropic-key'] );
		$this->assertSame( 'thinking', $description['body_json']['content'][0]['type'] );
		$this->assertSame( $response['body'], $description['body'] );
	}

	/**
	 * Anthropic thinking parts should not prevent usable text from being recovered.
	 *
	 * @return void
	 */
	public function test_anthropic_response_text_can_be_recovered_when_thinking_part_is_present(): void {
		$http_response = array(
			'body_json' => array(
				'content' => array(
					array(
						'type'      => 'thinking',
						'thinking'  => '',
						'signature' => 'signed-thinking',
					),
					array(
						'type' => 'text',
						'text' => 'Recovered generated text.',
					),
				),
			),
		);

		$this->assertSame( 'Recovered generated text.', filter_ai_extract_anthropic_text_from_response( $http_response ) );
	}

	/**
	 * Error log admin URLs should resolve into the Settings page tab.
	 *
	 * @return void
	 */
	public function test_error_log_settings_url_preserves_log_id(): void {
		$this->assertSame(
			'https://example.test/wp-admin/admin.php?page=filter_ai#error_logs',
			filter_ai_error_logs_settings_url()
		);
		$this->assertSame(
			'https://example.test/wp-admin/admin.php?page=filter_ai&filter_ai_log_id=42#error_logs',
			filter_ai_error_logs_settings_url( 42 )
		);
	}
}
