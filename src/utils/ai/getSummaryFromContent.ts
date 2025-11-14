import { getSettings } from '@/settings';
import { generateText } from './services';
import { __ } from '@wordpress/i18n';

export const getSummaryFromContent = async (
  content: string,
  oldSummary?: string,
  customPrompt?: string,
  service?: string
) => {
  if (!content) {
    throw new Error(__('Please add some content first.', 'filter-ai'));
  }

  const settings = await getSettings();

  const promptDifference =
    oldSummary && settings?.common_prompt_different ? `${settings.common_prompt_different} "${oldSummary}".` : '';

  const prePrompt = settings?.generate_summary_section_pre_prompt || '';

  return generateText({
    feature: 'filter-ai-post-summary',
    prompt: `${settings?.common_prompt_prefix || ''} ${prePrompt} ${promptDifference} ${customPrompt} ${content}`,
    service,
  });
};
