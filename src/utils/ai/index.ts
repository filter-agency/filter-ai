import { getAltTextFromUrl } from './getAltTextFromUrl';
import { getExcerptFromContent } from './getExcerptFromContent';
import { getTitleFromContent } from './getTitleFromContent';
import { getTagsFromContent } from './getTagsFromContent';
import { customiseText } from './customiseText';
import { generateText } from './services';
import { getSeoTitleFromContent } from './getSeoTitleFromContent';
import { getSeoMetaDescriptionFromContent } from './getSeoMetaDescriptionFromContent';
import { getFAQsFromContent } from './getFAQsFromContent';
import { getSummaryFromContent } from './getSummaryFromContent';
import { fixTextGrammar } from './fixTextGrammar';

export const ai = {
  getAltTextFromUrl,
  getExcerptFromContent,
  getTitleFromContent,
  getTagsFromContent,
  customiseText,
  generateText,
  getSeoTitleFromContent,
  getSeoMetaDescriptionFromContent,
  getFAQsFromContent,
  getSummaryFromContent,
  fixTextGrammar,
};
