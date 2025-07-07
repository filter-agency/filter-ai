import { uploadMedia } from '@wordpress/media-utils';
import { __, sprintf } from '@wordpress/i18n';
import { showNotice } from '@/utils';

export const uploadGeneratedImageToMediaLibrary = async (dataUrl: string, filename: string, promptText?: string) => {
  const { helpers } = window.aiServices.ai;

  try {
    const blob = await helpers.base64DataUrlToBlob(dataUrl);

    if (!blob) {
      throw new Error(__('Failed to convert base64 to Blob', 'filter-ai'));
    }

    const file = new File([blob], filename, {
      type: 'image/png',
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

    return new Promise((resolve) => {
      uploadMedia({
        filesList: [file],
        additionalData: attachmentData,
        onFileChange: ([attachment]) => {
          if (!attachment) {
            showNotice({
              message: __('Saving file failed.', 'filter-ai'),
              type: 'error',
            });
            resolve(null);
            return;
          }

          showNotice({
            message: __('File saved to media library.', 'filter-ai'),
          });

          resolve(attachment);
        },
        onError: (err) => {
          showNotice({
            message: sprintf(__('Saving file failed with error: %s', 'filter-ai'), err.message),
            type: 'error',
          });
          resolve(null);
        },
      });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    showNotice({
      message: sprintf(__('Unexpected error during upload: %s', 'filter-ai'), message),
      type: 'error',
    });
    return null;
  }
};
