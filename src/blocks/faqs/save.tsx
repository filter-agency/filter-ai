import { __ } from '@wordpress/i18n';
import { InnerBlocks, RichText, useBlockProps } from '@wordpress/block-editor';

type Props = {
  attributes: Record<string, string>;
};

const FAQsSave = ({ attributes }: Props) => {
  const blockProps = useBlockProps.save(attributes);

  return (
    <div className="alignfull" style={{ backgroundColor: attributes.background_color }}>
      <div {...blockProps} itemScope itemType="https://schema.org/FAQPage">
        <RichText.Content
          tagName="h2"
          value={attributes.title}
          className="filter-ai-faqs-title"
          style={{
            textAlign: attributes.titleAlign as React.CSSProperties['textAlign'],
          }}
        />
        <InnerBlocks.Content />
      </div>
    </div>
  );
};

export default FAQsSave;
