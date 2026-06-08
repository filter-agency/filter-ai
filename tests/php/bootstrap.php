<?php
/**
 * PHPUnit bootstrap file for pure-logic unit tests.
 *
 * Defines ABSPATH so that includes/*.php guards
 * (`if ( ! defined( 'ABSPATH' ) ) exit;`) pass when
 * testing outside WordPress.
 *
 * @package Filter_AI
 */

// Allow includes/*.php guards (`if ( ! defined( 'ABSPATH' ) ) exit;`) to pass
// when unit-testing pure-logic files outside WordPress.
define( 'ABSPATH', __DIR__ . '/' );

require_once __DIR__ . '/../../vendor/autoload.php';
