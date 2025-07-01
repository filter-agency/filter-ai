import { getAltTextFromUrl } from './getAltTextFromUrl';
import { getExcerptFromContent } from './getExcerptFromContent';
import { getTitleFromContent } from './getTitleFromContent';
import { getTagsFromContent } from './getTagsFromContent';
import { customiseText } from './customiseText';
import { generateText } from './services';
import { getSeoTitleFromContent } from './getSeoTitleFromContent';
import { getSeoMetaDescriptionFromContent } from './getSeoMetaDescriptionFromContent';

export const ai = {
  getAltTextFromUrl,
  getExcerptFromContent,
  getTitleFromContent,
  getTagsFromContent,
  customiseText,
  generateText,
  getSeoTitleFromContent,
  getSeoMetaDescriptionFromContent,
};
