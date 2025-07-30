import { getGeneratedImages } from '@/utils/ai/getGeneratedImages';
import { uploadGeneratedImageToMediaLibrary, refreshMediaLibrary } from '@/utils/ai/uploadGeneratedImage';
import { __, _n, sprintf } from '@wordpress/i18n';
import { Button, Notice, TextareaControl, __experimentalGrid as Grid } from '@wordpress/components';
import { hideLoadingMessage, showLoadingMessage, showNotice } from '@/utils';
import { getService } from '@/utils/ai/services/getService';
import { createInterpolateElement, useState, useEffect } from '@wordpress/element';
import { useSettings } from '@/settings';

type Props = {
  callback?: () => void;
};

const GenerateImgTabView = ({ callback }: Props) => {
  const [prompt, setPrompt] = useState('');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isServiceConfigured, setIsServiceConfigured] = useState<boolean>(true);

  const { settings } = useSettings();

  const handleGenerate = async () => {
    setLoading(true);
    showLoadingMessage(__('AI Images', 'filter-ai'));
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

  const handleImportSelected = async () => {
    if (selectedIndexes.length === 0) {
      showNotice({
        message: __('Please select at least one image to import', 'filter-ai'),
        type: 'error',
      });
      return;
    }

    setImporting(true);
    showLoadingMessage(__('Images', 'filter-ai'), 'importing');

    try {
      const imported = await Promise.all(
        selectedIndexes.map((index) =>
          uploadGeneratedImageToMediaLibrary(generatedImages[index], `filter-ai-image-${index + 1}`, prompt)
        )
      ).catch((error) => {
        throw new Error(error?.message || error);
      });

      refreshMediaLibrary();

      callback?.();

      showNotice({
        message: sprintf(
          _n(`Successfully imported %d image.`, `Successfully imported %d images.`, imported.length, 'filter-ai'),
          imported.length
        ),
        type: 'notice',
      });
    } catch (err) {
      showNotice({
        message: sprintf(__('Import failed: %s', 'filter-ai'), err),
        type: 'error',
      });
    } finally {
      setImporting(false);
      hideLoadingMessage();
    }
  };

  useEffect(() => {
    const modal = document.querySelector('.filter-ai-generator-modal') as HTMLDivElement;

    if (!modal) {
      return;
    }

    if (loading || importing) {
      modal.style.display = 'none';
    } else {
      modal.style.display = '';
    }
  }, [loading, importing]);

  useEffect(() => {
    (async () => {
      try {
        const service = await getService();
        if (!service) {
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
            <h3>{__('Select images to import', 'filter-ai')}</h3>
            <Grid columns={3} gap={3} className="filter-ai-image-grid ">
              {generatedImages.map((img, i) => {
                const isSelected = selectedIndexes.includes(i);
                return (
                  <button
                    key={i}
                    className={`filter-ai-image-wrapper ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleSelectImage(i)}
                    disabled={importing}
                  >
                    <img src={img} alt={`Generated ${i + 1}`} className="filter-ai-image" />
                  </button>
                );
              })}
            </Grid>
            <Button
              variant="primary"
              onClick={handleImportSelected}
              className="filter-ai-import-button"
              disabled={importing || selectedIndexes.length === 0}
            >
              {importing ? __('Importing...', 'filter-ai') : __('Import Selected', 'filter-ai')}
            </Button>
          </>
        )}
      </div>
    </>
  );
};

export default GenerateImgTabView;
