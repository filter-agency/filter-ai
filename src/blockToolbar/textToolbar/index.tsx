import { MenuItem, Popover, NavigableMenu } from '@wordpress/components';
import { useMemo, useState } from '@wordpress/element';
import { capitalize, hideLoadingMessage, showLoadingMessage, t, showNotice, ai, removeWrappingQuotes } from '@/utils';
import { BlockEditProps } from '@/types';
import { useSettings } from '@/settings';
import { insert, toHTMLString, slice, create } from '@wordpress/rich-text';
import { useSelect } from '@wordpress/data';
import { ToolbarButton } from '@/components/toolbarButton';

const tones = ['professional', 'informal', 'humorous', 'helpful'];

type OnClick = (promptKey: keyof typeof ai.prompts, params?: Record<string, string>) => Promise<void>;

export const TextToolbar = ({ attributes, setAttributes, name }: BlockEditProps) => {
  const [changeToneAnchor, setChangeToneAnchor] = useState<HTMLButtonElement | null>(null);
  const [showChangeToneOptions, setShowChangeToneOptions] = useState(false);

  const { settings } = useSettings();

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

  const type = useMemo(() => {
    switch (name) {
      case 'core/heading':
        return 'heading';
      case 'core/list-item':
        return 'list item';
      default:
        return 'text';
    }
  }, [name]);

  const onClick: OnClick = async (promptKey, params) => {
    if (promptKey === 'customise_text_summarise_prompt') {
      showLoadingMessage(t(`Summarising ${type}`));
    } else {
      showLoadingMessage(t(`Customising ${type}`));
    }

    try {
      const feature = promptKey.replace(/_/g, '-');

      const content =
        typeof attributes.content === 'string' ? create({ text: attributes.content }) : attributes.content;

      if (!content) {
        throw new Error(t('Please provide some text'));
      }

      const text = toHTMLString({
        value: hasSelection ? slice(content, selectionStart.offset, selectionEnd.offset) : content,
      });

      let prompt = settings?.[promptKey] || ai.prompts[promptKey];

      if (params) {
        for (const key in params) {
          prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), params[key]);
        }
      }

      let newText = await ai.customiseText(feature, text, prompt);

      if (!newText) {
        throw new Error(t(`Sorry, there has been an issue while generating your ${type}.`));
      }

      newText = removeWrappingQuotes(newText);

      if (promptKey === 'customise_text_summarise_prompt') {
        await navigator.clipboard.writeText(newText);

        showNotice({ message: t('Summary has been copied to your clipboard') });
      } else {
        if (hasSelection) {
          const newValue = insert(content, newText, selectionStart.offset, selectionEnd.offset);

          setAttributes({ content: toHTMLString({ value: newValue }) });

          setTimeout(() => document.getSelection()?.empty(), 0);
        } else {
          setAttributes({ content: newText });
        }

        showNotice({ message: t(`Your ${type} has been updated`) });
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
                onClick('customise_text_rewrite_prompt', { type });
              }}
            >
              {t('Rewrite')}
            </MenuItem>
          )}
          {settings?.customise_text_expand_enabled && (
            <MenuItem
              onClick={() => {
                onClose();
                onClick('customise_text_expand_prompt', { type });
              }}
            >
              {t('Expand')}
            </MenuItem>
          )}
          {settings?.customise_text_condense_enabled && (
            <MenuItem
              onClick={() => {
                onClose();
                onClick('customise_text_condense_prompt', { type });
              }}
            >
              {t('Condense')}
            </MenuItem>
          )}
          {settings?.customise_text_summarise_enabled && (
            <MenuItem
              onClick={() => {
                onClose();
                onClick('customise_text_summarise_prompt', { type });
              }}
            >
              {t('Summarise')}
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
                {t('Change Tone')}
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
                          onClick('customise_text_change_tone_prompt', { tone, type });
                        }}
                      >
                        {t(capitalize(tone))}
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
