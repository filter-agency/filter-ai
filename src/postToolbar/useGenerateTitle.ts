import { useSettings } from '@/settings';
import {
  ai,
  hideLoadingMessage,
  removeWrappingQuotes,
  showLoadingMessage,
  showNotice,
  setCustomiseTextOptionsModal,
} from '@/utils';
import { useDispatch, useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { usePrompts } from '@/utils/ai/prompts/usePrompts';
import { useService } from '@/utils/ai/services/useService';

const MULTI_OPTION_CONFIG = {
  count: 3,
  delimiter: '###OPTION###',
  instruction: (count: number) =>
    `Generate exactly ${count} distinct variations. Do not number each variation. Separate each variation with the delimiter: ###OPTION###`,
};

export const useGenerateTitle = () => {
  const { settings } = useSettings();
  const { editPost } = useDispatch('core/editor') || {};

  const prompt = usePrompts('post_title_prompt');
  const service = useService('post_title_prompt_service');

  const { content, oldTitle } = useSelect((select) => {
    const { getEditedPostAttribute } = select('core/editor') || {};

    // @ts-expect-error Type 'never' has no call signatures.
    const _content = getEditedPostAttribute?.('content');

    // @ts-expect-error Type 'never' has no call signatures.
    const _title = getEditedPostAttribute?.('title');

    return {
      content: _content,
      oldTitle: _title,
    };
  }, []);

  const onClick = async () => {
    showLoadingMessage(__('Generating Titles', 'filter-ai'));

    try {
      const _content = content || window.tinymce?.editors?.content?.getContent();

      const titleField = document.getElementById('title') as HTMLInputElement;
      const _oldTitle = oldTitle || titleField?.value;

      const multiOptionPrompt = `${prompt} ${MULTI_OPTION_CONFIG.instruction(MULTI_OPTION_CONFIG.count)}`;

      const response = await ai.getTitleFromContent(_content, _oldTitle, multiOptionPrompt, service?.slug);

      if (!response) {
        throw new Error(__('Sorry, there has been an issue while generating your titles.', 'filter-ai'));
      }

      console.log('TAGS RESPONSE:', response);
      console.log('TYPE:', typeof response);

      const parsedOptions =
        typeof response === 'string'
          ? response
              .split(MULTI_OPTION_CONFIG.delimiter)
              .map((opt) => opt.trim())
              .filter((opt) => opt.length > 0)
          : [String(response)];

      if (!parsedOptions || parsedOptions.length < MULTI_OPTION_CONFIG.count) {
        throw new Error(__('Sorry, AI did not generate 3 options. Please try again.', 'filter-ai'));
      }

      const generatedOptions = parsedOptions.slice(0, MULTI_OPTION_CONFIG.count).map(removeWrappingQuotes);

      setCustomiseTextOptionsModal({
        options: generatedOptions,
        choice: '',
        type: 'title',
        context: {
          content: _content,
          text: _oldTitle,
          prompt,
          service: service?.slug,
          serviceName: service?.metadata.name,
          hasSelection: false,
          selectionStart: null,
          selectionEnd: null,
          label: __('Title', 'filter-ai'),
          feature: 'title',
        },
      });
    } catch (error) {
      console.error(error);

      // @ts-expect-error Property 'message' does not exist on type '{}'
      showNotice({ message: error?.message || error, type: 'error' });
    } finally {
      hideLoadingMessage();
    }
  };

  if (!settings?.post_title_enabled) {
    return;
  }

  return {
    title: __('Generate Title', 'filter-ai'),
    onClick,
  };
};
