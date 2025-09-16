import { __ } from '@wordpress/i18n';
import { InnerBlocks, RichText, useBlockProps } from '@wordpress/block-editor';

type Attributes = Record<string, string>;

type Props = {
  attributes: Attributes;
  setAttributes: (props: Attributes) => Attributes;
};

const faqItemEdit = ({ attributes, setAttributes }: Props) => {
  const blockProps = useBlockProps();

  return (
    <div {...blockProps}>
      <div className="filter-ai-faq-item">
        <div className="filter-ai-faq-item-question">
          <RichText
            key="faq-item-question-edit"
            value={attributes.question}
            onChange={(value) => setAttributes({ question: value })}
            placeholder={__('Question', 'filter-ai')}
          />
        </div>
        <div className="filter-ai-faq-item-answer">
          <InnerBlocks template={[['core/paragraph', { placeholder: __('Answer', 'filter-ai') }]]} />
        </div>
      </div>
    </div>
  );
};

export default faqItemEdit;
