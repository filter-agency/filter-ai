export const removeWrappingQuotes = (text: string) => {
  return text.replace(/^"(.*)"$/, '$1');
};
