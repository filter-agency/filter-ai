import { useSettings } from '@/settings';
import { ai, hideLoadingMessage, showLoadingMessage, showNotice } from '@/utils';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { usePrompts } from '@/utils/ai/prompts/usePrompts';

declare var wp: {
  data: any;
  blocks: any;
};

const detectBlockEditor = (): boolean => {
  const hasBlockEditorDOM =
    document.body.classList.contains('block-editor-page') ||
    document.querySelector('.block-editor') !== null ||
    document.querySelector('#editor') !== null;

  const hasBlockEditorGlobals = typeof wp !== 'undefined' && wp.data && wp.blocks;

  return hasBlockEditorDOM && hasBlockEditorGlobals;
};

const getClassicEditorData = () => {
  let content = '';
  let oldExcerpt = '';

  if (window.tinymce?.editors?.content) {
    content = window.tinymce.editors.content.getContent();
  } else if (document.getElementById('content')) {
    content = (document.getElementById('content') as HTMLTextAreaElement)?.value || '';
  }

  const excerptField = document.getElementById('excerpt') as HTMLTextAreaElement;
  oldExcerpt = excerptField?.value || '';

  return { content, oldExcerpt };
};

const updateClassicEditorExcerpt = (excerpt: string): boolean => {
  const excerptField = document.getElementById('excerpt') as HTMLTextAreaElement;
  if (!excerptField) {
    throw new Error(__('Could not find excerpt field to update.', 'filter-ai'));
  }

  excerptField.value = excerpt;
  excerptField.dispatchEvent(new Event('input', { bubbles: true }));
  excerptField.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
};

const updateBlockEditorExcerpt = async (
  editPost: (post: { excerpt: string }) => void,
  excerpt: string
): Promise<boolean> => {
  try {
    editPost({ excerpt });
    return true;
  } catch (error) {
    return false;
  }
};

interface BlockEditorData {
  content: string | null;
  oldExcerpt: string | null;
  editPost: ((post: { excerpt: string }) => void) | null;
}

export const useGenerateExcerpt = () => {
  const { settings } = useSettings();
  const prompt = usePrompts('post_excerpt_prompt');
  const isBlockEditor = detectBlockEditor();

  interface CoreEditorSelectors {
    getEditedPostAttribute: (attribute: 'content' | 'excerpt') => any;
    getCurrentPostType: () => string;
    isEditorPanelEnabled: (panelName: string) => boolean;
  }

  const blockEditorData = useSelect(
    (select): BlockEditorData => {
      if (!isBlockEditor) {
        return { content: null, oldExcerpt: null, editPost: null };
      }

      const editorSelect = select('core/editor') as unknown as CoreEditorSelectors;
      const dispatch = wp.data.dispatch('core/editor');

      if (
        !editorSelect ||
        typeof editorSelect.getEditedPostAttribute !== 'function' ||
        typeof editorSelect.getCurrentPostType !== 'function' ||
        typeof editorSelect.isEditorPanelEnabled !== 'function' ||
        !dispatch ||
        typeof dispatch.editPost !== 'function'
      ) {
        return { content: null, oldExcerpt: null, editPost: null };
      }

      const excerptPanelEnabled =
        !['wp_template', 'wp_template_part', 'wp_block'].includes(editorSelect.getCurrentPostType()) &&
        editorSelect.isEditorPanelEnabled('post-excerpt');

      if (!excerptPanelEnabled) {
        return { content: null, oldExcerpt: null, editPost: null };
      }

      return {
        content: editorSelect.getEditedPostAttribute('content'),
        oldExcerpt: editorSelect.getEditedPostAttribute('excerpt'),
        editPost: dispatch.editPost,
      };
    },
    [isBlockEditor]
  );

  const onClick = async () => {
    showLoadingMessage(__('Excerpt', 'filter-ai'));

    try {
      const { content, oldExcerpt } =
        isBlockEditor && blockEditorData.content !== null
          ? { content: blockEditorData.content, oldExcerpt: blockEditorData.oldExcerpt }
          : getClassicEditorData();

      if (!content) {
        throw new Error(__('No content available to generate an excerpt from.', 'filter-ai'));
      }

      // Convert null to undefined to satisfy the expected type
      const generatedExcerpt = await ai.getExcerptFromContent(content, oldExcerpt ?? undefined, prompt);
      if (!generatedExcerpt) {
        throw new Error(__('Sorry, there has been an issue while generating your excerpt.', 'filter-ai'));
      }

      let updateSuccessful = false;

      if (isBlockEditor && blockEditorData.editPost) {
        updateSuccessful = await updateBlockEditorExcerpt(blockEditorData.editPost, generatedExcerpt);
      } else {
        updateSuccessful = updateClassicEditorExcerpt(generatedExcerpt);
      }

      if (updateSuccessful) {
        showNotice({ message: __('Excerpt has been updated', 'filter-ai') });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showNotice({
        message: errorMessage,
        type: 'error',
      });
    } finally {
      hideLoadingMessage();
    }
  };

  const isExcerptPanelEnabled = isBlockEditor ? blockEditorData.content !== null : !!document.getElementById('excerpt');

  if (!isExcerptPanelEnabled || !settings?.post_excerpt_enabled) {
    return null;
  }

  return {
    title: __('Generate Excerpt', 'filter-ai'),
    onClick,
  };
};
