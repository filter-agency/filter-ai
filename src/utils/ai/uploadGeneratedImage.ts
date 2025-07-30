import { uploadMedia } from '@wordpress/media-utils';
import { __, sprintf } from '@wordpress/i18n';

let refreshTimeout: NodeJS.Timeout | null = null;

export const refreshMediaLibrary = () => {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
  }

  refreshTimeout = setTimeout(() => {
    const mediaFrame = window?.wp?.media?.frame;

    if (mediaFrame) {
      const library = mediaFrame.content.get().collection;
      if (library) {
        library.props.set('ignore', Date.now());
        library.more();
      }
    }
  }, 500);
};

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

    uploadMedia({
      filesList: [file],
      additionalData: {
        title: {
          raw: promptText,
          rendered: promptText || '',
        },
      },
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
