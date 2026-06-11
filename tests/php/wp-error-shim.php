<?php
/**
 * Minimal WP_Error shim for provider tests outside WordPress.
 *
 * @package Filter_AI
 */

if ( class_exists( 'WP_Error' ) ) {
	return;
}

/**
 * Minimal WP_Error shim for provider tests outside WordPress.
 */
class WP_Error {

	/**
	 * Error code.
	 *
	 * @var string
	 */
	private $code;

	/**
	 * Error message.
	 *
	 * @var string
	 */
	private $message;

	/**
	 * Constructor.
	 *
	 * @param string $code    Error code.
	 * @param string $message Error message.
	 */
	public function __construct( $code = '', $message = '' ) {
		$this->code    = (string) $code;
		$this->message = (string) $message;
	}

	/**
	 * Get the error code.
	 *
	 * @return string
	 */
	public function get_error_code() {
		return $this->code;
	}

	/**
	 * Get the error message.
	 *
	 * @return string
	 */
	public function get_error_message() {
		return $this->message;
	}
}
