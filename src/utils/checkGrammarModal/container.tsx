import { Button, Modal } from '@wordpress/components';
import { useGrammarCheckModal, hideGrammarCheckModal, setGrammarCheckModal } from './store';
import { createRoot } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import CloseIcon from '@/assets/close';
import { diffWords } from 'diff';

const sanitizeHTML = (dirty: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(dirty, 'text/html');

  doc.querySelectorAll('script, iframe, object, embed, link, meta, style').forEach((el) => el.remove());

  doc.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.toLowerCase();
      if (name.startsWith('on') || value.startsWith('javascript:')) {
        el.removeAttribute(name);
      }
    });
  });

  return doc.body.innerHTML || '';
};

const GrammarCheckModalContainer = () => {
  const { originalText, correctedText } = useGrammarCheckModal();

  const onClose = () => hideGrammarCheckModal();

  const onApply = () => {
    if (!correctedText) return;
    setGrammarCheckModal({ choice: correctedText });
    hideGrammarCheckModal();
  };

  if (!originalText || !correctedText) return null;

  const safeOriginal = sanitizeHTML(originalText);
  const safeCorrected = sanitizeHTML(correctedText);

  const renderDiff = () => {
    const diff = diffWords(safeOriginal.trim(), safeCorrected.trim());

    return diff.map((part, index) => {
      const style = part.added
        ? { backgroundColor: '#d4edda', borderRadius: '2px', padding: '0 1px' }
        : part.removed
          ? { backgroundColor: '#f8d7da', textDecoration: 'line-through', borderRadius: '2px', padding: '0 1px' }
          : {};

      let value = part.value;
      if (part.added || part.removed) value = value.replace(/^\s+|\s+$/g, '');

      const nextPart = diff[index + 1];
      const needsSpace = nextPart && !/^[\s.,!?;:'")]/.test(nextPart.value) && !/["'(]$/.test(value);

      return <span key={index} style={style} dangerouslySetInnerHTML={{ __html: value + (needsSpace ? ' ' : '') }} />;
    });
  };

  return (
    <Modal
      __experimentalHideHeader
      onRequestClose={onClose}
      className="filter-ai-grammar-check-modal"
      isDismissible
      shouldCloseOnClickOutside
      shouldCloseOnEsc
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
            <div className="filter-ai-grammar-check-text" dangerouslySetInnerHTML={{ __html: safeOriginal }} />
          </div>

          <div className="filter-ai-grammar-check-section">
            <h3>{__('Corrected Text', 'filter-ai')}</h3>
            <div className="filter-ai-grammar-check-text filter-ai-grammar-check-text-corrected">{renderDiff()}</div>
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
