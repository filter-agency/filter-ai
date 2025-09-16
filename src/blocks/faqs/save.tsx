import { __ } from '@wordpress/i18n';
import { InnerBlocks, RichText, useBlockProps } from '@wordpress/block-editor';

type Props = {
  attributes: Record<string, string>;
};

const FAQsSave = ({ attributes }: Props) => {
  const blockProps = useBlockProps.save(attributes);

  // todo output faqs as json-ld
  // https://developers.google.com/search/docs/appearance/structured-data/faqpage

  return (
    <div className="alignfull" style={{ backgroundColor: '#ff0' }}>
      <div {...blockProps} itemScope itemType="https://schema.org/FAQPage">
        <RichText.Content tagName="h2" value={attributes.title} className="filter-ai-faqs-title" />
        <InnerBlocks.Content />
      </div>
    </div>
  );
};

export default FAQsSave;
