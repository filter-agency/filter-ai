import { __, sprintf } from '@wordpress/i18n';
import {
  AlignmentToolbar,
  BlockControls,
  InnerBlocks,
  InspectorControls,
  RichText,
  useBlockProps,
} from '@wordpress/block-editor';
import { BaseControl, Button, ColorPicker, PanelBody, PanelRow, TextControl } from '@wordpress/components';
import { createInterpolateElement, useCallback, useMemo, useState } from '@wordpress/element';
import { ai, hideLoadingMessage, showLoadingMessage, showNotice } from '@/utils';
import { useDispatch, useSelect } from '@wordpress/data';
import { usePrompts } from '@/utils/ai/prompts/usePrompts';
import { useService } from '@/utils/ai/services/useService';
import { createBlock } from '@wordpress/blocks';
import { useSettings } from '@/settings';

type Attributes = Record<string, any>;

type Props = {
  attributes: Attributes;
  setAttributes: (props: Attributes) => Attributes;
  clientId: string;
};

type FAQ = {
  question: string;
  answer: string;
};

const extractFAQs = (content: string) => {
  const faqRegex = new RegExp(/(<!-- wp:filter-ai\/faqs ({[^}]+}) -->[\s\S]*?<!-- \/wp:filter-ai\/faqs -->)/, 'g');

  const matches = [...content.matchAll(faqRegex)];

  const _oldFAQs = matches.map((match) => match[0]).join('');

  const _content = content.replace(faqRegex, '');

  return { _oldFAQs, _content };
};

const faqsEdit = ({ attributes, setAttributes, clientId }: Props) => {
  const [numberOfItems, setNumberOfItems] = useState('5');

  const blockProps = useBlockProps();
  const prompt = usePrompts('generate_faq_section_prompt');
  const service = useService('generate_faq_section_prompt_service');
  const { settings } = useSettings();

  const isEnabled = useMemo(() => settings?.generate_faq_section_enabled, [settings]);

  const { replaceInnerBlocks } = useDispatch('core/block-editor');

  const { content, oldFAQs } = useSelect((select) => {
    const { getEditedPostAttribute } = select('core/editor') || {};

    // @ts-expect-error Type 'never' has no call signatures.
    const _rawContent = getEditedPostAttribute?.('content');

    const { _content, _oldFAQs } = extractFAQs(_rawContent);

    return {
      content: _content,
      oldFAQs: _oldFAQs,
    };
  }, []);

  const existingInnerBlocks = useSelect(
    (select) => {
      // @ts-expect-error Property 'getBlocks' does not exist on type 'never'.
      return select('core/block-editor').getBlocks(clientId);
    },
    [clientId]
  );

  const generate = useCallback(async () => {
    showLoadingMessage(__('FAQs', 'filter-ai'));

    try {
      const faqs = await ai.getFAQsFromContent(content, numberOfItems, oldFAQs, prompt, service?.slug);

      if (!faqs) {
        throw new Error(__('Sorry, there has been an issue while generating your FAQs.', 'filter-ai'));
      }

      const newInnerBlocks = JSON.parse(
        faqs.replace(/question:/g, '\"question\":').replace(/answer:/g, '\"answer\":')
      )?.map((faq: FAQ) =>
        createBlock(
          'filter-ai/faq-item',
          {
            question: faq.question,
          },
          [createBlock('core/paragraph', { content: faq.answer })]
        )
      );

      replaceInnerBlocks(clientId, [...existingInnerBlocks, ...newInnerBlocks]);

      let message = __('FAQs have been added', 'filter-ai');

      if (service?.metadata.name) {
        message = sprintf(__('FAQs have been added using %s', 'filter-ai'), service.metadata.name);
      }

      showNotice({ message });
    } catch (error) {
      console.error(error);

      // @ts-expect-error Property 'message' does not exist on type '{}'
      showNotice({ message: error?.message || error, type: 'error' });
    } finally {
      hideLoadingMessage();
    }
  }, [content, numberOfItems, oldFAQs, prompt, service, showNotice, hideLoadingMessage, showLoadingMessage]);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__('Generate FAQ Content', 'filter-ai')} initialOpen={isEnabled}>
          <PanelRow>
            {isEnabled ? (
              <fieldset>
                <TextControl
                  value={numberOfItems}
                  onChange={(value) => setNumberOfItems(value)}
                  label={__('Number of items', 'filter-ai')}
                  type="number"
                />
                <Button
                  onClick={generate}
                  variant="secondary"
                  disabled={
                    !numberOfItems ||
                    isNaN(parseInt(numberOfItems)) ||
                    parseInt(numberOfItems) < 1 ||
                    parseInt(numberOfItems) > 10
                  }
                >
                  {__('Generate', 'filter-ai')}
                </Button>
              </fieldset>
            ) : (
              <p>
                {createInterpolateElement(
                  sprintf(__('Please activate within the %s settings.', 'filter-ai'), `<a>Filter AI</a>`),
                  {
                    a: <a href="/wp-admin/admin.php?page=filter_ai" />,
                  }
                )}
              </p>
            )}
          </PanelRow>
        </PanelBody>
        <PanelBody title={__('FAQs Styling', 'filter-ai')} initialOpen={false}>
          <PanelRow>
            <fieldset>
              <BaseControl label={__('Background Color', 'filter-ai')}>
                <ColorPicker
                  color={attributes.backgroundColor}
                  onChange={(value) => setAttributes({ backgroundColor: value })}
                />
              </BaseControl>
            </fieldset>
          </PanelRow>
          <PanelRow>
            <fieldset>
              <BaseControl label={__('Heading Color', 'filter-ai')}>
                <ColorPicker
                  color={attributes.headingColor}
                  onChange={(value) => setAttributes({ headingColor: value })}
                />
              </BaseControl>
            </fieldset>
          </PanelRow>
        </PanelBody>
      </InspectorControls>
      <BlockControls>
        <AlignmentToolbar value={attributes.titleAlign} onChange={(value) => setAttributes({ titleAlign: value })} />
      </BlockControls>
      <div className="alignfull" style={{ backgroundColor: attributes.backgroundColor }}>
        <div {...blockProps}>
          <RichText
            key="faqs-title-edit"
            value={attributes.title || ''}
            onChange={(value) => setAttributes({ title: value })}
            tagName="h2"
            className="filter-ai-faqs-title"
            style={{
              textAlign: attributes.titleAlign as React.CSSProperties['textAlign'],
              color: attributes.headingColor,
            }}
          />
          <InnerBlocks allowedBlocks={['filter-ai/faq-item']} renderAppender={InnerBlocks.ButtonBlockAppender} />
        </div>
      </div>
    </>
  );
};

export default faqsEdit;
