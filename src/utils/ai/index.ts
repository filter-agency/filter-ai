import { prompts } from './prompts';
import { getAltTextFromUrl } from './getAltTextFromUrl';
import { getExcerptFromContent } from './getExcerptFromContent';
import { getTitleFromContent } from './getTitleFromContent';
import { getTagsFromContent } from './getTagsFromContent';
import { customiseText } from './customiseText';
import { generateText } from './services';

export const ai = {
  prompts,
  getAltTextFromUrl,
  getExcerptFromContent,
  getTitleFromContent,
  getTagsFromContent,
  customiseText,
  generateText,
};
