<?php
/**
 * Handles setting up a base for all subscribers.
 *
 * @package Filter_AI\Vendor\StellarWP\Telemetry\Contracts
 */

namespace Filter_AI\Vendor\StellarWP\Telemetry\Contracts;

use Filter_AI\Vendor\StellarWP\ContainerContract\ContainerInterface;

/**
 * Class Abstract_Subscriber
 *
 * @package Filter_AI\Vendor\StellarWP\Telemetry\Contracts
 */
abstract class Abstract_Subscriber implements Subscriber_Interface {

	/**
	 * @var ContainerInterface
	 */
	protected $container;

	/**
	 * Constructor for the class.
	 *
	 * @param ContainerInterface $container The container.
	 */
	public function __construct( ContainerInterface $container ) {
		$this->container = $container;
	}
}
