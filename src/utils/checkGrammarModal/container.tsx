import { Button, Modal } from '@wordpress/components';
import { useGrammarCheckModal, hideGrammarCheckModal, setGrammarCheckModal } from './store';
import { createRoot } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import CloseIcon from '@/assets/close';
import { diffWords, Change } from 'diff';

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

const unwrapIfFullyWrapped = (html: string): { tag: string | null; attrs: string; inner: string } => {
  const match = html.match(/^<(\w+)([^>]*)>([\s\S]*)<\/\1>$/);
  if (!match) {
    return { tag: null, attrs: '', inner: html };
  }

  const [, tag, attrs = '', inner] = match;
  return { tag, attrs, inner };
};

const GrammarCheckModalContainer = () => {
  const { originalText, correctedText } = useGrammarCheckModal();

  if (!originalText || !correctedText) return null;

  const safeOriginal = sanitizeHTML(originalText);
  const safeCorrected = sanitizeHTML(correctedText);

  const originalWrap = unwrapIfFullyWrapped(safeOriginal);
  const correctedWrap = unwrapIfFullyWrapped(safeCorrected);

  const originalForDiff =
    originalWrap.tag && originalWrap.tag === correctedWrap.tag ? originalWrap.inner.trim() : safeOriginal.trim();
  const correctedForDiff =
    originalWrap.tag && originalWrap.tag === correctedWrap.tag ? correctedWrap.inner.trim() : safeCorrected.trim();

  const diff = diffWords(originalForDiff, correctedForDiff);
  const hasChanges = diff.some((part: Change) => part.added || part.removed);

  const onClose = () => hideGrammarCheckModal();

  const onApply = () => {
    if (!correctedText) return;

    if (hasChanges) {
      setGrammarCheckModal({ choice: correctedText });
    }

    hideGrammarCheckModal();
  };

  const renderDiff = () => {
    if (!hasChanges) {
      return <span dangerouslySetInnerHTML={{ __html: safeCorrected }} />;
    }

    const diffHtml = diff
      .map((part: Change, index: number) => {
        const style = part.added
          ? { backgroundColor: '#d4edda', borderRadius: '2px', padding: '0 1px' }
          : part.removed
            ? { backgroundColor: '#f8d7da', textDecoration: 'line-through', borderRadius: '2px', padding: '0 1px' }
            : {};

        let value = part.value;
        if (part.added || part.removed) value = value.trim();

        const nextPart = diff[index + 1];
        const needsSpace = nextPart && !/^[\s.,!?;:'")]/.test(nextPart.value) && !/["'(]$/.test(value);

        const wrapperStart = part.added
          ? '<span style="background-color:#d4edda;border-radius:2px;padding:0 1px;">'
          : part.removed
            ? '<span style="background-color:#f8d7da;text-decoration:line-through;border-radius:2px;padding:0 1px;">'
            : '';

        const wrapperEnd = part.added || part.removed ? '</span>' : '';

        return `${wrapperStart}${value}${needsSpace ? ' ' : ''}${wrapperEnd}`;
      })
      .join('');

    const finalHtml =
      originalWrap.tag && originalWrap.tag === correctedWrap.tag
        ? `<${originalWrap.tag}${originalWrap.attrs}>${diffHtml}</${originalWrap.tag}>`
        : diffHtml;

    return <span dangerouslySetInnerHTML={{ __html: finalHtml }} />;
  };

  return (
    <Modal
      __experimentalHideHeader
      onRequestClose={onClose}
      className="filter-ai-grammar-check-modal filter-ai-modal-base"
      isDismissible
      shouldCloseOnClickOutside
      shouldCloseOnEsc
    >
      <div className="filter-ai-modal-header">
        <div>
          <h2>{__('Review Grammar Correction', 'filter-ai')}</h2>
          {hasChanges ? (
            <p>{__('Review the corrected text before applying it to your content', 'filter-ai')}</p>
          ) : (
            <p>{__('Your text looks good — no corrections were necessary.', 'filter-ai')}</p>
          )}
        </div>
        <Button onClick={onClose} aria-label={__('close', 'filter-ai')}>
          <CloseIcon />
        </Button>
      </div>

      <div className="filter-ai-modal-content">
        <div className="filter-ai-grammar-check-comparison">
          <div className="filter-ai-grammar-check-section">
            <h3>{__('Original Text', 'filter-ai')}</h3>
            {/* Original stays exactly as entered, including full <strong>/<em> wrapping */}
            <div className="filter-ai-grammar-check-text" dangerouslySetInnerHTML={{ __html: safeOriginal }} />
          </div>

          <div className="filter-ai-grammar-check-section">
            <h3>{hasChanges ? __('Corrected Text', 'filter-ai') : __('No changes needed', 'filter-ai')}</h3>
            <div className="filter-ai-grammar-check-text filter-ai-grammar-check-text-corrected">{renderDiff()}</div>
          </div>
        </div>

        {hasChanges && (
          <p className="filter-ai-modal-warn">
            {__('AI generated corrections may contain errors, please review before applying.', 'filter-ai')}
          </p>
        )}

        <div className="filter-ai-grammar-check-modal-actions">
          <Button variant="secondary" onClick={onClose}>
            {__('Cancel', 'filter-ai')}
          </Button>
          <Button variant="primary" onClick={onApply}>
            {hasChanges ? __('Apply Correction', 'filter-ai') : __('Accept', 'filter-ai')}
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
