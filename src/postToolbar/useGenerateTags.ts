import { useSettings } from '@/settings';
import {
  ai,
  hideLoadingMessage,
  showLoadingMessage,
  showNotice,
  setCustomiseTextOptionsModal,
  removeWrappingQuotes,
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

export const useGenerateTags = () => {
  const { settings } = useSettings();
  const { editPost } = useDispatch('core/editor') || {};

  const prompt = usePrompts('post_tags_prompt');
  const service = useService('post_tags_prompt_service');

  const errorMessage = __('Sorry, there has been an issue while generating your tags.', 'filter-ai');

  const { tagsEnabled, content, postTagIds, postTags } = useSelect((select) => {
    const { getCurrentPostType, getEditedPostAttribute } = select('core/editor') || {};
    const { getEntityRecords, getTaxonomy } = select('core');

    // @ts-expect-error Type 'never' has no call signatures.
    const postType = getCurrentPostType?.() || document.getElementById('post_type')?.value;

    // @ts-expect-error Type 'never' has no call signatures.
    const taxonomy = getTaxonomy('post_tag');

    const _tagsEnabled = taxonomy?.types.includes(postType) && taxonomy?.visibility?.show_ui;

    // @ts-expect-error Type 'never' has no call signatures.
    const _content = getEditedPostAttribute?.('content');

    // @ts-expect-error Type 'never' has no call signatures.
    const _postTagIds = getEditedPostAttribute?.('tags') || [];

    // @ts-expect-error Type 'never' has no call signatures.
    const _postTags = getEntityRecords('taxonomy', 'post_tag', { include: _postTagIds })?.map((tag) => tag.name);

    return {
      tagsEnabled: _tagsEnabled,
      content: _content,
      postTagIds: _postTagIds,
      postTags: _postTags,
    };
  }, []);

  const onClick = async () => {
    showLoadingMessage(__('Generating Tags', 'filter-ai'));

    try {
      const _content = content || window.tinymce?.editors?.content?.getContent();
      const _postTags =
        (postTags?.length
          ? postTags
          : document
              .getElementById('tax-input-post_tag')
              // @ts-expect-error
              ?.value?.split(',')
              .map((i: string) => i.trim())) || [];

      const multiOptionPrompt = `${prompt} ${MULTI_OPTION_CONFIG.instruction(MULTI_OPTION_CONFIG.count)}`;

      const response = await ai.getTagsFromContent(_content, _postTags, multiOptionPrompt, service?.slug);

      if (!response) {
        throw new Error(errorMessage);
      }

      const aiText = Array.isArray(response) ? response.join('\n') : response;

      const parsedOptions = aiText
        .split(MULTI_OPTION_CONFIG.delimiter)
        .map((opt) => opt.trim())
        .filter(Boolean);

      if (!parsedOptions || parsedOptions.length < MULTI_OPTION_CONFIG.count) {
        throw new Error(__('Sorry, AI did not generate 3 options. Please try again.', 'filter-ai'));
      }

      const generatedOptions = parsedOptions.slice(0, MULTI_OPTION_CONFIG.count).map(removeWrappingQuotes);

      setCustomiseTextOptionsModal({
        options: generatedOptions,
        choice: '',
        type: 'tags',
        context: {
          content: _content,
          text: _postTags?.join(', ') || '',
          prompt,
          service: service?.slug,
          serviceName: service?.metadata.name,
          hasSelection: false,
          selectionStart: null,
          selectionEnd: null,
          label: __('Tags', 'filter-ai'),
          feature: 'tags',
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

  if (!tagsEnabled || !settings?.post_tags_enabled) {
    return;
  }

  return {
    title: __('Generate Tags', 'filter-ai'),
    onClick,
  };
};
