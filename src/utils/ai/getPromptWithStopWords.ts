export const getPromptWithStopWords = (
    rawPrompt: string,
    settings: any,
) => {

  if (!settings) {
    console.log('[Settings Missing] Using raw prompt:', rawPrompt);
    return rawPrompt;
  }

  const stopWordsEnabled = settings.stop_words_enabled;

  const stopWordsPrompt = settings.stop_words_prompt?.trim();

  if (!stopWordsPrompt) {
    console.warn('[Settings Missing] Using raw prompt: –', rawPrompt);
    return rawPrompt;
  }

  let fullPrompt = rawPrompt;

  if (stopWordsEnabled && stopWordsPrompt) {
    fullPrompt += `\n\n${stopWordsPrompt}`;
  }

  return fullPrompt;
};