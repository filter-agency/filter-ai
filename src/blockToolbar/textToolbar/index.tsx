import { MenuItem, Popover, NavigableMenu } from '@wordpress/components';
import { useMemo, useState, useEffect } from '@wordpress/element';
import {
  hideLoadingMessage,
  showLoadingMessage,
  showNotice,
  ai,
  removeWrappingQuotes,
  showGrammarCheckModal,
  useGrammarCheckModal,
  resetGrammarCheckModal,
} from '@/utils';
import { BlockEditProps } from '@/types';
import { useSettings } from '@/settings';
import { insert, toHTMLString, slice, create } from '@wordpress/rich-text';
import { useSelect, select, dispatch } from '@wordpress/data';
import { ToolbarButton } from '@/components/toolbarButton';
import { __, sprintf } from '@wordpress/i18n';
import { usePrompts } from '@/utils/ai/prompts/usePrompts';
import { useService } from '@/utils/ai/services/useService';

const tones = [
  {
    key: 'professional',
    label: __('Professional', 'filter-ai'),
  },
  {
    key: 'informal',
    label: __('Informal', 'filter-ai'),
  },
  { key: 'humorous', label: __('Humorous', 'filter-ai') },
  { key: 'helpful', label: __('Helpful', 'filter-ai') },
];

type PromptKey =
  | 'customise_text_rewrite_prompt'
  | 'customise_text_expand_prompt'
  | 'customise_text_condense_prompt'
  | 'customise_text_summarise_prompt'
  | 'customise_text_check_grammar_prompt'
  | 'customise_text_change_tone_prompt';

type OnClick = (promptKey: string, params?: Record<string, string>) => Promise<void>;

