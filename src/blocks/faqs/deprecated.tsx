import { __ } from '@wordpress/i18n';
import { InnerBlocks, RichText, useBlockProps } from '@wordpress/block-editor';

type Props = {
  attributes: Record<string, string>;
};

const v1 = {
  attributes: {
    title: {
      type: 'string',
      default: 'Frequently Asked Questions',
    },
    titleAlign: {
      type: 'string',
      default: 'center',
    },
    backgroundColor: {
      type: 'string',
      default: '',
    },
    textColor: {
      type: 'string',
      default: '',
    },
  },
  save: ({ attributes }: Props) => {
    const blockProps = useBlockProps.save(attributes);

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
  },
  migrate: (attributes: Props['attributes']) => {
    return {
      ...attributes,
      className: ((attributes?.className || '') + ' alignfull').trim(),
    };
  },
};

export default [v1];
