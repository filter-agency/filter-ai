import { __ } from '@wordpress/i18n';
import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';

type Props = {
  attributes: Record<string, string>;
};

const SummarySave = ({ attributes }: Props) => {
  let { className = '', ...rest } = attributes;

  if (!className.includes('alignfull')) {
    className += ' alignfull';
    className = className.trim();
  }

  const blockProps = useBlockProps.save({ ...rest, className });

  return (
    <div {...blockProps}>
      <div className="inner">
        <InnerBlocks.Content />
      </div>
    </div>
  );
};

export default SummarySave;
