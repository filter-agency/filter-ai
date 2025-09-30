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
        {/* Always render the original BlockEdit component */}
        <BlockEdit {...props} />

        {/* Conditionally render the new component */}
        {isImageBlock && (
          <ImagePlaceholderToolbar
            attributes={props.attributes}
            isSelected={props.isSelected}
            blockEditProps={props} // Pass the full props object
          />
        )}
      </>
    );
  };

// Apply the filter with a unique name
addFilter('editor.BlockEdit', 'filter-ai/image-placeholder-filter', ImagePlaceholderFilter);
