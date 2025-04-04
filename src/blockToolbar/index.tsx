import { ComponentType } from 'react';
import { addFilter } from '@wordpress/hooks';
import { ImageToolbar } from './imageToolbar';
import { BlockEditProps } from '@/types';

const BlockToolbar = (BlockEdit: ComponentType<BlockEditProps>) =>
  function (props: BlockEditProps) {
    const { name } = props;

    return (
      <>
        <BlockEdit {...props} />
        {name === 'core/image' && <ImageToolbar {...props} />}
      </>
    );
  };

addFilter('editor.BlockEdit', 'filter-ai/block-toolbar', BlockToolbar);
