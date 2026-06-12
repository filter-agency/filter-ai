<?php
/**
 * Helpers for the stored provider/model selection format.
 *
 * @package Filter_AI
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! defined( 'FILTER_AI_PROVIDER_MODEL_DELIMITER' ) ) {
	define( 'FILTER_AI_PROVIDER_MODEL_DELIMITER', '::' );
}

/**
 * Parse a stored provider/model selection.
 *
 * @param string|null $selection Stored value from a *_prompt_service setting.
 * @return array{provider_slug:?string,model_slug:?string}
 */
function filter_ai_parse_provider_model_selection( $selection ) {
	$value = trim( (string) $selection );
	if ( '' === $value ) {
		return array(
			'provider_slug' => null,
			'model_slug'    => null,
		);
	}

	$parts         = explode( FILTER_AI_PROVIDER_MODEL_DELIMITER, $value, 2 );
	$provider_slug = trim( (string) $parts[0] );
	$model_slug    = isset( $parts[1] ) ? trim( (string) $parts[1] ) : '';

	return array(
		'provider_slug' => '' !== $provider_slug ? $provider_slug : null,
		'model_slug'    => '' !== $model_slug ? $model_slug : null,
	);
}

/**
 * Format a provider/model selection for storage.
 *
 * @param string|null $provider_slug Provider slug.
 * @param string|null $model_slug    Model slug.
 * @return string
 */
function filter_ai_format_provider_model_selection( $provider_slug, $model_slug = null ) {
	$provider_slug = trim( (string) $provider_slug );
	$model_slug    = trim( (string) $model_slug );

	if ( '' === $provider_slug ) {
		return '';
	}

	if ( '' === $model_slug ) {
		return $provider_slug;
	}

	return $provider_slug . FILTER_AI_PROVIDER_MODEL_DELIMITER . $model_slug;
}

/**
 * Whether a model/provider option satisfies all required capabilities.
 *
 * @param array    $option                Provider/model option.
 * @param string[] $required_capabilities Required capability slugs.
 * @return bool
 */
function filter_ai_provider_model_option_matches_capabilities( array $option, array $required_capabilities ) {
	if ( empty( $required_capabilities ) ) {
		return true;
	}

	$capabilities = isset( $option['capabilities'] ) && is_array( $option['capabilities'] )
		? $option['capabilities']
		: array();

	return count( array_diff( $required_capabilities, $capabilities ) ) === 0;
}

/**
 * Filter provider/model options to those compatible with a feature.
 *
 * @param array[]  $options               Provider/model options.
 * @param string[] $required_capabilities Required capability slugs.
 * @return array[]
 */
function filter_ai_filter_provider_model_options( array $options, array $required_capabilities = array() ) {
	return array_values(
		array_filter(
			$options,
			static function ( $option ) use ( $required_capabilities ) {
				return is_array( $option ) && filter_ai_provider_model_option_matches_capabilities( $option, $required_capabilities );
			}
		)
	);
}

/**
 * Build the flattened option shape used by REST and the settings UI.
 *
 * @param string      $provider_slug  Provider slug.
 * @param string      $provider_label Provider display label.
 * @param string|null $model_slug     Model slug. Empty/null means provider Auto.
 * @param string|null $model_label    Model display label.
 * @param string[]    $capabilities   Supported capability slugs.
 * @param bool        $is_available   Whether this option is available.
 * @return array
 */
function filter_ai_provider_model_option( $provider_slug, $provider_label, $model_slug = null, $model_label = null, array $capabilities = array(), $is_available = true ) {
	$model_slug  = null === $model_slug ? '' : (string) $model_slug;
	$model_label = null === $model_label || '' === (string) $model_label ? __( 'Auto', 'filter-ai' ) : (string) $model_label;
	$slug        = filter_ai_format_provider_model_selection( $provider_slug, $model_slug );
	$label       = (string) $provider_label . ' - ' . $model_label;

	return array(
		'slug'           => $slug,
		'provider_slug'  => (string) $provider_slug,
		'model_slug'     => $model_slug,
		'label'          => $label,
		'metadata'       => array(
			'name' => $label,
		),
		'provider_label' => (string) $provider_label,
		'model_label'    => $model_label,
		'capabilities'   => array_values( array_unique( array_map( 'strval', $capabilities ) ) ),
		'is_available'   => (bool) $is_available,
	);
}
