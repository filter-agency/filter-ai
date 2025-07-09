import { getGeneratedImages } from '@/utils/ai/getGeneratedImages';
import { uploadGeneratedImageToMediaLibrary } from '@/utils/ai/uploadGeneratedImage';
import { __, _n, sprintf } from '@wordpress/i18n';
import { Button, Notice, TextareaControl, __experimentalGrid as Grid } from '@wordpress/components';
import { showNotice } from '@/utils';
import { getService } from '@/utils/ai/services/getService';
import { createInterpolateElement, useState, useEffect } from '@wordpress/element';

const GenerateImgTabView = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isServiceConfigured, setIsServiceConfigured] = useState<boolean>(true);

  const handleGenerate = async () => {
    setLoading(true);
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

    try {
      const uploaded = await Promise.all(
        selectedIndexes.map((index) =>
          uploadGeneratedImageToMediaLibrary(generatedImages[index], `aiImage${index + 1}`, prompt)
        )
      ).catch((error) => {
        throw new Error(error?.message || error);
      });

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

    const toolbar = document.querySelector('.media-toolbar') as HTMLDivElement;

    if (toolbar) {
      toolbar.style.display = 'none';
    }

    return () => {
      if (toolbar) {
        toolbar.style.display = '';
      }
    };
  }, []);

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

      <h2>{__('Enter a prompt to generate Images', 'filter-ai')}</h2>
      <p>
        {__(
          'Once images are generated, choose one or more of those to import into your Media Library, and then choose one image to insert.',
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
          disabled={loading || !isServiceConfigured}
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
