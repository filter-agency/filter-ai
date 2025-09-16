import { __ } from '@wordpress/i18n';
import { AlignmentToolbar, BlockControls, InnerBlocks, RichText, useBlockProps } from '@wordpress/block-editor';

type Attributes = Record<string, string | undefined>;

type Props = {
  attributes: Attributes;
  setAttributes: (props: Attributes) => Attributes;
};

const faqsEdit = ({ attributes, setAttributes }: Props) => {
  const blockProps = useBlockProps();

  return (
    <>
      <BlockControls>
        <AlignmentToolbar value={attributes.title_align} onChange={(value) => setAttributes({ title_align: value })} />
      </BlockControls>
      <div className="alignfull" style={{ backgroundColor: attributes.background_color }}>
        <div {...blockProps}>
          <RichText
            key="faqs-title-edit"
            value={attributes.title || ''}
            onChange={(value) => setAttributes({ title: value })}
            tagName="h2"
            placeholder={__('Frequenty Asked Questions', 'filter-ai')}
            className="filter-ai-faqs-title"
            style={{
              textAlign: attributes.title_align as React.CSSProperties['textAlign'],
              color: attributes.heading_color,
            }}
          />
          <InnerBlocks allowedBlocks={['filter-ai/faq-item']} renderAppender={InnerBlocks.ButtonBlockAppender} />
        </div>
      </div>
    </>
  );
};

export default faqsEdit;

/*
  todo
  [ ] add block sidebar settings
  * background colour
  * text colour (also updates marker colour)
  * "Generate FAQs Content" section
  ** field to enter number of faqs to create (default 5)
  [ ] disable section if settings turned off
*/
