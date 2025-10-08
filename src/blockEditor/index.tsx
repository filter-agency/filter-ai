import { createElement, useEffect, useRef, useState } from '@wordpress/element';
import { Button, Modal } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { addFilter } from '@wordpress/hooks';
import GenerateImgTabView from '@/mediaLibrary/tabs/generateImageTab/generateImgTabView';

const extendMediaPlaceholder = (OriginalMediaPlaceholder: any) => (props: any) => {
  if (props.value?.id || props.value?.url) return createElement(OriginalMediaPlaceholder, props);

  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const injectedRef = useRef(false);

  const handleGenerateImage = () => setIsOpen(true);
  const handleInsertImage = (image: any) => {
    if (!image) return;
    props.onSelect({ url: image.url, id: image.id });
    setIsOpen(false);
  };

  useEffect(() => {
    if (!wrapperRef.current || injectedRef.current) return;

    const fieldset = wrapperRef.current.querySelector('.components-placeholder__fieldset');
    if (fieldset) {
      const container = document.createElement('div');
      fieldset.appendChild(container);

      import('@wordpress/element').then(({ render }) => {
        render(
          createElement(
            Button as any,
            {
              variant: 'secondary',
              className: 'block-editor-media-placeholder__button is-next-40px-default-size',
              onClick: handleGenerateImage,
            },
            __('Generate AI Image', 'filter-ai')
          ),
          container
        );
      });

      injectedRef.current = true;
    }
  }, []);

  return createElement(
    'div',
    { className: 'filter-ai-media-placeholder-wrapper', ref: wrapperRef },
    createElement(OriginalMediaPlaceholder, props),
    isOpen &&
      createElement(
        Modal as any,
        {
          title: __('AI Image Generator', 'filter-ai'),
          onRequestClose: () => setIsOpen(false),
          shouldCloseOnClickOutside: true,
          className: 'filter-ai-generator-modal',
        },
        createElement(GenerateImgTabView, {
          callback: handleInsertImage,
          insertMode: true,
        })
      )
  );
};

addFilter('editor.MediaPlaceholder', 'filter-ai/with-ai-generate-button', extendMediaPlaceholder);
