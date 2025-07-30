import { getGeneratedImages } from '@/utils/ai/getGeneratedImages';
import { uploadGeneratedImageToMediaLibrary, refreshMediaLibrary } from '@/utils/ai/uploadGeneratedImage';
import { __, _n, sprintf } from '@wordpress/i18n';
import { Button, Notice, TextareaControl, __experimentalGrid as Grid } from '@wordpress/components';
import { hideLoadingMessage, showLoadingMessage, showNotice } from '@/utils';
import { getService } from '@/utils/ai/services/getService';
import { createInterpolateElement, useState, useEffect } from '@wordpress/element';
import { useSettings } from '@/settings';

const GenerateImgTabView = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isServiceConfigured, setIsServiceConfigured] = useState<boolean>(true);

  const { settings } = useSettings();

  const handleGenerate = async () => {
    setLoading(true);
    showLoadingMessage(__('AI Image', 'filter-ai'));
    try {
      const generateImages = await getGeneratedImages(prompt);
      setGeneratedImages(generateImages);
      setSelectedIndexes([]);
    } catch (err) {
      console.error('Failed to generate images:', err);
      let message = __('Image generation failed.');
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'string') {
        message = err;
      } else if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
        message = (err as any).message;
      }
      showNotice({
        message: sprintf(__('Error: %s', 'filter-ai'), message),
        type: 'error',
      });
    } finally {
      setLoading(false);
      hideLoadingMessage();
    }
  };

  const toggleSelectImage = (index: number) => {
    setSelectedIndexes((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
  };

  const handleUploadSelected = async () => {
    if (selectedIndexes.length === 0) {
      showNotice({
        message: __('Please select at least one image to upload', 'filter-ai'),
        type: 'error',
      });
      return;
    }

    setUploading(true);
    showLoadingMessage(__('Image', 'filter-ai'), 'uploading');

    try {
      const uploaded = await Promise.all(
        selectedIndexes.map((index) =>
          uploadGeneratedImageToMediaLibrary(generatedImages[index], `aiImage${index + 1}`, prompt)
        )
      ).catch((error) => {
        throw new Error(error?.message || error);
      });

      refreshMediaLibrary();

      showNotice({
        message: sprintf(
          _n(`Successfully uploaded %d image.`, `Successfully uploaded %d images.`, uploaded.length, 'filter-ai'),
          uploaded.length
        ),
        type: 'notice',
      });
    } catch (err) {
      showNotice({
        message: sprintf(__('Upload failed: %s', 'filter-ai'), err),
        type: 'error',
      });
    } finally {
      setUploading(false);
      hideLoadingMessage();
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const service = await getService();
        if (!service || !service.slug) {
          setIsServiceConfigured(false);
        }
      } catch (err) {
        console.error('[AI] getService failed:', err);
        setIsServiceConfigured(false);
        showNotice({
          message: __('Failed to check AI service configuration.', 'filter-ai'),
          type: 'error',
        });
      }
    })();
  }, []);

  if (!settings?.generate_image_enabled) {
    return null;
  }

  return (
    <>
      {!isServiceConfigured && (
        <Notice status="error" isDismissible={false}>
          {createInterpolateElement(
            sprintf(
              __(`No AI service is configured. Please add an API key in the %s plugin settings.`, 'filter-ai'),
              `<a>AI Services</a>`
            ),
            {
              a: <a href="/wp-admin/options-general.php?page=ais_services" />,
            }
          )}
        </Notice>
      )}

      <h2>{__('Enter a prompt to generate images', 'filter-ai')}</h2>
      <p>
        {__(
          'Be specific by clearly defining the subject of the image, provide context of where the subject is or what they are doing and indicate the desired style and mood you would like your image to have.',
          'filter-ai'
        )}
      </p>
      <p>
        {__(
          'Once your images are generated, you can choose one or more of those to import into your Media Library.',
          'filter-ai'
        )}
      </p>

      <div className="filter-ai-form">
        <TextareaControl
          className="filter-ai-textarea"
          placeholder={__('e.g. A sunset over the mountains', 'filter-ai')}
          value={prompt}
          onChange={setPrompt}
          disabled={loading || !isServiceConfigured}
        />

        <Button
          variant="secondary"
          onClick={handleGenerate}
          className="filter-ai-generate-button"
          disabled={loading || !isServiceConfigured || !prompt}
        >
          {loading ? __('Generating...', 'filter-ai') : __('Generate Images', 'filter-ai')}
        </Button>

        {generatedImages.length > 0 && (
          <>
            <h3>Select images to upload</h3>
            <Grid columns={3} gap={3} className="filter-ai-image-grid ">
              {generatedImages.map((img, i) => {
                const isSelected = selectedIndexes.includes(i);
                return (
                  <button
                    key={i}
                    className={`filter-ai-image-wrapper ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleSelectImage(i)}
                    disabled={uploading}
                  >
                    <img src={img} alt={`Generated ${i + 1}`} className="filter-ai-image" />
                  </button>
                );
              })}
            </Grid>
            <Button
              variant="primary"
              onClick={handleUploadSelected}
              className="filter-ai-upload-button"
              disabled={uploading || selectedIndexes.length === 0}
            >
              {uploading ? __('Uploading...', 'filter-ai') : __('Upload Selected', 'filter-ai')}
            </Button>
          </>
        )}
      </div>
    </>
  );
};

export default GenerateImgTabView;
