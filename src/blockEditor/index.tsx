import { ComponentType } from 'react';
import { addFilter } from '@wordpress/hooks';
import { BlockEditProps } from '@/types';
import { ImagePlaceholderToolbar } from './imageBlockEditor';

const ImagePlaceholderFilter = (BlockEdit: ComponentType<BlockEditProps>) =>
  function (props: BlockEditProps) {
    const { name } = props;

    const isImageBlock = ['core/image', 'core/cover', 'core/media-text'].includes(name);

    return (
      <>
        <BlockEdit {...props} />

        {isImageBlock && (
          <ImagePlaceholderToolbar attributes={props.attributes} isSelected={props.isSelected} blockEditProps={props} />
        )}
      </>
    );
  };

addFilter('editor.BlockEdit', 'filter-ai/image-placeholder-filter', ImagePlaceholderFilter);
