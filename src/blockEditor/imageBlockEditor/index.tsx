import { useEffect, useState } from 'react';
import { Button, Modal } from '@wordpress/components';
import { createRoot } from '@wordpress/element';
import { BlockEditProps } from '@/types';
import GenerateImgTabView from '@/mediaLibrary/tabs/generateImageTab/generateImgTabView';

type Props = {
  attributes: BlockEditProps['attributes'];
  isSelected: BlockEditProps['isSelected'];
  blockEditProps: BlockEditProps;
};

export const ImagePlaceholderToolbar = ({ attributes, isSelected, blockEditProps }: Props) => {
  const { setAttributes } = blockEditProps;

  const [isOpen, setIsOpen] = useState(false);

  const hasImage = attributes?.url || attributes?.id;
  const shouldInjectButton = !hasImage && isSelected;

  useEffect(() => {
    if (!shouldInjectButton) return;

    const observer = new MutationObserver(() => {
      const selectedBlock = document.querySelector('.is-selected[data-type^="core/"]');
      if (!selectedBlock) return;

      const fieldset = selectedBlock.querySelector('.components-placeholder__fieldset');
      if (!fieldset || fieldset.querySelector('.filter-ai-generate-image-button')) return;

      const container = document.createElement('div');
      container.className = 'filter-ai-generate-image-button';
      container.style.display = 'inline-block';
      fieldset.appendChild(container);

      createRoot(container).render(
        <Button variant="secondary" className="is-next-40px-default-size" onClick={() => setIsOpen(true)}>
          Generate AI Image
        </Button>
      );
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [shouldInjectButton]);

  const handleInsertImage = (image?: { url: string; id?: number; alt?: string }) => {
    if (!image) return;

    setAttributes({
      url: image.url,
      id: image.id,
      alt: image.alt || '',
    });
    setIsOpen(false);
  };

  return (
    <>
      {isOpen && (
        <Modal
          title="AI Image Generator"
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
