import { Button, Modal } from '@wordpress/components';
import { useGrammarCheckModal, hideGrammarCheckModal } from './store';
import { createRoot, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import CloseIcon from '@/assets/close';
import { showNotice } from '@/utils';
import { insert, toHTMLString } from '@wordpress/rich-text';
import { dispatch } from '@wordpress/data';

const GrammarCheckModalContainer = () => {
  const { originalText, correctedText, isVisible, context } = useGrammarCheckModal();

  const onClose = () => {
    hideGrammarCheckModal();
  };

  const onApply = () => {
    if (!context || !correctedText) return;

    try {
      const { content, hasSelection, selectionStart, selectionEnd } = context;

      if (hasSelection) {
        const newValue = insert(content, correctedText, selectionStart.offset, selectionEnd.offset);

        const blockDispatcher = dispatch('core/block-editor') as {
          updateBlockAttributes: (clientId: string, attributes: Record<string, any>) => void;
        };

        const targetBlockId = selectionEnd?.clientId;
        if (targetBlockId) {
          blockDispatcher.updateBlockAttributes(targetBlockId, {
            content: toHTMLString({ value: newValue }),
          });
        }

        setTimeout(() => document.getSelection()?.empty(), 0);
      }

      let message = __('Grammar has been corrected', 'filter-ai');
      if (context.serviceName) {
        message = sprintf(__('Grammar has been corrected using %s', 'filter-ai'), context.serviceName);
      }

      showNotice({ message });
      onClose();
    } catch (error) {
      console.error('Error applying grammar correction:', error);
      showNotice({
        message: __('There was an issue applying the grammar correction.', 'filter-ai'),
        type: 'error',
      });
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      __experimentalHideHeader
      onRequestClose={onClose}
      className="filter-ai-grammar-check-modal"
      isDismissible={true}
      shouldCloseOnClickOutside={true}
      shouldCloseOnEsc={true}
    >
      <div className="filter-ai-grammar-check-modal-header">
        <div>
          <h2>{__('Review Grammar Correction', 'filter-ai')}</h2>
          <p>{__('Review the corrected text before applying it to your content', 'filter-ai')}</p>
        </div>
        <Button onClick={onClose} aria-label={__('close', 'filter-ai')}>
          <CloseIcon />
        </Button>
      </div>

      <div className="filter-ai-grammar-check-modal-content">
        <div className="filter-ai-grammar-check-comparison">
          <div className="filter-ai-grammar-check-section">
            <h3>{__('Original Text', 'filter-ai')}</h3>
            <div className="filter-ai-grammar-check-text">{originalText}</div>
          </div>

          <div className="filter-ai-grammar-check-section">
            <h3>{__('Corrected Text', 'filter-ai')}</h3>
            <div className="filter-ai-grammar-check-text filter-ai-grammar-check-text-corrected">{correctedText}</div>
          </div>
        </div>

        <p className="filter-ai-grammar-check-modal-warn">
          {__('AI generated corrections may contain errors, please review before applying.', 'filter-ai')}
        </p>

        <div className="filter-ai-grammar-check-modal-actions">
          <Button variant="secondary" onClick={onClose}>
            {__('Cancel', 'filter-ai')}
          </Button>
          <Button variant="primary" onClick={onApply}>
            {__('Apply Correction', 'filter-ai')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const container = document.createElement('div');
container.id = 'filter-ai-grammar-check-modal-container';
document.body.appendChild(container);

const root = createRoot(container);
root.render(<GrammarCheckModalContainer />);
