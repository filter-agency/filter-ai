<?php
/**
 * Generate FAQ markup
 *
 * @package FilterAI\Blocks\GenerateFAQ
 *
 * @var array    $attributes         Block attributes.
 * @var string   $content            Block content.
 * @var WP_Block $block              Block instance.
 */

$the_content = $content ? $content : $attributes['innerContent'];
$faq_state   = $attributes['faqState'];
$block_attr  = array(
	'class' => 'flow',
);


?>

<div <?php echo get_block_wrapper_attributes( $block_attr ); // phpcs:ignore ?>>
	<details class="wp-block-details flow">
		<summary><?php the_title(); ?></summary>
		<?php echo wp_kses_post( $the_content ); ?>
	</details>
</div>
