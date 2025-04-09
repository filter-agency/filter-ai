export const capitalize = (text: string) => {
  return text
    .split(' ')
    .map((word) => {
      return word
        .split('-')
        .map((part) => {
          return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join('-');
    })
    .join(' ');
};
