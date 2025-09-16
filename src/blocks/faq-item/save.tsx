import { __ } from '@wordpress/i18n';
import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';

type Props = {
  attributes: Record<string, string>;
};

const FAQItemSave = ({ attributes }: Props) => {
  const blockProps = useBlockProps.save(attributes);

  return (
    <div {...blockProps}>
      <details className="filter-ai-faq-item" itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
        <summary className="filter-ai-faq-item-question" itemProp="name">
          {attributes.question}
        </summary>
        <div
          className="filter-ai-faq-item-answer"
          itemScope
          itemProp="acceptedAnswer"
          itemType="https://schema.org/Answer"
        >
          <div itemProp="text">
            <InnerBlocks.Content />
          </div>
        </div>
      </details>
    </div>
  );
};

export default FAQItemSave;
