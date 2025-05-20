const sizeLimitBytes = 10 * 1024 * 1024;

export const mimeTypes = new Map<string, string>([
  ['png', 'image/png'],
  ['gif', 'image/gif'],
  ['webp', 'image/webp'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  // disable avif as Open AI doesn't current suport it
  // https://platform.openai.com/docs/guides/images-vision?api-mode=responses#image-input-requirements
  //['avif', 'image/avif'],
]);

export const supportedMimeTypes = Array.from(mimeTypes.keys());

export const getMimeType = (url: string): string | null => {
  const extension = url.split('.').pop()?.toLowerCase() ?? '';
  return mimeTypes.get(extension) ?? null;
};

export const getBase64Image = async (url: string): Promise<string> => {
  const data: Response = await fetch(url);
  const blob: Blob = await data.blob();
  return new Promise((resolve, reject) => {
    if (blob.size > sizeLimitBytes) {
      reject(new Error('Please choose a smaller image.'));
    }

    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      let base64data: string | ArrayBuffer | null = reader.result;
      if (typeof base64data === 'string') {
        if (url.endsWith('.avif')) {
          base64data = base64data.replace('application/octet-stream', 'image/avif');
        }
        resolve(base64data);
      } else {
        reject(new Error('Failed to convert blob to base64 string.'));
      }
    };
    reader.onerror = () => {
      reject(new Error('FileReader failed to read the blob.'));
    };
  });
};
