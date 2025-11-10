import { __, sprintf } from '@wordpress/i18n';
import {
  AlignmentToolbar,
  BlockControls,
  InnerBlocks,
  InspectorControls,
  RichText,
  useBlockProps,
} from '@wordpress/block-editor';
import { Button, PanelBody, PanelRow, TextControl } from '@wordpress/components';
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

const extractSummary = (content: string) => {
  const summaryRegex = new RegExp(/(<!-- wp:filter-ai\/summary -->[\s\S]*?<!-- \/wp:filter-ai\/summary -->)/, 'g');

  const matches = [...content.matchAll(summaryRegex)];

  const _oldSummary = matches.map((match) => match[0]).join('');

  const _content = content.replace(summaryRegex, '');

  return { _oldSummary, _content };
};

const SummaryEdit = ({ attributes, setAttributes, clientId }: Props) => {
  const blockProps = useBlockProps({ className: 'alignfull' });
  const prompt = usePrompts('generate_summary_section_prompt');
  const service = useService('generate_summary_section_prompt_service');
  const { settings } = useSettings();

  const isEnabled = useMemo(() => settings?.generate_summary_section_enabled, [settings]);

  const { replaceInnerBlocks } = useDispatch('core/block-editor');

  const { content, oldSummary } = useSelect((select) => {
    const { getEditedPostAttribute } = select('core/editor') || {};

    // @ts-expect-error Type 'never' has no call signatures.
    const _rawContent = getEditedPostAttribute?.('content');

    const { _content, _oldSummary } = extractSummary(_rawContent);

    return {
      content: _content,
      oldSummary: _oldSummary,
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
    showLoadingMessage(__('summary', 'filter-ai'));

    try {
      const newSummary = await ai.getSummaryFromContent(content, oldSummary, prompt, service?.slug);

      if (!newSummary) {
        throw new Error(__('Sorry, there has been an issue while generating your summary.', 'filter-ai'));
      }

      let newInnerBlocks;

      try {
        const newSummaryItems = JSON.parse(newSummary);

        newInnerBlocks = createBlock(
          'core/list',
          {},
          newSummaryItems?.map((item: string) => createBlock('core/list-item', { content: item }))
        );
      } catch (_e) {
        newInnerBlocks = createBlock('core/paragraph', { content: newSummary });
      }

      replaceInnerBlocks(clientId, [...existingInnerBlocks, newInnerBlocks]);

      let message = __('Summary has been added', 'filter-ai');

      if (service?.metadata.name) {
        message = sprintf(__('Summary has been added using %s', 'filter-ai'), service.metadata.name);
      }

      showNotice({ message });
    } catch (error) {
      console.error(error);

      // @ts-expect-error Property 'message' does not exist on type '{}'
      showNotice({ message: error?.message || error, type: 'error' });
    } finally {
      hideLoadingMessage();
    }
  }, [content, oldSummary, prompt, service, showNotice, hideLoadingMessage, showLoadingMessage]);

  return (
    <>
      <InspectorControls>
        <PanelBody title={__('Generate Summary Content', 'filter-ai')} initialOpen={isEnabled}>
          <PanelRow>
            {isEnabled ? (
              <fieldset>
                <Button onClick={generate} variant="secondary">
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
      </InspectorControls>
      <BlockControls>
        <AlignmentToolbar value={attributes.titleAlign} onChange={(value) => setAttributes({ titleAlign: value })} />
      </BlockControls>
      <div {...blockProps}>
        <div className="inner">
          <InnerBlocks
            allowedBlocks={['core/heading', 'core/paragraph', 'core/list']}
            template={[['core/heading', { content: "TL;DR (Too Long; Didn't Read)" }]]}
          />
        </div>
      </div>
    </>
  );
};

export default SummaryEdit;
