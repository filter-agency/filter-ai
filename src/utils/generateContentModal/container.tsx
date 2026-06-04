import { Button, Modal, TextareaControl, TextControl, FormTokenField, CheckboxControl } from '@wordpress/components';
import { createRoot, useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import CloseIcon from '@/assets/close';
import { filterAIIconWhite } from '@/assets/filter-logo';
import { useGenerateContentModal, hideGenerateContentModal } from './store';

const ModalContainer = () => {
  const { visible, blockName, defaultPrompt, defaultKeywords, defaultLength, onSubmit } = useGenerateContentModal();

  const [prompt, setPrompt] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [length, setLength] = useState<string>('');
  const [append, setAppend] = useState<boolean>(false);

  // Re-seed the form whenever the modal is opened so a re-open after a prior
  // generation doesn't carry the old text over by surprise. We also reset to
  // empty defaults when the caller didn't supply any.
  useEffect(() => {
    if (visible) {
      setPrompt(defaultPrompt ?? '');
      setKeywords(defaultKeywords ?? []);
      setLength(defaultLength ?? '');
      setAppend(false);
    }
  }, [visible, defaultPrompt, defaultKeywords, defaultLength]);

  if (!visible) {
    return null;
  }

  const onClose = () => {
    hideGenerateContentModal();
  };

  const onGenerate = () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || !onSubmit) {
      return;
    }
    const cleanedKeywords = keywords.map((k) => k.trim()).filter(Boolean);
    onSubmit({ prompt: trimmedPrompt, keywords: cleanedKeywords, length: length.trim(), append });
    hideGenerateContentModal();
  };

  // Soften the title when we know the block type so users get a small
  // confirmation of which block their text will land in.
  const blockLabel = (() => {
    switch (blockName) {
      case 'core/heading':
        return __('heading', 'filter-ai');
      case 'core/list-item':
        return __('list item', 'filter-ai');
      case 'core/paragraph':
      default:
        return __('paragraph', 'filter-ai');
    }
  })();

  return (
    <Modal
      __experimentalHideHeader
      onRequestClose={onClose}
      className="filter-ai-generate-content-modal filter-ai-modal-base"
    >
      <div className="filter-ai-modal-header">
        <div>
          <h2>{__('Generate content', 'filter-ai')}</h2>
          <p>
            {__('Filter AI will write text directly into your selected', 'filter-ai')} {blockLabel}.
          </p>
        </div>
        <Button onClick={onClose} aria-label={__('close', 'filter-ai')}>
          <CloseIcon />
        </Button>
      </div>

      <div className="filter-ai-modal-content">
        <TextareaControl
          __nextHasNoMarginBottom
          label={__('Prompt', 'filter-ai')}
          help={__('Describe what you want the AI to write.', 'filter-ai')}
          value={prompt}
          onChange={setPrompt}
          rows={2}
          placeholder={__('e.g. Explain why slow living matters in a busy world.', 'filter-ai')}
        />

        <div className="filter-ai-generate-content-modal__field">
          <FormTokenField
            __nextHasNoMarginBottom
            label={__('Keywords (optional)', 'filter-ai')}
            value={keywords}
            onChange={(tokens) => setKeywords(tokens.map((t) => String(t)))}
            placeholder={__('Add keywords to incorporate', 'filter-ai')}
          />
        </div>

        <div className="filter-ai-generate-content-modal__field">
          <TextControl
            __nextHasNoMarginBottom
            label={__('Length (optional)', 'filter-ai')}
            help={__('A free-text hint, e.g. "80 words" or "2 short paragraphs".', 'filter-ai')}
            value={length}
            onChange={setLength}
            placeholder={__('e.g. 100 words', 'filter-ai')}
          />
        </div>

        <div className="filter-ai-generate-content-modal__field">
          <CheckboxControl
            __nextHasNoMarginBottom
            label={__('Append to existing content', 'filter-ai')}
            help={__('Add the generated content after this block instead of replacing it.', 'filter-ai')}
            checked={append}
            onChange={setAppend}
          />
        </div>

        <p className="filter-ai-modal-warn">
          {__('AI generated content may contain errors, please review before continuing.', 'filter-ai')}
        </p>

        <div className="filter-ai-modal-actions">
          <div className="filter-ai-modal-actions-group" style={{ marginLeft: 'auto' }}>
            <Button variant="secondary" onClick={onClose}>
              {__('Cancel', 'filter-ai')}
            </Button>
            <Button
              variant="primary"
              className="filter-ai-generate-button"
              disabled={!prompt.trim()}
              onClick={onGenerate}
            >
              <img src={filterAIIconWhite} alt="" className="filter-ai-generate-button__icon" />
              {__('Generate', 'filter-ai')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const container = document.createElement('div');
container.id = 'filter-ai-generate-content-modal-container';
document.body.appendChild(container);

const root = createRoot(container);
root.render(<ModalContainer />);
