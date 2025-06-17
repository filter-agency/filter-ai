import { Button, Modal, RadioControl } from '@wordpress/components';
import { useSeoTitleOptionsModal, hideSeoTitleOptionsModal, setSeoTitleOptionsModal } from './store';
import { createRoot, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import InfoIcon from '@/assets/info';
import CloseIcon from '@/assets/close';
import ReloadIcon from '@/assets/reload';
import { ai } from '../ai';
import { useSettings } from '@/settings';
import { useSelect } from '@wordpress/data';

const SeoTiltleOptionsModalContainer = () => {
  const disableRegenerate = useRef(false);
  const [choice, setChoice] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const { options } = useSeoTitleOptionsModal();
  const { settings } = useSettings();

  const { content, oldSeoTitle } = useSelect((select) => {
    const { getEditedPostAttribute } = select('core/editor');
    const { getSeoTitle } = select('yoast-seo/editor') || {};

    return {
      // @ts-expect-error Type 'never' has no call signatures.
      content: getEditedPostAttribute('content'),
      // @ts-expect-error Type 'never' has no call signatures.
      oldSeoTitle: getSeoTitle?.(),
    };
  }, []);

  const onClose = () => {
    setChoice('');
    hideSeoTitleOptionsModal();
  };

  const regenerate = async () => {
    if (disableRegenerate.current) {
      return;
    }

    disableRegenerate.current = true;

    setIsRegenerating(true);
    setChoice('');

    let newOptions = [];
    const oldOptions = [oldSeoTitle, ...options];

    try {
      const titles = await ai.getSeoTitleFromContent(content, oldOptions.join(', '), settings?.yoast_seo_title_prompt);

      if (!titles) {
        throw new Error(__('Sorry, there has been an issue while generating your SEO title.', 'filter-ai'));
      }

      newOptions = titles.split('||').map((option: string) => option.trim());

      setSeoTitleOptionsModal({ options: newOptions, choice: '' });
    } catch (error) {
      console.error(error);

      // @ts-expect-error Property 'message' does not exist on type '{}'
      showNotice({ message: error?.message || error, type: 'error' });
    } finally {
      setIsRegenerating(false);
      disableRegenerate.current = false;
    }
  };

  if (!options?.length) {
    return null;
  }

  return (
    <Modal
      __experimentalHideHeader
      onRequestClose={onClose}
      className="filter-ai-seo-title-options-modal"
      isDismissible={!isRegenerating}
      shouldCloseOnClickOutside={!isRegenerating}
      shouldCloseOnEsc={!isRegenerating}
    >
      <div className="filter-ai-seo-title-options-modal-header">
        <div>
          <h2>{__('Select your Generated SEO Title', 'filter-ai')}</h2>
          <p>{__('Choose the perfect title to boost your search rankings', 'filter-ai')}</p>
        </div>
        <Button onClick={onClose} disabled={isRegenerating} aria-label={__('close', 'filter-ai')}>
          <CloseIcon />
        </Button>
      </div>
      <div className="filter-ai-seo-title-options-modal-content">
        <RadioControl
          selected={choice}
          onChange={setChoice}
          label={__('Choose from these AI generated options:', 'filter-ai')}
          options={options.map((option) => ({ label: option, value: option }))}
          disabled={isRegenerating}
        />
        <p className="filter-ai-seo-title-options-modal-warn">
          {__('AI generated titles may contain incorrect content, please double before continuing.', 'filter-ai')}
        </p>
        <div className="filter-ai-seo-title-options-modal-actions">
          <Button
            variant="secondary"
            onClick={regenerate}
            icon={<ReloadIcon />}
            iconPosition="right"
            className={isRegenerating ? 'is-generating' : ''}
          >
            {isRegenerating ? __('Generating...', 'filter-ai') : __('Regenerate Titles', 'filter-ai')}
          </Button>
          <div className="filter-ai-seo-title-options-modal-actions-group">
            <Button variant="secondary" disabled={isRegenerating} onClick={onClose}>
              {__('Cancel', 'filter-ai')}
            </Button>
            <Button
              variant="primary"
              disabled={choice === '' || isRegenerating}
              onClick={() => {
                setSeoTitleOptionsModal({ choice });
                onClose();
              }}
            >
              {__('Continue', 'filter-ai')}
            </Button>
          </div>
        </div>
        <div className="filter-ai-seo-title-options-modal-info">
          <div>
            <InfoIcon />
          </div>
          <div>
            <h3>{__('Why is an SEO title important?', 'filter-ai')}</h3>
            <p>
              {__(
                'Choosing the perfect SEO title results in higher click-through rates, better search rankings and improved user engagement for your content.',
                'filter-ai'
              )}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const container = document.createElement('div');
container.id = 'filter-ai-options-modal-container';

document.body.appendChild(container);

const root = createRoot(container);

root.render(<SeoTiltleOptionsModalContainer />);
