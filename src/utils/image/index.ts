const mimeTypes = new Map<string, string>([
  ['png', 'image/png'],
  ['gif', 'image/gif'],
  ['webp', 'image/webp'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
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
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64data: string | ArrayBuffer | null = reader.result;
      if (typeof base64data === 'string') {
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
