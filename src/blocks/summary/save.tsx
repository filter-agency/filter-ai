import { __ } from '@wordpress/i18n';
import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';

type Props = {
  attributes: Record<string, string>;
};

const SummarySave = ({ attributes }: Props) => {
  const className = ((attributes?.className || '') + ' alignfull').trim();
  const blockProps = useBlockProps.save({ ...attributes, className });

  return (
    <div {...blockProps}>
      <div className="inner">
        <InnerBlocks.Content />
      </div>
    </div>
  );
};

export default SummarySave;
