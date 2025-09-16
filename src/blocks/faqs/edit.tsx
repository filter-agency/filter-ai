import { __ } from '@wordpress/i18n';
import { InnerBlocks, RichText, useBlockProps } from '@wordpress/block-editor';

type Attributes = Record<string, string>;

type Props = {
  attributes: Attributes;
  setAttributes: (props: Attributes) => Attributes;
};

const faqsEdit = ({ attributes, setAttributes }: Props) => {
  const blockProps = useBlockProps();

  return [
    <div className="alignfull" style={{ backgroundColor: '#ff0' }}>
      <div {...blockProps}>
        <RichText
          key="faqs-title-edit"
          value={attributes.title}
          onChange={(value) => setAttributes({ title: value })}
          tagName="h2"
          placeholder={__('Frequenty Asked Questions', 'filter-ai')}
          className="filter-ai-faqs-title"
        />
        <InnerBlocks allowedBlocks={['filter-ai/faq-item']} renderAppender={InnerBlocks.ButtonBlockAppender} />
      </div>
    </div>,
  ];
};

export default faqsEdit;

/*
  todo
  [ ] style similar to faqs on https://filter.agency/filter-ai/
  [ ] change marker style to match https://filter.agency/filter-ai/
  [ ] add block sidebar settings
  * background colour
  * text colour (also updates marker colour)
  * "Generate FAQs Content" section
  ** field to enter number of faqs to create (default 5)
  [ ] disable section if settings turned off
*/
