import { MenuItem, Popover, NavigableMenu } from '@wordpress/components';
import { useMemo, useState } from '@wordpress/element';
import { hideLoadingMessage, showLoadingMessage, showNotice, ai, removeWrappingQuotes } from '@/utils';
import { BlockEditProps } from '@/types';
import { useSettings } from '@/settings';
import { insert, toHTMLString, slice, create } from '@wordpress/rich-text';
import { useSelect } from '@wordpress/data';
import { ToolbarButton } from '@/components/toolbarButton';
import { __, sprintf } from '@wordpress/i18n';
import { usePrompts } from '@/utils/ai/prompts/usePrompts';

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

type OnClick = (promptKey: string, params?: Record<string, string>) => Promise<void>;

export const TextToolbar = ({ attributes, setAttributes, name }: BlockEditProps) => {
  const [changeToneAnchor, setChangeToneAnchor] = useState<HTMLButtonElement | null>(null);
  const [showChangeToneOptions, setShowChangeToneOptions] = useState(false);

  const { settings } = useSettings();

  const rewritePrompt = usePrompts('customise_text_rewrite_prompt');
  const expandPrompt = usePrompts('customise_text_expand_prompt');
  const condensePrompt = usePrompts('customise_text_condense_prompt');
  const summarisePrompt = usePrompts('customise_text_summarise_prompt');
  const changeTonePrompt = usePrompts('customise_text_change_tone_prompt');

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

  const { type, label } = useMemo(() => {
    switch (name) {
      case 'core/heading':
        return { type: 'heading', label: __('Heading', 'filter-ai') };
      case 'core/list-item':
        return { type: 'list item', label: __('List Item', 'filter-ai') };
      default:
        return { type: 'text', label: __('Text', 'filter-ai') };
    }
  }, [name]);

  const onClick: OnClick = async (promptKey, params) => {
    if (promptKey === 'customise_text_summarise_prompt') {
      showLoadingMessage(label, 'summarising');
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

      let prompt = (() => {
        switch (promptKey) {
          case 'customise_text_rewrite_prompt':
            return rewritePrompt;
          case 'customise_text_expand_prompt':
            return expandPrompt;
          case 'customise_text_condense_prompt':
            return condensePrompt;
          case 'customise_text_summarise_prompt':
            return summarisePrompt;
          case 'customise_text_change_tone_prompt':
            return changeTonePrompt;
          default:
            return null;
        }
      })();

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
          prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), params[key]);
        }
      }

      let newText = await ai.customiseText(feature, text, prompt);

      if (!newText) {
        throw new Error(sprintf(__('Sorry, there has been an issue while generating your %s', 'filter-ai'), label));
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

        showNotice({ message: sprintf(__('Your %s has been updated', 'filter-ai'), label.toLowerCase()) });
      }
    } catch (error) {
      console.error(error);

      // @ts-expect-error Property 'message' does not exist on type '{}'
      showNotice({ message: error?.message || error, type: 'error' });
    } finally {
      hideLoadingMessage();
    }
  };

  if (
    hasMultiSelection ||
    ![
      settings?.customise_text_rewrite_enabled,
      settings?.customise_text_expand_enabled,
      settings?.customise_text_condense_enabled,
      settings?.customise_text_summarise_enabled,
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
