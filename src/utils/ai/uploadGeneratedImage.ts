import { uploadMedia } from '@wordpress/media-utils';
import { __, sprintf } from '@wordpress/i18n';

export const uploadGeneratedImageToMediaLibrary = async (dataUrl: string, filename: string, promptText?: string) => {
  return new Promise(async (resolve, reject) => {
    const { helpers } = window.aiServices.ai;

    const blob = await helpers.base64DataUrlToBlob(dataUrl);

    if (!blob) {
      reject(__('Failed to convert base64 to Blob', 'filter-ai'));
      return;
    }

    const file = new File([blob], `${filename}.${blob.type.replace('image/', '')}`, {
      type: blob.type,
      lastModified: new Date().getTime(),
    });

    const attachmentData: {
      caption?: {
        rendered: string;
        raw?: string;
      };
    } = {};

    if (promptText) {
      const captionString = sprintf(__('Generated for prompt: %s', 'filter-ai'), promptText);

      attachmentData.caption = {
        rendered: captionString,
        raw: captionString,
      };
    }

    uploadMedia({
      filesList: [file],
      additionalData: attachmentData,
      onFileChange: ([attachment]) => {
        if (!attachment) {
          reject(__('Saving file failed.', 'filter-ai'));
          return;
        }

        if (attachment.id) {
          resolve(attachment);
        }
      },
      onError: (err) => {
        reject(sprintf(__('Saving file failed with error: %s', 'filter-ai'), err?.message || err));
        return;
      },
    });
  });
};
