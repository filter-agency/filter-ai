import { __ } from '@wordpress/i18n';
import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';

const FAQsSave = (props) => {
  const { faqsState } = props.attributes;

  const blockProps = useBlockProps.save({
    className: 'filter-ai-faqs-container filter-ai-generate-faq-js',
  });

  return (
    <div {...blockProps} data-filter-ai-faqs-items-initial-state={faqsState}>
      <InnerBlocks.Content />
    </div>
  );
};

export default FAQsSave;
