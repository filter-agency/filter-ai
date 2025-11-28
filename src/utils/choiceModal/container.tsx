import { Button, Modal, RadioControl } from '@wordpress/components';
import { useChoiceModal, hideChoiceModal } from './store';
import { createRoot, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import CloseIcon from '@/assets/close';
import ReloadIcon from '@/assets/reload';

const ModalContainer = () => {
  const disableRegenerate = useRef(false);
  const [choice, setChoice] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const { visible, update, regenerate, title, description, label, options } = useChoiceModal();

  const onClose = () => {
    hideChoiceModal();
  };

  // const getAIFunction = () => {
  //   switch (type) {
  //     case 'title':
  //       return (text: string, prompt: string, service?: string) =>
  //         ai.getTitleFromContent(context?.content ?? '', text, prompt, service);

  //     case 'excerpt':
  //       return (text: string, prompt: string, service?: string) =>
  //         ai.getExcerptFromContent(context?.content ?? '', text, prompt, service);

  //     case 'tags':
  //       return (prompt: string, service?: string) => ai.getTagsFromContent(context?.content ?? '', [], prompt, service);

  //     case 'text':
  //     default:
  //       return (text?: string, prompt?: string, service?: string) =>
  //         ai.customiseText(context?.feature ?? '', text ?? '', prompt ?? '', service ?? '');
  //   }
  // };

  // const getModalContent = () => {
  //   switch (type) {
  //     case 'title':
  //       return {
  //         title: __('Select Your AI Generated Title', 'filter-ai'),
  //         description: __('Choose the title that works best for your content', 'filter-ai'),
  //         radioLabel: __('Choose from these AI generated titles:', 'filter-ai'),
  //       };
  //     case 'excerpt':
  //       return {
  //         title: __('Select Your AI Generated Excerpt', 'filter-ai'),
  //         description: __('Choose the excerpt that works best for your content', 'filter-ai'),
  //         radioLabel: __('Choose from these AI generated excerpts:', 'filter-ai'),
  //       };
  //     case 'tags':
  //       return {
  //         title: __('Select Your AI Generated Tags', 'filter-ai'),
  //         description: __('Choose the tag set that works best for your content', 'filter-ai'),
  //         radioLabel: __('Choose from these AI generated tag options:', 'filter-ai'),
  //       };
  //     case 'text':
  //     default:
  //       return {
  //         title: __('Select Your AI Generated Text', 'filter-ai'),
  //         description: __('Choose the version that works best for your content', 'filter-ai'),
  //         radioLabel: __('Choose from these AI generated options:', 'filter-ai'),
  //       };
  //   }
  // };

  // const MULTI_OPTION_CONFIG = {
  //   count: 3,
  //   delimiter: '###OPTION###',
  //   instruction: (count: number) =>
  //     `Generate exactly ${count} distinct variations. Do not number each variation. Separate each variation with the delimiter: ###OPTION###`,
  // };

  // const regenerate = async () => {
  //   if (!context) return;

  //   setIsRegenerating(true);
  //   setChoice('');

  //   try {
  //     const aiFunction = getAIFunction();

  //     const multiOptionPrompt = `${context?.prompt ?? ''} ${MULTI_OPTION_CONFIG.instruction(MULTI_OPTION_CONFIG.count)}`;

  //     let response;

  //     switch (type) {
  //       case 'title':
  //       case 'excerpt':
  //         response = await aiFunction(context?.text ?? '', multiOptionPrompt, context?.service ?? '');
  //         break;

  //       case 'tags':
  //         response = await aiFunction(multiOptionPrompt, context?.service ?? '');
  //         break;

  //       case 'text':
  //       default:
  //         response = await aiFunction(context?.text ?? '', multiOptionPrompt, context?.service ?? '');
  //         break;
  //     }

  //     let parsedOptions: string[];

  //     if (type === 'tags') {
  //       let aiText;

  //       if (Array.isArray(response)) {
  //         aiText = response.join('\n');
  //       } else {
  //         aiText = String(response);
  //       }

  //       parsedOptions = aiText
  //         .split(MULTI_OPTION_CONFIG.delimiter)
  //         .map((opt) => opt.trim())
  //         .filter(Boolean);
  //     } else {
  //       parsedOptions =
  //         typeof response === 'string'
  //           ? response
  //               .split(MULTI_OPTION_CONFIG.delimiter)
  //               .map((opt) => opt.trim())
  //               .filter((opt) => opt.length > 0)
  //           : [String(response)];
  //     }

  //     if (!parsedOptions || parsedOptions.length < MULTI_OPTION_CONFIG.count) {
  //       throw new Error(__('Sorry, AI did not generate 3 options. Please try again.', 'filter-ai'));
  //     }

  //     let newOptions: string[];

  //     if (type === 'tags') {
  //       newOptions = parsedOptions.slice(0, MULTI_OPTION_CONFIG.count);
  //     } else {
  //       newOptions = parsedOptions.slice(0, MULTI_OPTION_CONFIG.count).map((opt) => removeWrappingQuotes(opt));
  //     }

  //     setCustomiseTextOptionsModal({ options: newOptions, choice: '' });
  //   } catch (error: unknown) {
  //     console.error(error);
  //     const message = error instanceof Error ? error.message : String(error);
  //     showNotice({ message, type: 'error' });
  //   } finally {
  //     setIsRegenerating(false);
  //   }
  // };

  const regenerateOnClick = async () => {
    if (disableRegenerate.current) {
      return;
    }

    disableRegenerate.current = true;

    setIsRegenerating(true);
    setChoice('');

    try {
      await regenerate?.(options);
    } finally {
      setIsRegenerating(false);
      disableRegenerate.current = false;
    }
  };

  if (!visible || !options?.length) {
    return null;
  }

  return (
    <Modal
      __experimentalHideHeader
      onRequestClose={onClose}
      className="filter-ai-customise-text-options-modal filter-ai-modal-base"
      isDismissible={!isRegenerating}
      shouldCloseOnClickOutside={!isRegenerating}
      shouldCloseOnEsc={!isRegenerating}
    >
      <div className="filter-ai-modal-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <Button onClick={onClose} disabled={isRegenerating} aria-label={__('close', 'filter-ai')}>
          <CloseIcon />
        </Button>
      </div>

      <div className="filter-ai-modal-content">
        <RadioControl
          selected={choice}
          onChange={setChoice}
          label={label}
          options={options?.map((option) => ({
            label: option,
            value: option,
          }))}
          disabled={isRegenerating}
        />

        <p className="filter-ai-modal-warn">
          {__('AI generated content may contain errors, please review before continuing.', 'filter-ai')}
        </p>

        <div className="filter-ai-modal-actions">
          <Button
            variant="secondary"
            onClick={regenerateOnClick}
            icon={<ReloadIcon />}
            iconPosition="right"
            className={isRegenerating ? 'is-generating' : ''}
            disabled={isRegenerating}
          >
            {isRegenerating ? __('Generating...', 'filter-ai') : __('Regenerate Options', 'filter-ai')}
          </Button>

          <div className="filter-ai-modal-actions-group">
            <Button variant="secondary" disabled={isRegenerating} onClick={onClose}>
              {__('Cancel', 'filter-ai')}
            </Button>
            <Button
              variant="primary"
              disabled={choice === '' || isRegenerating}
              onClick={() => {
                update?.(choice);
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
container.id = 'filter-ai-modal-container';

document.body.appendChild(container);

const root = createRoot(container);

root.render(<ModalContainer />);
