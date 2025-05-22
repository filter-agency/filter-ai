import { DropdownMenu } from '@/components/dropdownMenu';
import { useSettings } from '@/settings';
import { ai, hideLoadingMessage, showLoadingMessage, showNotice, t } from '@/utils';
import { Button, Flex, Modal, TextareaControl } from '@wordpress/components';
import { useCallback, useEffect, useMemo, useRef, useState } from '@wordpress/element';
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
          label: 'short description',
          promptPrefix: settings?.wc_product_excerpt_prompt || ai.prompts.wc_product_excerpt_prompt,
        };
      default:
        return {
          enabled: settings?.wc_product_description_enabled,
          label: 'description',
          promptPrefix: settings?.wc_product_description_prompt || ai.prompts.wc_product_description_prompt,
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

    showLoadingMessage(t(`Generating product ${data.label}`));

    try {
      const prompt = `${data.promptPrefix} ${promptSuffix}`;

      const content = await ai.generateText({
        feature: `filter-ai-wc-product-${id}`,
        prompt,
      });

      if (!content) {
        throw new Error(t(`Sorry, there has been an issue while generating your product ${data.label}.`));
      }

      updateValue(content);

      showNotice({ message: t(`Product ${data.label} has been updated`) });
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
        title="Filter AI"
        onRequestClose={() => {
          setShowModal(false);
        }}
      >
        <div>{t('Please provide some information about the product')}</div>
        {/* @ts-expect-error */}
        <TextareaControl
          ref={textareaRef}
          label=""
          aria-label={t('Information about the product')}
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
      title: hasValue ? t(`Regnerate ${data.label}`) : t(`Generate ${data.label}`),
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
