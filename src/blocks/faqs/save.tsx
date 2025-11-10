import { __ } from '@wordpress/i18n';
import { InnerBlocks, RichText, useBlockProps } from '@wordpress/block-editor';

type Props = {
  attributes: Record<string, string>;
};

const FAQsSave = ({ attributes }: Props) => {
  let { className = '', ...rest } = attributes;

  if (!className.includes('alignfull')) {
    className += ' alignfull';
    className = className.trim();
  }

  const blockProps = useBlockProps.save({ ...rest, className });

  return (
    <div {...blockProps} itemScope itemType="https://schema.org/FAQPage">
      <div className="inner">
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
