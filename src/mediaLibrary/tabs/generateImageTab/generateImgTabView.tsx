import { getGeneratedImages } from '@/utils/ai/getGeneratedImages';
import { uploadGeneratedImageToMediaLibrary, refreshMediaLibrary } from '@/utils/ai/uploadGeneratedImage';
import { __, _n, sprintf } from '@wordpress/i18n';
import { Button, TextareaControl, __experimentalGrid as Grid } from '@wordpress/components';
import { hideLoadingMessage, showLoadingMessage, showNotice, useAIPlugin } from '@/utils';
import { useState, useEffect } from '@wordpress/element';
import { useSettings } from '@/settings';
import { useSelect } from '@wordpress/data';
import AIServiceNotice from '@/components/aiServiceNotice';
import { useService } from '@/utils/ai/services/useService';
import { getMode } from '@/utils/ai/services/mode';
import { nativeIsSupported } from '@/utils/ai/services/nativeClient';

type ImportedImage = {
  url: string;
  id?: number;
};

type Props = {
  callback?: (image?: ImportedImage) => void;
  insertMode?: boolean;
};

const GenerateImgTabView = ({ callback, insertMode = false }: Props) => {
  const [prompt, setPrompt] = useState('');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const { settings } = useSettings();

  const aiPlugin = useAIPlugin();

  const service = useService('generate_image_prompt_service');

  const [nativeImageSupported, setNativeImageSupported] = useState<boolean | null>(null);

  useEffect(() => {
    if (getMode() === 'native') {
      nativeIsSupported('image')
        .then(setNativeImageSupported)
        .catch(() => setNativeImageSupported(false));
    }
  }, []);

  const legacyAIService = useSelect(
    (select) => {
      if (getMode() === 'native' || !aiPlugin?.ai?.store) {
        return undefined;
      }
      // @ts-expect-error Type 'never' has no call signatures.
      return select(aiPlugin.ai.store)?.getAvailableService();
    },
    [aiPlugin]
  );

  const AIService = getMode() === 'native' ? nativeImageSupported : legacyAIService;

  const handleGenerate = async () => {
    setLoading(true);
    showLoadingMessage(__('AI Image', 'filter-ai'));
    try {
      const generateImages = await getGeneratedImages(prompt, service?.slug);

      if (!generateImages.length) {
        throw new Error(__('No image was generated. Check your AI provider configuration and try again.', 'filter-ai'));
      }

      setGeneratedImages(generateImages);
      // Auto-select all generated images (currently always 1) so the user can
      // import/insert directly without a redundant 'select' click.
      setSelectedIndexes(generateImages.map((_, i) => i));
    } catch (error) {
      console.error('Failed to generate images:', error);

      showNotice({
        // @ts-expect-error Property 'message' does not exist on type '{}'
        message: sprintf(__('Error: %s', 'filter-ai'), error?.message || error),
        type: 'error',
      });
    } finally {
      setLoading(false);
      hideLoadingMessage();
    }
  };

  const toggleSelectImage = (index: number) => {
    if (insertMode) {
      setSelectedIndexes([index]);
    } else {
      setSelectedIndexes((prev) => (prev.indexOf(index) !== -1 ? prev.filter((i) => i !== index) : [...prev, index]));
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
    showLoadingMessage(__('Image', 'filter-ai'), 'importing');

    try {
      const imported = (await Promise.all(
        selectedIndexes.map((index) =>
          uploadGeneratedImageToMediaLibrary(generatedImages[index], `filter-ai-image-${index + 1}`, prompt)
        )
      ).catch((error) => {
        throw new Error(error?.message || error);
      })) as ImportedImage[];

      refreshMediaLibrary();

      if (insertMode && callback && imported.length > 0) {
        const firstImage = imported[0];
        callback(firstImage);
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
    } catch (error) {
      showNotice({
        // @ts-expect-error Property 'message' does not exist on type '{}'
        message: sprintf(__('Import failed: %s', 'filter-ai'), error?.message || error),
        type: 'error',
      });
    } finally {
      setImporting(false);
      hideLoadingMessage();
    }
  };

  if (!settings?.generate_image_enabled) {
    return null;
  }

  return (
    <>
      <AIServiceNotice />

      <h2>{__('Enter a prompt to generate an image', 'filter-ai')}</h2>
      <p>
        {__(
          'Be specific by clearly defining the subject of the image, provide context of where the subject is or what they are doing and indicate the desired style and mood you would like your image to have.',
          'filter-ai'
        )}
      </p>
      <p>
        {insertMode
          ? __('Once your image is generated, you can insert it into your block.', 'filter-ai')
          : __('Once your image is generated, you can import it into your Media Library.', 'filter-ai')}
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
          onClick={() => void handleGenerate()}
          className="filter-ai-generate-button"
          disabled={loading || !AIService || !prompt}
        >
          {loading ? __('Generating...', 'filter-ai') : __('Generate Image', 'filter-ai')}
        </Button>

        {generatedImages.length > 0 && (
          <>
            <h3>{__('Generated image', 'filter-ai')}</h3>
            <Grid columns={3} gap={3} className="filter-ai-image-grid ">
              {generatedImages.map((img, i) => {
                const isSelected = selectedIndexes.indexOf(i) !== -1;
                return (
                  <button
                    key={i}
                    type="button"
                    className={`filter-ai-image-wrapper ${isSelected ? 'selected' : ''}`}
                    onClick={(event) => {
                      event.preventDefault();
                      toggleSelectImage(i);
                    }}
                    disabled={importing}
                  >
                    <img src={img} className="filter-ai-image" />
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
                  ? __('Insert into block', 'filter-ai')
                  : __('Import to Media Library', 'filter-ai')}
            </Button>
          </>
        )}
      </div>
    </>
  );
};

export default GenerateImgTabView;
