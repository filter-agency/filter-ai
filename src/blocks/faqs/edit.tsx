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
import { useCallback, useState } from '@wordpress/element';
import { ai, hideLoadingMessage, showLoadingMessage, showNotice } from '@/utils';
import { useSelect } from '@wordpress/data';
import { usePrompts } from '@/utils/ai/prompts/usePrompts';
import { useService } from '@/utils/ai/services/useService';

type Attributes = Record<string, string | undefined>;

type Props = {
  attributes: Attributes;
  setAttributes: (props: Attributes) => Attributes;
};

const extractFAQs = (content: string) => {
  const faqRegex = new RegExp(/(<!-- wp:filter-ai\/faqs ({[^}]+}) -->[\s\S]*?<!-- \/wp:filter-ai\/faqs -->)/, 'g');

  const matches = [...content.matchAll(faqRegex)];

  const _oldFAQs = matches.map((match) => match[0]).join('');

  const _content = content.replace(faqRegex, '');

  return { _oldFAQs, _content };
};

const faqsEdit = ({ attributes, setAttributes }: Props) => {
  const [numberOfItems, setNumberOfItems] = useState('5');

  const blockProps = useBlockProps();
  const prompt = usePrompts('generate_faq_section_prompt');
  const service = useService('generate_faq_section_prompt_service');

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

  const generate = useCallback(async () => {
    showLoadingMessage(__('FAQs', 'filter-ai'));

    try {
      const faqs = await ai.getFAQsFromContent(content, numberOfItems, oldFAQs, prompt, service?.slug);

      if (!faqs) {
        throw new Error(__('Sorry, there has been an issue while generating your FAQs.', 'filter-ai'));
      }

      console.log({ faqs });

      // todo update faqs
      /*
"[{question:"What environments do bears inhabit?",answer:"Bears live in diverse environments ranging from the Arctic's frozen regions to dense tropical forests."},{question:"Why are bears important to ecosystems?",answer:"They act as apex predators, help in seed dispersal, and maintain ecological balance."},{question:"What threats are bears currently facing?",answer:"Bears are threatened by climate change, habitat destruction, and human activities."},{question:"How do bears contribute to seed distribution?",answer:"By consuming fruits and plants, bears spread seeds through their droppings, aiding plant growth."},{question:"What is the significance of bear conservation efforts?",answer:"Conservation is essential to protect bear populations and preserve the health of their natural habitats."}]"
      */

      let message = __('FAQs has been added', 'filter-ai');

      if (service?.metadata.name) {
        message = sprintf(__('FAQs has been added using %s', 'filter-ai'), service.metadata.name);
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
        <PanelBody title={__('Generate FAQs', 'filter-ai')} initialOpen>
          <PanelRow>
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
        <AlignmentToolbar value={attributes.title_align} onChange={(value) => setAttributes({ titleAlign: value })} />
      </BlockControls>
      <div className="alignfull" style={{ backgroundColor: attributes.backgroundColor }}>
        <div {...blockProps}>
          <RichText
            key="faqs-title-edit"
            value={attributes.title || ''}
            onChange={(value) => setAttributes({ title: value })}
            tagName="h2"
            placeholder={__('Frequenty Asked Questions', 'filter-ai')}
            className="filter-ai-faqs-title"
            style={{
              textAlign: attributes.title_align as React.CSSProperties['textAlign'],
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

/*
  todo
  [ ] add block sidebar settings
  * background colour
  * text colour (also updates marker colour)
  * "Generate FAQs Content" section
  ** field to enter number of faqs to create (default 5)
  [ ] disable section if settings turned off
*/
