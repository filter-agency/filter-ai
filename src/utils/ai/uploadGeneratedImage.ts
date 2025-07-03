import { dispatch } from '@wordpress/data';
import { uploadMedia } from '@wordpress/media-utils';
import { __, sprintf, _x } from '@wordpress/i18n';
import { store as noticesStore } from '@wordpress/notices';

const UPLOAD_ATTACHMENT_NOTICE_ID = 'ai-upload-notice';

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
      const captionString = sprintf(_x('Generated for prompt: %s', 'attachment caption', 'ai-services'), promptText);

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
            dispatch(noticesStore).createErrorNotice(__('Saving file failed.', 'ai-services'), {
              id: UPLOAD_ATTACHMENT_NOTICE_ID,
              type: 'snackbar',
              speak: true,
            });
            resolve(null);
            return;
          }

          dispatch(noticesStore).createSuccessNotice(__('File saved to media library.', 'ai-services'), {
            id: UPLOAD_ATTACHMENT_NOTICE_ID,
            type: 'snackbar',
            speak: true,
          });

          resolve(attachment);
        },
        onError: (err) => {
          dispatch(noticesStore).createErrorNotice(
            sprintf(__('Saving file failed with error: %s', 'ai-services'), err.message || err),
            {
              id: UPLOAD_ATTACHMENT_NOTICE_ID,
              type: 'snackbar',
              speak: true,
            }
          );
          resolve(null);
        },
      });
    });
  } catch (err) {
    dispatch(noticesStore).createErrorNotice(__('Unexpected error during upload.', 'ai-services'), {
      id: UPLOAD_ATTACHMENT_NOTICE_ID,
      type: 'snackbar',
      speak: true,
    });
    return null;
  }
};
