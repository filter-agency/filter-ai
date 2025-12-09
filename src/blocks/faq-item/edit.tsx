import { __ } from '@wordpress/i18n';
import { AlignmentToolbar, BlockControls, InnerBlocks, RichText, useBlockProps } from '@wordpress/block-editor';
import { useEffect } from '@wordpress/element';

type Attributes = Record<string, any>;

type Props = {
  attributes: Attributes;
  setAttributes: (props: Attributes) => Attributes;
  context: any;
};

const faqItemEdit = ({ attributes, setAttributes, context }: Props) => {
  const blockProps = useBlockProps();

  useEffect(() => {
    setAttributes({ headingColor: context['filter-ai/faqs/heading-color'] });
  }, [setAttributes, context]);

  return (
    <>
      <BlockControls>
        <AlignmentToolbar
          value={attributes.questionAlign}
          onChange={(value) => setAttributes({ questionAlign: value })}
        />
      </BlockControls>
      <div {...blockProps}>
        <div className="filter-ai-faq-item">
          <div className="filter-ai-faq-item-question">
            <RichText
              key="faq-item-question-edit"
              value={attributes.question}
              onChange={(value) => setAttributes({ question: value })}
              placeholder={__('Question', 'filter-ai')}
              tagName="h3"
              style={{
                textAlign: attributes.questionAlign as React.CSSProperties['textAlign'],
              }}
            />
          </div>
          <div className="filter-ai-faq-item-answer">
            <div>
              <InnerBlocks template={[['core/paragraph', { placeholder: __('Answer', 'filter-ai') }]]} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default faqItemEdit;
