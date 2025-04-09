import { useSettings } from '@/settings';
import { ai, hideLoadingMessage, showLoadingMessage, showNotice, t } from '@/utils';
import { useDispatch, useSelect, resolveSelect, dispatch } from '@wordpress/data';
import { cleanForSlug } from '@wordpress/url';

export const useGenerateTags = () => {
  const { settings } = useSettings();
  const { editPost } = useDispatch('core/editor');

  const errorMessage = t('Sorry, there has been an issue while generating your tags.');

  const { tagsEnabled, content, postTagIds, postTags } = useSelect((select) => {
    const { getCurrentPostType, getEditedPostAttribute } = select('core/editor');
    const { getEntityRecords, getTaxonomy } = select('core');

    // @ts-expect-error Type 'never' has no call signatures.
    const postType = getCurrentPostType();

    // @ts-expect-error Type 'never' has no call signatures.
    const taxonomy = getTaxonomy('post_tag');

    // based on logic within https://github.com/WordPress/gutenberg/blob/trunk/packages/editor/src/components/post-taxonomies/index.js
    const _tagsEnabled = taxonomy?.types.includes(postType) && taxonomy?.visibility?.show_ui;

    // @ts-expect-error Type 'never' has no call signatures.
    const _content = getEditedPostAttribute('content');

    // @ts-expect-error Type 'never' has no call signatures.
    const _postTagIds = getEditedPostAttribute('tags');

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
    showLoadingMessage(t('Generating tags'));

    try {
      const tags = await ai.getTagsFromContent(content, postTags, settings?.post_tags_prompt);

      if (!tags) {
        throw new Error(errorMessage);
      }

      const newTagIds = [];

      for (let i = 0; i < tags.length; i++) {
        // check if tag already exists
        const existingTag = await resolveSelect('core').getEntityRecords('taxonomy', 'post_tag', {
          slug: cleanForSlug(tags[i]),
        });

        if (existingTag?.[0]?.id) {
          newTagIds.push(existingTag[0].id);
          continue;
        }

        // add tag if they don't exist
        // @ts-expect-error Property 'saveEntityRecord' does not exist on type '{}'.
        const newTag = await dispatch('core')?.saveEntityRecord('taxonomy', 'post_tag', { name: tags[i] });

        if (newTag?.id) {
          newTagIds.push(newTag.id);
        }
      }

      if (newTagIds.length === 0) {
        throw new Error(errorMessage);
      }

      editPost({ tags: [...new Set([...postTagIds, ...newTagIds])] });

      showNotice(t('Tags have been updated'));
    } catch (error) {
      console.error(error);

      // @ts-expect-error Property 'message' does not exist on type '{}'
      showNotice(error?.message || error);
    } finally {
      hideLoadingMessage();
    }
  };

  if (!tagsEnabled || !settings?.post_tags_enabled) {
    return;
  }

  return {
    title: t('Generate Tags'),
    onClick,
  };
};
