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

export const useGenerateExcerpt = () => {
  const { settings } = useSettings();
  const { editPost } = useDispatch('core/editor') || {};

  const prompt = usePrompts('post_excerpt_prompt');
  const service = useService('post_excerpt_prompt_service');

  const { excerptPanelEnabled, content, oldExcerpt } = useSelect((select) => {
    const { getCurrentPostType, isEditorPanelEnabled, getEditedPostAttribute } = select('core/editor') || {};

    // @ts-expect-error Type 'never' has no call signatures.
    const postType = getCurrentPostType?.();

    // check if post type uses excerpt
    // based on logic within https://github.com/WordPress/gutenberg/blob/trunk/packages/editor/src/components/post-excerpt/panel.js
    const _excerptPanelEnabled =
      // @ts-expect-error Type 'never' has no call signatures.
      (!['wp_template', 'wp_template_part', 'wp_block'].includes(postType) && isEditorPanelEnabled?.('post-excerpt')) ||
      !!document.getElementById('excerpt');

    // @ts-expect-error Type 'never' has no call signatures.
    const _content = getEditedPostAttribute?.('content');

    // @ts-expect-error Type 'never' has no call signatures.
    const _oldExcerpt = getEditedPostAttribute?.('excerpt');

    return {
      excerptPanelEnabled: _excerptPanelEnabled,
      content: _content,
      oldExcerpt: _oldExcerpt,
    };
  }, []);

  const onClick = async () => {
    showLoadingMessage(__('Generating Excerpts', 'filter-ai'));

    try {
      const _content = content || window.tinymce?.editors?.content?.getContent();

      const excerptField = document.getElementById('excerpt') as HTMLTextAreaElement;
      const _oldExcerpt = oldExcerpt || excerptField?.value;

      const [excerpt1, excerpt2, excerpt3] = await Promise.all([
        ai.getExcerptFromContent(_content, _oldExcerpt, prompt, service?.slug),
        ai.getExcerptFromContent(_content, _oldExcerpt, prompt, service?.slug),
        ai.getExcerptFromContent(_content, _oldExcerpt, prompt, service?.slug),
      ]);

      if (!excerpt1 || !excerpt2 || !excerpt3) {
        throw new Error(__('Sorry, there has been an issue while generating your excerpts.', 'filter-ai'));
      }

      setCustomiseTextOptionsModal({
        options: [removeWrappingQuotes(excerpt1), removeWrappingQuotes(excerpt2), removeWrappingQuotes(excerpt3)],
        choice: '',
        type: 'excerpt',
        context: {
          content: _content,
          text: _oldExcerpt,
          prompt,
          service: service?.slug,
          serviceName: service?.metadata.name,
          hasSelection: false,
          selectionStart: null,
          selectionEnd: null,
          label: __('Excerpt', 'filter-ai'),
          feature: 'excerpt',
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

  if (!excerptPanelEnabled || !settings?.post_excerpt_enabled) {
    return;
  }

  return {
    title: __('Generate Excerpt', 'filter-ai'),
    onClick,
  };
};
