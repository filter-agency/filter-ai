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
	 * Error data.
	 *
	 * @var mixed
	 */
	private $data;

	/**
	 * Constructor.
	 *
	 * @param string $code    Error code.
	 * @param string $message Error message.
	 * @param mixed  $data    Error data.
	 */
	public function __construct( $code = '', $message = '', $data = '' ) {
		$this->code    = (string) $code;
		$this->message = (string) $message;
		$this->data    = $data;
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

	/**
	 * Get the error data.
	 *
	 * @return mixed
	 */
	public function get_error_data() {
		return $this->data;
	}

	/**
	 * Set the error data.
	 *
	 * @param mixed $data Error data.
	 * @return void
	 */
	public function add_data( $data ) {
		$this->data = $data;
	}
}
