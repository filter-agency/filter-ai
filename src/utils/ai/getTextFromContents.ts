const { helpers } = window.aiServices.ai;

export const getTextFromContents = (contents: any) => {
  return helpers.getTextFromContents(contents).replaceAll('\n\n\n\n', '\n\n');
};
