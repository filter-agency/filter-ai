import GenerateImgTabView from '@/mediaLibrary/tabs/generateImageTab/generateImgTabView';
import { Modal } from '@wordpress/components';
import { Children, cloneElement, createElement, useState } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

const GenerateImageButton = ({ onSelect, isGallery }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleInsertImage = (image: any) => {
    if (!image) return;

    if (isGallery) {
      onSelect([image]);
    } else {
      onSelect(image);
    }

    setIsOpen(false);
  };

  return (
    <>
      <button
        className="components-button block-editor-media-placeholder__button is-next-40px-default-size is-secondary"
        onClick={() => setIsOpen(true)}
      >
        {__('Generate AI Image', 'filter-ai')}
      </button>
      {isOpen && (
        <Modal
          title={__('AI Image Generator', 'filter-ai')}
          onRequestClose={() => setIsOpen(false)}
          shouldCloseOnClickOutside={true}
          className="filter-ai-generator-modal"
        >
          <GenerateImgTabView callback={handleInsertImage} insertMode={true} />
        </Modal>
      )}
    </>
  );
};

const updateMediaPlaceholder = (Component: any) => {
  return (props: any) => {
    if (props.value?.id || props.value?.url || !props?.allowedTypes?.includes('image')) {
      return createElement(Component, props);
    }

    let isGallery = false;
    const blockTitle = props.labels?.title || '';
    const lowerTitle = blockTitle.toLowerCase();

    if (lowerTitle.includes('gallery') || lowerTitle.includes('multiple images')) {
      isGallery = true;
    }

    if (props?.placeholder) {
      const placeholder = (content: any) => {
        let newContent;
        if (content) {
          newContent = cloneElement(
            content,
            {},
            ...Children.toArray(content.props.children),
            <GenerateImageButton onSelect={props.onSelect} isGallery={isGallery} />
          );
        } else {
          newContent = <GenerateImageButton onSelect={props.onSelect} isGallery={isGallery} />;
        }
        return props?.placeholder?.(newContent) || newContent;
      };
      return createElement(Component, { ...props, placeholder });
    }

    return createElement(
      Component,
      props,
      <GenerateImageButton onSelect={props.onSelect} isGallery={isGallery} />,
      ...Children.toArray(props.children)
    );
  };
};

addFilter('editor.MediaPlaceholder', 'filter-ai/update-media-placeholder', updateMediaPlaceholder);
