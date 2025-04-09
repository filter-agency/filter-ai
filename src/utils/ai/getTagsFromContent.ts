import { generateText } from './services';
import { prompts } from './prompts';
import { t } from '@/utils/translate';
import { capitalize } from '@/utils/capitalize';
import _ from 'underscore';

const maxNumber = 10;

const formatTags = (rawTags: string) => {
  if (!rawTags) {
    return null;
  }

  return _.compact(rawTags.split(/\n|\d+\.\s+/)).map((tag) => capitalize(tag));
};

export const getTagsFromContent = async (content: string, oldTags = [], customPrompt?: string) => {
  if (!content) {
    throw new Error(t('Please add some content first.'));
  }

  const number = maxNumber - oldTags.length;

  if (number < 1) {
    throw new Error(t('You probably have enough tags for this page. Please remove some before generating more.'));
  }

  const prePrompt = oldTags.length
    ? `${t('Making sure they are different to the following tags:')} "${oldTags.join(', ')}".`
    : '';

  const prompt = customPrompt || prompts.post.tags.replace('{{number}}', number.toString());

  const response = await generateText({
    feature: 'filter-ai-post-tags',
    prompt: `${prePrompt} ${t(prompt)} ${content}`,
  });

  const tags = formatTags(response);

  return tags;
};
