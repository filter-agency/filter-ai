import { filterLogo } from '@/assets/filter-logo';
import { Button, Flex, Panel, PanelBody, ProgressBar } from '@wordpress/components';
import { createRoot, useEffect, useCallback, useState } from '@wordpress/element';
import { mimeTypes, t } from '@/utils';
import { useMemo } from 'react';
import { useSettings } from './useSettings';

const defaultCount = {
  images: 0,
  imagesWithoutAltText: 0,
  actions: 0,
  completeActions: 0,
  pendingActions: 0,
  runningActions: 0,
  canceledActions: 0,
  failedActions: 0,
  statusActions: 0,
};

type FailedAction = {
  image_id: number;
  message: string;
};

const BatchGeneration = () => {
  const [count, setCount] = useState(defaultCount);
  const [failedActions, setFailedActions] = useState<FailedAction[]>([]);

  const { settings } = useSettings();

  const types = useMemo(() => [...new Set(mimeTypes.values())], [mimeTypes]);

  const inProgress = useMemo(() => {
    return !!count.pendingActions || !!count.runningActions || !!count.canceledActions;
  }, [count]);

  const isCancelling = useMemo(() => {
    return !!count.canceledActions;
  }, [count]);

  const getCount = useCallback(async () => {
    try {
      const { data } = await fetch(
        `${window.filter_ai_api.url}?action=filter_ai_api_get_image_count&nonce=${window.filter_ai_api.nonce}`
      )
        .then((r) => r.json())
        .catch(() => ({}));

      if (!data) {
        throw new Error('no data');
      }

      setCount((prevCount) => {
        return {
          ...prevCount,
          images: data.images_count,
          imagesWithoutAltText: data.images_without_alt_text_count,
          actions: data.actions_count,
          completeActions: data.complete_actions_count,
          pendingActions: data.pending_actions_count,
          runningActions: data.running_actions_count,
          canceledActions: data.canceled_actions_count,
          failedActions: data.failed_actions_count,
        };
      });

      setFailedActions(Object.values(data.failed_actions || {}));

      if (!!data.pending_actions_count || !!data.running_actions_count || !!data.canceled_actions_count) {
        setTimeout(getCount, 1000);
      }
    } catch (e) {
      setCount(defaultCount);
      setFailedActions([]);
    }
  }, []);

  const generateAltText = useCallback(async () => {
    try {
      await fetch(
        `${window.filter_ai_api.url}?action=filter_ai_api_batch_image_alt_text&nonce=${window.filter_ai_api.nonce}`,
        {
          method: 'POST',
        }
      );
    } finally {
      getCount();
    }
  }, []);

  const cancel = useCallback(async () => {
    try {
      await fetch(
        `${window.filter_ai_api.url}?action=filter_ai_api_cancel_batch_image_alt_text&nonce=${window.filter_ai_api.nonce}`,
        {
          method: 'POST',
        }
      );
    } catch (e) {}
  }, []);

  useEffect(() => {
    getCount();
  }, []);

  return (
    <div className="filter-ai-settings">
      <header className="filter-ai-settings-header">
        <div className="filter-ai-settings-header-content">
          <div>
            <h1 style={{ margin: 0 }}>{t('Filter AI Batch Generation')}</h1>
          </div>
          <img src={filterLogo} alt={t('Filter AI logo')} />
        </div>
      </header>
      <div className="filter-ai-settings-content">
        <Panel header={t('Image Alt Text')} className="filter-ai-settings-panel">
          <PanelBody>
            <p>
              {t(
                `Generate alt text for the following image types within the media library: ${types
                  .map((type) => type.replace(/image\//, ''))
                  .sort()
                  .join(', ')}.`
              )}
            </p>
            <p>{t(`Total images: ${count.images}`)}</p>
            <p>{t(`Images missing alt text: ${count.imagesWithoutAltText}`)}</p>
          </PanelBody>
          {!inProgress && count.actions > 0 && (
            <PanelBody title={t('Previous run stats')}>
              <p>{t(`Images processed: ${count.actions}`)}</p>
              <p>{t(`Completed images: ${count.completeActions}`)}</p>
              <p>{t(`Failed images: ${count.failedActions}`)}</p>
            </PanelBody>
          )}

          {!!count.failedActions && (
            <PanelBody title={t(`Failed images: ${count.failedActions}`)} initialOpen={false}>
              {failedActions?.map((action) => {
                return (
                  <p>
                    <a href={`/wp-admin/upload.php?item=${action.image_id}`}>{action.image_id}</a>
                    {': '}
                    {action.message ? action.message : 'Unknown'}
                  </p>
                );
              })}
            </PanelBody>
          )}

          {!inProgress && count.imagesWithoutAltText > 0 && (
            <PanelBody>
              <Button
                variant="primary"
                onClick={generateAltText}
                disabled={inProgress || !settings?.image_alt_text_enabled}
              >
                {t('Generate alt text')}
              </Button>
            </PanelBody>
          )}

          {inProgress && (
            <PanelBody>
              <p style={{ fontWeight: 'bold' }}>{t('Generating')}</p>
              <ProgressBar value={(count.completeActions / count.actions) * 100} className="filter-ai-progress-bar" />
              <p>{t(`${count.completeActions} / ${count.actions} images processed`)}</p>
              <Button variant="secondary" onClick={cancel} disabled={isCancelling}>
                {t('Cancel')}
              </Button>
            </PanelBody>
          )}

          {!count.images && (
            <PanelBody>
              <p>{t('No images could be found')}</p>
            </PanelBody>
          )}
        </Panel>
        <div>
          <a href="/wp-admin/tools.php?page=action-scheduler">{t('View batch generation log')}</a>
        </div>
      </div>
    </div>
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
