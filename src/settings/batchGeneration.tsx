import { filterLogo } from '@/assets/filter-logo';
import { CardDivider, Flex, Panel, PanelBody, ProgressBar } from '@wordpress/components';
import { createRoot, useEffect, useCallback, useState } from '@wordpress/element';
import { mimeTypes, t } from '@/utils';
import { useMemo } from 'react';

const apiUrl = '/wp-json/wp/v2/media';

const BatchGeneration = () => {
  const [totalImages, setTotalImages] = useState(0);
  const [totalMissingAltText, setTotalMissingAltText] = useState(0);

  const types = useMemo(() => [...new Set(mimeTypes.values())], [mimeTypes]);

  const getMedia = useCallback(async () => {
    const responses = await Promise.all(types.map((type) => fetch(`${apiUrl}?per_page=100&mime_type=${type}`)));

    const total = responses.reduce((total, response) => {
      return (total += parseInt(response.headers.get('X-WP-Total') || '0'));
    }, 0);

    setTotalImages(total);

    const json = await Promise.all(responses.map((r) => r.json()));
    const data = json.reduce((data, response) => {
      return [...data, ...response];
    }, []);

    console.log({ data });
  }, []);

  useEffect(() => {
    getMedia();
  }, []);

  return (
    <Flex direction="column" gap="6" className="filter-ai-settings">
      <Flex justify="flex-start">
        <img src={filterLogo} alt={t('Filter AI logo')} style={{ width: '30px', marginLeft: '8px' }} />
        <h1 style={{ margin: 0 }}>{t('Filter AI Batch Generation')}</h1>
      </Flex>
      <Panel header={t('Image Alt Text')}>
        <PanelBody>
          <p>
            {t('Total valid images:')} {totalImages}
          </p>
          <p>
            {t('Images missing alt text:')} {totalMissingAltText}
          </p>
          <CardDivider />
          <p>{t('Update in progress')}</p>
          <ProgressBar value={50} className="filter-ai-progress-bar" />
          <p>{t('x / y images processed')}</p>
        </PanelBody>
      </Panel>
    </Flex>
  );
};

(function () {
  const container = document.getElementById('filter-ai-batch-container');

  if (!container) {
    return;
  }

  const root = createRoot(container);

  root.render(<BatchGeneration />);
})();
