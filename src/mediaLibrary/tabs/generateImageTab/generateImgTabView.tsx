import { getGeneratedImages } from '@/utils/ai/getGeneratedImages';
import { uploadGeneratedImageToMediaLibrary, refreshMediaLibrary } from '@/utils/ai/uploadGeneratedImage';
import { __, _n, sprintf } from '@wordpress/i18n';
import { Button, TextareaControl, __experimentalGrid as Grid } from '@wordpress/components';
import { hideLoadingMessage, showLoadingMessage, showNotice } from '@/utils';
import { useState, useEffect } from '@wordpress/element';
import { useSettings } from '@/settings';
import { useSelect } from '@wordpress/data';
import AIServiceNotice from '@/components/aiServiceNotice';
import { useService } from '@/utils/ai/services/useService';

type ImportedImage = {
  url: string;
  id?: number;
  alt?: string;
};

type Props = {
  callback?: (image?: ImportedImage) => void;
  insertMode?: boolean; // true when inserting into block, false for media library only
};

const GenerateImgTabView = ({ callback, insertMode = false }: Props) => {
  const [prompt, setPrompt] = useState('');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const { settings } = useSettings();

  const service = useService('generate_image_prompt_service');

  // @ts-expect-error Type 'never' has no call signatures.
  const AIService = useSelect((select) => select(window.aiServices.ai.store)?.getAvailableService(), []);

  const handleGenerate = async () => {
    setLoading(true);
    showLoadingMessage(__('AI Images', 'filter-ai'));
    try {
      const generateImages = await getGeneratedImages(prompt, service?.slug);
      setGeneratedImages(generateImages);
      setSelectedIndexes([]);
    } catch (err) {
      console.error('Failed to generate images:', err);
      let message = __('Image generation failed.', 'filter-ai');
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
    // In insert mode, only allow single selection
    if (insertMode) {
      setSelectedIndexes([index]);
    } else {
      setSelectedIndexes((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
    }
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
      const imported = (await Promise.all(
        selectedIndexes.map((index) =>
          uploadGeneratedImageToMediaLibrary(generatedImages[index], `filter-ai-image-${index + 1}`, prompt)
        )
      ).catch((error) => {
        throw new Error(error?.message || error);
      })) as ImportedImage[];

      refreshMediaLibrary();

      // If in insert mode and callback provided, insert the first image
      if (insertMode && callback && imported.length > 0) {
        const firstImage = imported[0];
        callback({
          url: firstImage.url,
          id: firstImage.id,
          alt: prompt, // Use the prompt as alt text
        });
      } else {
        callback?.();
      }

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

  if (!settings?.generate_image_enabled) {
    return null;
  }

  return (
    <>
      <AIServiceNotice />

      <h2>{__('Enter a prompt to generate images', 'filter-ai')}</h2>
      <p>
        {__(
          'Be specific by clearly defining the subject of the image, provide context of where the subject is or what they are doing and indicate the desired style and mood you would like your image to have.',
          'filter-ai'
        )}
      </p>
      <p>
        {insertMode
          ? __('Once your images are generated, select one to insert into your block.', 'filter-ai')
          : __(
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
          disabled={loading || !AIService}
        />

        <Button
          variant="secondary"
          onClick={handleGenerate}
          className="filter-ai-generate-button"
          disabled={loading || !AIService || !prompt}
        >
          {loading ? __('Generating...', 'filter-ai') : __('Generate Images', 'filter-ai')}
        </Button>

        {generatedImages.length > 0 && (
          <>
            <h3>
              {insertMode ? __('Select an image to insert', 'filter-ai') : __('Select images to import', 'filter-ai')}
            </h3>
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
              {importing
                ? __('Importing...', 'filter-ai')
                : insertMode
                  ? __('Insert Selected', 'filter-ai')
                  : __('Import Selected', 'filter-ai')}
            </Button>
          </>
        )}
      </div>
    </>
  );
};

export default GenerateImgTabView;
