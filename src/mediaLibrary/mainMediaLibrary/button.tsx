import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, Modal } from '@wordpress/components';
import GenerateImgTabView from '@/mediaLibrary/tabs/generateImageTab/generateImgTabView';

const GenerateImageButtonUI = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <>
      <Button variant="secondary" onClick={openModal} className="filter-ai-media-lib-generate-btn">
        {__('Generate AI Image', 'filter-ai')}
      </Button>

      {isOpen && (
        <Modal
          title={__('AI Image Generator', 'filter-ai')}
          onRequestClose={closeModal}
          shouldCloseOnClickOutside={true}
          className="filter-ai-generator-modal"
        >
          <GenerateImgTabView />
        </Modal>
      )}
    </>
  );
};

const initGenerateImageButtonUI = () => {
  const { createRoot } = window.wp?.element || {};
  if (!createRoot) {
    return;
  }

  const observer = new MutationObserver((_mutations, obs) => {
    const addNewButton = document.querySelector('#wp-media-grid .page-title-action');
    const mediaGrid = document.querySelector('#wp-media-grid');

    if (addNewButton && mediaGrid) {
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'filter-ai-button-container';
      addNewButton.insertAdjacentElement('afterend', buttonContainer);

      const buttonRoot = createRoot(buttonContainer);
      buttonRoot.render(<GenerateImageButtonUI />);

      obs.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
};

(() => {
  const AttachmentsBrowser = window?.wp?.media?.view?.AttachmentsBrowser;
  if (!AttachmentsBrowser) {
    return;
  }

  const CustomAttachmentsBrowser = AttachmentsBrowser.extend({
    render: function () {
      AttachmentsBrowser.prototype.render.apply(this, arguments);

      if (this.renderedCustomUI) {
        return;
      }
      this.renderedCustomUI = true;

      initGenerateImageButtonUI();
    },
  });

  window.wp.media.view.AttachmentsBrowser = CustomAttachmentsBrowser;
})();
