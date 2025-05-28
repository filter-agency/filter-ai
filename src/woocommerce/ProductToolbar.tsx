import { DropdownMenu } from '@/components/dropdownMenu';
import { useSettings } from '@/settings';
import { ai, hideLoadingMessage, showLoadingMessage, showNotice } from '@/utils';
import { Button, Flex, Modal, TextareaControl } from '@wordpress/components';
import { useCallback, useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import _ from 'underscore';

type Props = {
  id: string;
};

const getElement = (id: string) => document.getElementById(id) as HTMLTextAreaElement;

const useControl = ({ id }: Props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [hasValue, setHasValue] = useState(!!getElement(id)?.value);
  const [showModal, setShowModal] = useState(false);

  const { settings } = useSettings();

  const data = useMemo(() => {
    switch (id) {
      case 'excerpt':
        return {
          enabled: settings?.wc_product_excerpt_enabled,
          promptPrefix: settings?.wc_product_excerpt_prompt || ai.prompts.wc_product_excerpt_prompt,
          loadingMessage: __('Generating product short description', 'filter-ai'),
          successMessage: __('Product short description has been updated', 'filter-ai'),
          errorMessage: __(
            'Sorry, there has been an issue while generating your product short description.',
            'filter-ai'
          ),
          generateLabel: __('Generate short description', 'filter-ai'),
          regenerateLabel: __('Regenerate short description', 'filter-ai'),
        };
      default:
        return {
          enabled: settings?.wc_product_description_enabled,
          promptPrefix: settings?.wc_product_description_prompt || ai.prompts.wc_product_description_prompt,
          loadingMessage: __('Generating product description', 'filter-ai'),
          successMessage: __('Product description has been updated', 'filter-ai'),
          errorMessage: __('Sorry, there has been an issue while generating your product description.', 'filter-ai'),
          generateLabel: __('Generate description', 'filter-ai'),
          regenerateLabel: __('Regenerate description', 'filter-ai'),
        };
    }
  }, [id, settings]);

  const updateValue = (newValue: string) => {
    const content = getElement(id);

    if (!content) {
      return;
    }

    content.value = newValue;
    content.dispatchEvent(new Event('change'));

    window.tinymce?.get(id)?.setContent(newValue);
  };

  const generate = async (promptSuffix?: string) => {
    if (!promptSuffix) {
      return;
    }

    showLoadingMessage(data.loadingMessage);

    try {
      const prompt = `${data.promptPrefix} ${promptSuffix}`;

      const content = await ai.generateText({
        feature: `filter-ai-wc-product-${id}`,
        prompt,
      });

      if (!content) {
        throw new Error(data.errorMessage);
      }

      updateValue(content);

      showNotice({ message: data.successMessage });
    } catch (error) {
      console.error(error);

      // @ts-expect-error Property 'message' does not exist on type '{}'
      showNotice({ message: error?.message || error, type: 'error' });
    } finally {
      hideLoadingMessage();
    }
  };

  const onClick = async () => {
    let value = '';

    switch (id) {
      case 'excerpt':
        value = getElement(id)?.value || getElement('content')?.value;
        break;
      default:
        getElement(id)?.value;
    }

    if (value) {
      generate(value);
    } else {
      setShowModal(true);
    }
  };

  const checkHasValue = () => {
    setHasValue(!!getElement(id)?.value);
  };

  const ControlModal = useCallback(() => {
    if (!showModal) {
      return null;
    }

    return (
      <Modal
        title={__('Generate Description', 'filter-ai')}
        onRequestClose={() => {
          setShowModal(false);
        }}
      >
        <div>{__('Please provide information about the product to generate a description:', 'filter-ai')}</div>
        {/* @ts-expect-error */}
        <TextareaControl
          ref={textareaRef}
          label=""
          aria-label={__('Information about the product', 'filter-ai')}
          className="filter-ai-wc-modal-textarea"
          onChange={() => {}}
          __nextHasNoMarginBottom
        />
        <Flex gap={4} justify="flex-end">
          <Button
            variant="primary"
            onClick={() => {
              if (!textareaRef.current?.value) {
                return;
              }

              setShowModal(false);
              generate(textareaRef.current?.value);
            }}
          >
            Continue
          </Button>
        </Flex>
      </Modal>
    );
  }, [showModal]);

  useEffect(() => {
    const abortController = new AbortController();

    getElement(id)?.addEventListener('input', checkHasValue, {
      signal: abortController.signal,
    });

    getElement(id)?.addEventListener('change', checkHasValue, {
      signal: abortController.signal,
    });

    return () => {
      abortController.abort();
    };
  }, []);

  if (!data.enabled) {
    return {
      ControlModal: () => null,
      control: null,
    };
  }

  return {
    ControlModal,
    control: {
      title: hasValue ? data.regenerateLabel : data.generateLabel,
      onClick,
    },
  };
};

export const ProductToolbar = (props: Props) => {
  const { ControlModal, control } = useControl(props);

  const controls = _.compact([control]);

  return (
    <>
      <DropdownMenu controls={controls} toggleProps={{ className: 'is-small' }} />
      <ControlModal />
    </>
  );
};
