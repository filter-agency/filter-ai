<?php
/**
 * Unit tests for the legacy ai-services provider wrapper.
 *
 * @package Filter_AI
 */

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../includes/providers/interface-provider.php';
require_once __DIR__ . '/../../includes/providers/class-provider-aiservices.php';

/**
 * Tests for Filter_AI_Provider_AiServices.
 */
class AiServicesProviderTest extends TestCase {

	/**
	 * Legacy streaming is deliberately disabled so REST falls back to one-shot
	 * generation and avoids ai-services' provider-specific stream part parser.
	 *
	 * @return void
	 */
	public function test_streaming_reports_unsupported_for_rest_fallback(): void {
		$provider = new Filter_AI_Provider_AiServices();

		$result = $provider->stream_generate_text(
			'Write a short paragraph.',
			array(),
			'filter-ai-generate-content-paragraph',
			array( 'text_generation' )
		);

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'filter_ai_streaming_unsupported', $result->get_error_code() );
	}
}
