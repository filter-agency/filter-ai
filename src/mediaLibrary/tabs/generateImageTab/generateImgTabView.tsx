import React, { useState } from 'react';
import { getGeneratedImages } from '@/utils/ai/getGeneratedImages';
import { uploadGeneratedImageToMediaLibrary } from '@/utils/ai/uploadGeneratedImage';
import { __ } from '@wordpress/i18n';

const GenerateImgTabView = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const generateImages = await getGeneratedImages('generate-ai-img-feature', prompt);
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
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectImage = (index: number) => {
    setSelectedIndexes((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
  };

  const handleUploadSelected = async () => {
    if (selectedIndexes.length === 0) {
      setError(__('Please select at least one image to upload', 'filter-ai'));
      return;
    }
    setUploading(true);
    setError(null);

    try {
      const uploaded = await Promise.all(
        selectedIndexes.map((index) =>
          uploadGeneratedImageToMediaLibrary(generatedImages[index], `aiImage${index + 1}`, prompt)
        )
      );
      alert(__(`Successfully uploaded ${uploaded.length} images.`, 'filter-ai'));
    } catch (err) {
      console.error('Upload failed:', err);
      setError(__('Failed to upload images. Please check the console for details.', 'filter-ai'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="filter-ai-wrapper">
      <h2>{__('Enter a prompt to generate Images', 'filter-ai')}</h2>
      <p>
        {__(
          'Once images are generated, choose one or more of those to import into your Media Library, and then choose one image to insert.',
          'filter-ai'
        )}
      </p>

      <div className="filter-ai-form">
        <textarea
          className="filter-ai-textarea"
          placeholder={__('e.g. A sunset over the mountains', 'filter-ai')}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        <button onClick={handleGenerate} className="filter-ai-generate-button">
          {loading ? __('Generating...', 'filter-ai') : __('Generate Images', 'filter-ai')}
        </button>

        {error && (
          <div className="filter-ai-error">
            <strong>{__('Error', 'filter-ai')}:</strong> {error}
          </div>
        )}

        {generatedImages.length > 0 && (
          <>
            <h3>Select images to upload</h3>
            <div className="filter-ai-image-grid">
              {generatedImages.map((img, i) => {
                const isSelected = selectedIndexes.includes(i);
                return (
                  <div
                    key={i}
                    className={`filter-ai-image-wrapper ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleSelectImage(i)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' ? toggleSelectImage(i) : null)}
                  >
                    <img src={img} alt={`Generated ${i + 1}`} className="filter-ai-image" />
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleUploadSelected}
              disabled={uploading || selectedIndexes.length === 0}
              className="filter-ai-upload-button"
            >
              {uploading ? 'Uploading...' : 'Upload Selected'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default GenerateImgTabView;
