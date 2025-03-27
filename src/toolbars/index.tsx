import { ComponentType } from 'react';
import { addFilter } from '@wordpress/hooks';
import { ImageToolbar } from './image';
import { BlockEditProps } from '@/types';

const addBlockToolbar = (BlockEdit: ComponentType<BlockEditProps>) =>
  function (props: BlockEditProps) {
    const { name } = props;

    return (
      <>
        <BlockEdit {...props} />
        {name === 'core/image' && <ImageToolbar {...props} />}
      </>
    );
  };

addFilter('editor.BlockEdit', 'filter-ai/add-block-toolbar', addBlockToolbar);
