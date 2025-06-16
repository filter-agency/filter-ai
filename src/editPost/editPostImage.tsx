import { DropdownMenu } from '@/components/dropdownMenu';
import { useSettings } from '@/settings';
import { ai, hideLoadingMessage, showLoadingMessage, showNotice } from '@/utils';
import { useDispatch, useSelect } from '@wordpress/data';
import { createRoot, useCallback, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {usePrompts} from "@/utils/ai/prompts/usePrompts";

const Toolbar = () => {
  const { settings } = useSettings();
  const { saveEntityRecord } = useDispatch('core');

  const postId = useMemo(() => {
    const params = new URLSearchParams(location.search);

    return params.get('post');
  }, []);

  const { altText, imageUrl } = useSelect((select) => {
    const { getEntityRecord } = select('core');

    // @ts-expect-error Type 'never' has no call signatures.
    const post = getEntityRecord('postType', 'attachment', postId);

    return {
      altText: post?.alt_text,
      imageUrl: post?.media_details?.sizes?.medium?.source_url,
    };
  }, []);

  const updateAltText = useCallback(async () => {
    showLoadingMessage(__('Alt Text', 'filter-ai'));

    try {

      const prompt = usePrompts('image_alt_text_prompt');
      const newAltText = await ai.getAltTextFromUrl(imageUrl, altText, prompt);

      if (!newAltText) {
        throw new Error(__('Sorry, there has been an issue while generating your alt text.', 'filter-ai'));
      }

      await saveEntityRecord('postType', 'attachment', { id: postId, alt_text: newAltText });
      if (document.getElementById('attachment_alt')) {
        // @ts-expect-error
        document.getElementById('attachment_alt').value = newAltText;
      }

      showNotice({ message: __('Alt text has been updated.', 'filter-ai') });
    } catch (error) {
      console.error(error);

      // @ts-expect-error Property 'message' does not exist on type '{}'
      showNotice({ message: error?.message || error, type: 'error' });
    } finally {
      hideLoadingMessage();
    }
  }, [imageUrl, altText]);

  const controls = useMemo(() => {
    const options = [];

    if (settings?.image_alt_text_enabled) {
      options.push({
        title: __('Generate Alt Text', 'filter-ai'),
        onClick: updateAltText,
      });
    }

    return options;
  }, [settings, updateAltText]);

  return <DropdownMenu controls={controls} text="Filter AI" />;
};

export const editPostImage = () => {
  const containerId = 'filter-ai-edit-post-image-container';
  const section = document.querySelector('.wp_attachment_details.edit-form-section');

  if (!section || !document.getElementById('attachment_alt') || document.getElementById(containerId)) {
    return;
  }

  const container = document.createElement('div');
  container.id = containerId;

  const root = createRoot(container);

  section.prepend(container);

  root.render(<Toolbar />);
};
