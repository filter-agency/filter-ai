import { generateText } from './services';
import { prompts } from './prompts/index';
import { capitalize } from '@/utils/capitalize';
import _ from 'underscore';
import { __ } from '@wordpress/i18n';

const maxNumber = 10;

const formatTags = (rawTags: string) => {
  if (!rawTags) {
    return null;
  }

  return _.compact(rawTags.split(/\n|\d+\.\s+/)).map((tag) => capitalize(tag));
};

export const getTagsFromContent = async (content: string, oldTags = [], customPrompt?: string) => {
  if (!content) {
    throw new Error(__('Please add some content first.', 'filter-ai'));
  }

  const number = maxNumber - oldTags.length;

  if (number < 1) {
    throw new Error(
      __('You probably have enough tags for this page. Please remove some before generating more.', 'filter-ai')
    );
  }

  const promptDifference = oldTags.length
    ? `Making sure they are different to the following tags: "${oldTags.join(', ')}".`
    : '';

  const prompt = customPrompt || prompts.post_tags_prompt.replace('{{number}}', number.toString());

  const response = await generateText({
    feature: 'filter-ai-post-tags',
    prompt: `${prompts.common.prefix} ${promptDifference} ${prompt} ${content}`,
  });

  const tags = formatTags(response);

  return tags;
};
