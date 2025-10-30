import { Button, Modal, RadioControl } from '@wordpress/components';
import { useCustomiseTextOptionsModal, hideCustomiseTextOptionsModal, setCustomiseTextOptionsModal } from './store';
import { createRoot, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import CloseIcon from '@/assets/close';
import ReloadIcon from '@/assets/reload';
import { ai, removeWrappingQuotes, showNotice } from '@/utils';

const CustomiseTextOptionsModalContainer = () => {
  const [choice, setChoice] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const { options, context, type } = useCustomiseTextOptionsModal();

  const onClose = () => {
    setChoice('');
    hideCustomiseTextOptionsModal();
  };

  const getAIFunction = () => {
    switch (type) {
      case 'title':
        return (text: string, prompt: string, service?: string) =>
          ai.getTitleFromContent(context?.content ?? '', text, prompt, service);

      case 'excerpt':
        return (text: string, prompt: string, service?: string) =>
          ai.getExcerptFromContent(context?.content ?? '', text, prompt, service);

      case 'tags':
        return (prompt: string, service?: string) => ai.getTagsFromContent(context?.content ?? '', [], prompt, service);

      case 'text':
      default:
        return (text?: string, prompt?: string, service?: string) =>
          ai.customiseText(context?.feature ?? '', text ?? '', prompt ?? '', service ?? '');
    }
  };

  const getModalContent = () => {
    switch (type) {
      case 'title':
        return {
          title: __('Select Your AI Generated Title', 'filter-ai'),
          description: __('Choose the title that works best for your content', 'filter-ai'),
          radioLabel: __('Choose from these AI generated titles:', 'filter-ai'),
        };
      case 'excerpt':
        return {
          title: __('Select Your AI Generated Excerpt', 'filter-ai'),
          description: __('Choose the excerpt that works best for your content', 'filter-ai'),
          radioLabel: __('Choose from these AI generated excerpts:', 'filter-ai'),
        };
      case 'tags':
        return {
          title: __('Select Your AI Generated Tags', 'filter-ai'),
          description: __('Choose the tag set that works best for your content', 'filter-ai'),
          radioLabel: __('Choose from these AI generated tag options:', 'filter-ai'),
        };
      case 'text':
      default:
        return {
          title: __('Select Your AI Generated Text', 'filter-ai'),
          description: __('Choose the version that works best for your content', 'filter-ai'),
          radioLabel: __('Choose from these AI generated options:', 'filter-ai'),
        };
    }
  };

  const regenerate = async () => {
    if (!context) return;

    setIsRegenerating(true);
    setChoice('');

    try {
      const aiFunction = getAIFunction();

      const generateOption = () => aiFunction(context?.prompt ?? '', context?.service ?? '');

      const [option1, option2, option3] = await Promise.all([generateOption(), generateOption(), generateOption()]);

      if (!option1 || !option2 || !option3) {
        throw new Error(__('Sorry, there has been an issue while regenerating.', 'filter-ai'));
      }

      let newOptions: string[];

      if (type === 'tags') {
        newOptions = [
          Array.isArray(option1) ? option1.join(', ') : option1,
          Array.isArray(option2) ? option2.join(', ') : option2,
          Array.isArray(option3) ? option3.join(', ') : option3,
        ];
      } else {
        newOptions = [removeWrappingQuotes(option1), removeWrappingQuotes(option2), removeWrappingQuotes(option3)];
      }

      setCustomiseTextOptionsModal({ options: newOptions, choice: '' });
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : String(error);
      showNotice({ message, type: 'error' });
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!options?.length) {
    return null;
  }

  const modalContent = getModalContent();

  return (
    <Modal
      __experimentalHideHeader
      onRequestClose={onClose}
      className="filter-ai-customise-text-options-modal"
      isDismissible={!isRegenerating}
      shouldCloseOnClickOutside={!isRegenerating}
      shouldCloseOnEsc={!isRegenerating}
    >
      <div className="filter-ai-customise-text-options-modal-header">
        <div>
          <h2>{modalContent.title}</h2>
          <p>{modalContent.description}</p>
        </div>
        <Button onClick={onClose} disabled={isRegenerating} aria-label={__('close', 'filter-ai')}>
          <CloseIcon />
        </Button>
      </div>

      <div className="filter-ai-customise-text-options-modal-content">
        <RadioControl
          selected={choice}
          onChange={setChoice}
          label={modalContent.radioLabel}
          options={options.map((option, index) => ({
            label: option,
            value: option,
          }))}
          disabled={isRegenerating}
        />

        <p className="filter-ai-customise-text-options-modal-warn">
          {__('AI generated content may contain errors, please review before continuing.', 'filter-ai')}
        </p>

        <div className="filter-ai-customise-text-options-modal-actions">
          <Button
            variant="secondary"
            onClick={regenerate}
            icon={<ReloadIcon />}
            iconPosition="right"
            className={isRegenerating ? 'is-generating' : ''}
            disabled={isRegenerating}
          >
            {isRegenerating ? __('Generating...', 'filter-ai') : __('Regenerate Options', 'filter-ai')}
          </Button>

          <div className="filter-ai-customise-text-options-modal-actions-group">
            <Button variant="secondary" disabled={isRegenerating} onClick={onClose}>
              {__('Cancel', 'filter-ai')}
            </Button>
            <Button
              variant="primary"
              disabled={choice === '' || isRegenerating}
              onClick={() => {
                setCustomiseTextOptionsModal({ choice });
                onClose();
              }}
            >
              {__('Apply', 'filter-ai')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const container = document.createElement('div');
container.id = 'filter-ai-customise-text-options-modal-container';

document.body.appendChild(container);

const root = createRoot(container);

root.render(<CustomiseTextOptionsModalContainer />);