export const TextToolbar = ({ attributes, setAttributes, name }: BlockEditProps) => {
  const [changeToneAnchor, setChangeToneAnchor] = useState<HTMLButtonElement | null>(null);
  const [showChangeToneOptions, setShowChangeToneOptions] = useState(false);

  const { settings } = useSettings();

  const rewritePrompt = usePrompts('customise_text_rewrite_prompt');
  const rewritePromptService = useService('customise_text_rewrite_prompt_service');

  const expandPrompt = usePrompts('customise_text_expand_prompt');
  const expandPromptService = useService('customise_text_expand_prompt_service');

  const condensePrompt = usePrompts('customise_text_condense_prompt');
  const condensePromptService = useService('customise_text_condense_prompt_service');

  const summarisePrompt = usePrompts('customise_text_summarise_prompt');
  const summarisePromptService = useService('customise_text_summarise_prompt_service');

  const checkGrammarPrompt = usePrompts('customise_text_check_grammar_prompt');
  const checkGrammarPromptService = useService('customise_text_check_grammar_service');

  const changeTonePrompt = usePrompts('customise_text_change_tone_prompt');
  const changeTonePromptService = useService('customise_text_change_tone_prompt_service');

  const promptConfigs = useMemo(
    () => ({
      customise_text_rewrite_prompt: {
        prompt: rewritePrompt,
        service: rewritePromptService,
      },
      customise_text_expand_prompt: {
        prompt: expandPrompt,
        service: expandPromptService,
      },
      customise_text_condense_prompt: {
        prompt: condensePrompt,
        service: condensePromptService,
      },
      customise_text_summarise_prompt: {
        prompt: summarisePrompt,
        service: summarisePromptService,
      },
      customise_text_check_grammar_prompt: {
        prompt: checkGrammarPrompt,
        service: checkGrammarPromptService,
      },
      customise_text_change_tone_prompt: {
        prompt: changeTonePrompt,
        service: changeTonePromptService,
      },
    }),
    [
      rewritePrompt,
      expandPrompt,
      condensePrompt,
      summarisePrompt,
      changeTonePrompt,
      rewritePromptService,
      expandPromptService,
      condensePromptService,
      summarisePromptService,
      checkGrammarPromptService,
      changeTonePromptService,
      settings,
    ]
  );

  const { selectionStart, selectionEnd, hasMultiSelection } = useSelect(
    (select) => {
      const { getSelectionStart, getSelectionEnd, hasMultiSelection } = select('core/block-editor');

      // @ts-expect-error Type 'never' has no call signatures
      const _selectionStart = getSelectionStart();

      // @ts-expect-error Type 'never' has no call signatures
      const _selectionEnd = getSelectionEnd();

      // @ts-expect-error Type 'never' has no call signatures
      const _hasMultiSelection = hasMultiSelection();

      return {
        selectionStart: _selectionStart,
        selectionEnd: _selectionEnd,
        hasMultiSelection: _hasMultiSelection,
      };
    },
    [attributes.content]
  );

  const hasSelection = useMemo(() => {
    return selectionStart.clientId === selectionEnd.clientId && selectionStart.offset !== selectionEnd.offset;
  }, [selectionStart, selectionEnd]);

  const label = useMemo(() => {
    switch (name) {
      case 'core/heading':
        return __('Heading', 'filter-ai');
      case 'core/list-item':
        return __('List Item', 'filter-ai');
      default:
        return __('Text', 'filter-ai');
    }
  }, [name]);

  const grammarModal = useGrammarCheckModal();

  const onClick: OnClick = async (promptKey, params) => {
    const isValidPromptKey = (key: string): key is PromptKey => {
      return key in promptConfigs;
    };

    if (!isValidPromptKey(promptKey)) {
      console.error(`Invalid prompt key: ${promptKey}`);
      return;
    }

    const { prompt, service } = promptConfigs[promptKey as PromptKey] || {};

    if (promptKey === 'customise_text_summarise_prompt') {
      showLoadingMessage(label, 'summarising');
    } else if (promptKey === 'customise_text_check_grammar_prompt') {
      showLoadingMessage(label, 'checking grammar');
    } else {
      showLoadingMessage(label, 'customising');
    }

    try {
      const feature = promptKey.replace(/_/g, '-');

      const content =
        typeof attributes.content === 'string' ? create({ text: attributes.content }) : attributes.content;

      if (!content) {
        throw new Error(__('Please provide some text', 'filter-ai'));
      }

      const text = toHTMLString({
        value: hasSelection ? slice(content, selectionStart.offset, selectionEnd.offset) : content,
      });

      let finalPrompt = prompt;

      if (typeof prompt !== 'string') {
        throw new Error(
          __(
            "There was an error preparing your prompt. Please make sure that in plugin 'Settings' your prompt is a valid string.",
            'filter-ai'
          )
        );
      }

      if (params) {
        for (const key in params) {
          finalPrompt = finalPrompt.replace(new RegExp(`{{${key}}}`, 'g'), params[key]);
        }
      }

      if (promptKey === 'customise_text_check_grammar_prompt') {
        const correctedText = await ai.customiseText(feature, text, finalPrompt, service?.slug);

        console.log('showGrammarCheckModal');

        if (!correctedText) {
          throw new Error(sprintf(__('Sorry, there has been an issue while checking grammar', 'filter-ai')));
        }

        showGrammarCheckModal({
          originalText: text,
          correctedText: removeWrappingQuotes(correctedText),
          context: {
            content: attributes.content,
            hasSelection,
            selectionStart,
            selectionEnd,
            serviceName: service?.metadata.name,
          },
        });

        return;
      }

      let newText = await ai.customiseText(feature, text, finalPrompt, service?.slug);

      if (!newText) {
        throw new Error(
          sprintf(__('Sorry, there has been an issue while generating your %s', 'filter-ai'), label.toLowerCase())
        );
      }

      newText = removeWrappingQuotes(newText);

      if (promptKey === 'customise_text_summarise_prompt') {
        await navigator.clipboard.writeText(newText);

        showNotice({ message: __('Summary has been copied to your clipboard', 'filter-ai') });
      } else {
        if (hasSelection) {
          const newValue = insert(content, newText, selectionStart.offset, selectionEnd.offset);

          setAttributes({ content: toHTMLString({ value: newValue }) });

          setTimeout(() => document.getSelection()?.empty(), 0);
        } else {
          setAttributes({ content: newText });
        }

        let message = sprintf(__('Your %s has been updated', 'filter-ai'), label.toLowerCase());

        if (service?.metadata.name) {
          message = sprintf(
            __('Your %s has been updated using %s', 'filter-ai'),
            label.toLowerCase(),
            service.metadata.name
          );
        }

        showNotice({ message });
      }
    } catch (error) {
      console.error(error);

      // @ts-expect-error Property 'message' does not exist on type '{}'
      showNotice({ message: error?.message || error, type: 'error' });
    } finally {
      hideLoadingMessage();
    }
  };

  useEffect(() => {
    const { choice, context } = grammarModal;

    if (choice && context) {
      const { content, hasSelection, selectionStart, selectionEnd, serviceName } = context;

      try {
        const blockEditor = select('core/block-editor');
        const blockDispatcher = dispatch('core/block-editor') as {
          updateBlockAttributes: (clientId: string, attributes: Record<string, any>) => void;
        };

        const startId = selectionStart?.clientId;
        const endId = selectionEnd?.clientId;
        const sameBlock = startId && endId && startId === endId;
        const targetBlockId = sameBlock ? startId : endId;
        const targetBlock = blockEditor.getBlock(targetBlockId);

        if (targetBlock) {
          if (Object.prototype.hasOwnProperty.call(targetBlock.attributes, 'content')) {
            if (hasSelection) {
              const richContent = typeof content === 'string' ? create({ text: content }) : content;
              const newValue = insert(richContent, choice, selectionStart.offset, selectionEnd.offset);

              blockDispatcher.updateBlockAttributes(targetBlockId, {
                content: toHTMLString({ value: newValue }),
              });
            } else {
              blockDispatcher.updateBlockAttributes(targetBlockId, {
                content: choice,
              });
            }
          } else {
            setAttributes({ content: choice });
          }
        } else if (hasSelection) {
          const richContent = typeof content === 'string' ? create({ text: content }) : content;
          const newValue = insert(richContent, choice, selectionStart.offset, selectionEnd.offset);
          setAttributes({ content: toHTMLString({ value: newValue }) });
        } else {
          setAttributes({ content: choice });
        }

        setTimeout(() => document.getSelection()?.empty(), 0);

        let message = __('Grammar has been corrected', 'filter-ai');
        if (serviceName) {
          message = sprintf(__('Grammar has been corrected using %s', 'filter-ai'), serviceName);
        }

        showNotice({ message });
      } catch (error) {
        console.error('Error applying grammar correction:', error);
        showNotice({
          message: __('There was an issue applying the grammar correction.', 'filter-ai'),
          type: 'error',
        });
      } finally {
        resetGrammarCheckModal();
      }
    }
  }, [grammarModal.choice, grammarModal.context]);

  if (
    hasMultiSelection ||
    ![
      settings?.customise_text_rewrite_enabled,
      settings?.customise_text_expand_enabled,
      settings?.customise_text_condense_enabled,
      settings?.customise_text_summarise_enabled,
      settings?.customise_text_check_grammar_prompt,
      settings?.customise_text_change_tone_enabled,
    ].some((setting) => !!setting)
  ) {
    return null;
  }

  return (
    <ToolbarButton>
      {({ onClose }) => (
        <>
          {settings?.customise_text_rewrite_enabled && (
            <MenuItem
              onClick={() => {
                onClose();
                onClick('customise_text_rewrite_prompt', { type: label.toLowerCase() });
              }}
            >
              {__('Rewrite', 'filter-ai')}
            </MenuItem>
          )}
          {settings?.customise_text_expand_enabled && (
            <MenuItem
              onClick={() => {
                onClose();
                onClick('customise_text_expand_prompt', { type: label.toLowerCase() });
              }}
            >
              {__('Expand', 'filter-ai')}
            </MenuItem>
          )}
          {settings?.customise_text_condense_enabled && (
            <MenuItem
              onClick={() => {
                onClose();
                onClick('customise_text_condense_prompt', { type: label.toLowerCase() });
              }}
            >
              {__('Condense', 'filter-ai')}
            </MenuItem>
          )}
          {settings?.customise_text_summarise_enabled && (
            <MenuItem
              onClick={() => {
                onClose();
                onClick('customise_text_summarise_prompt', { type: label.toLowerCase() });
              }}
            >
              {__('Summarise', 'filter-ai')}
            </MenuItem>
          )}
          {settings?.customise_text_check_grammar_enabled && (
            <MenuItem
              onClick={() => {
                onClose();
                onClick('customise_text_check_grammar_prompt', { type: label.toLowerCase() });
              }}
            >
              {__('Check Grammar', 'filter-ai')}
            </MenuItem>
          )}
          {settings?.customise_text_change_tone_enabled && (
            <>
              <MenuItem
                ref={setChangeToneAnchor}
                onClick={() => {
                  setShowChangeToneOptions(true);
                }}
                isSelected={showChangeToneOptions}
                // @ts-expect-error Type 'string' is not assignable to type 'ReactElement<any, any>'
                icon="arrow-right-alt2"
                iconPosition="right"
              >
                {__('Change Tone', 'filter-ai')}
              </MenuItem>
              {showChangeToneOptions && (
                <Popover
                  className="components-dropdown__content"
                  anchor={changeToneAnchor}
                  placement="right-start"
                  expandOnMobile
                  onClose={() => setShowChangeToneOptions(false)}
                >
                  <NavigableMenu role="menu">
                    {tones.map((tone) => (
                      <MenuItem
                        key={tone.key}
                        onClick={() => {
                          onClose();
                          onClick('customise_text_change_tone_prompt', {
                            tone: tone.label.toLowerCase(),
                            type: label.toLowerCase(),
                          });
                        }}
                      >
                        {tone.label}
                      </MenuItem>
                    ))}
                  </NavigableMenu>
                </Popover>
              )}
            </>
          )}
        </>
      )}
    </ToolbarButton>
  );
};
