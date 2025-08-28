import { generateText } from './services';
import { capitalize } from '@/utils/capitalize';
import _ from 'underscore';
import { __ } from '@wordpress/i18n';
import { getSettings } from '@/settings';

const maxNumber = 10;

const formatTags = (rawTags: string) => {
  if (!rawTags) {
    return null;
  }

  return _.compact(rawTags.split(/\n|\d+\.\s+/)).map((tag) => capitalize(tag));
};

export const getTagsFromContent = async (
  content: string,
  oldTags = [],
  customPrompt?: string,
  serviceConfig?: { service: string; model: string }
) => {
  if (!content) {
    throw new Error(__('Please add some content first.', 'filter-ai'));
  }

  const number = maxNumber - oldTags.length;

  if (number < 1) {
    throw new Error(
      __('You probably have enough tags for this page. Please remove some before generating more.', 'filter-ai')
    );
  }

  const settings = await getSettings();

  const promptDifference =
    oldTags.length && settings?.common_prompt_different
      ? `${settings.common_prompt_different} ${oldTags.join(', ')}".`
      : '';

  const prompt = customPrompt?.replace('{{number}}', number.toString());

  const response = await generateText({
    feature: 'filter-ai-post-tags',
    prompt: `${settings?.common_prompt_prefix || ''} ${promptDifference} ${prompt} ${content}`,
    service: serviceConfig?.service,
    model: serviceConfig?.model,
  });

  const tags = formatTags(response);

  return tags;
};
