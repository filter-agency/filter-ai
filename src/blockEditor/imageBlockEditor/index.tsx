import { useEffect } from 'react';
import { Button } from '@wordpress/components';
import { createRoot } from '@wordpress/element';
import { BlockEditProps } from '@/types';

type Props = {
  attributes: BlockEditProps['attributes'];
  isSelected: BlockEditProps['isSelected'];
  // We pass the full props object to use inside the button's onClick
  blockEditProps: BlockEditProps;
};

export const ImagePlaceholderToolbar = ({ attributes, isSelected, blockEditProps }: Props) => {
  // Check if image already exists
  const hasImage = attributes?.url || attributes?.id;

  // This is the condition from the original file
  const shouldInjectButton = !hasImage && isSelected;

  useEffect(() => {
    if (!shouldInjectButton) return;

    const observer = new MutationObserver(() => {
      // Find the selected block first
      const selectedBlock = document.querySelector('.is-selected[data-type^="core/"]');
      if (!selectedBlock) return;

      // Find the fieldset within the selected block only
      const fieldset = selectedBlock.querySelector('.components-placeholder__fieldset');

      if (!fieldset || fieldset.querySelector('.filter-ai-generate-image-button')) {
        return;
      }

      const container = document.createElement('div');
      container.className = 'filter-ai-generate-image-button';
      container.style.display = 'inline-block';
      fieldset.appendChild(container);

      createRoot(container).render(
        <Button
          variant="secondary"
          className="is-next-40px-default-size"
          onClick={() => {
            console.log('Generate AI Image clicked', blockEditProps);
            // TODO: Implement image generation logic
          }}
        >
          Generate AI Image
        </Button>
      );
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [shouldInjectButton, blockEditProps]);

  // This component doesn't render any visible UI itself; it uses a side effect (useEffect)
  return null;
};
