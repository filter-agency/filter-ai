import { useMemo } from 'react';
import { Button, Spinner, Panel, PanelBody, ProgressBar, Notice } from '@wordpress/components';
import { useEffect, useCallback, useState, RawHTML } from '@wordpress/element';
import { mimeTypes } from '@/utils';
import { useSettings } from '../useSettings';
import { __, sprintf } from '@wordpress/i18n';

const defaultCount = {
  images: 0,
  imagesWithoutAltText: 0,
  actions: 0,
  completeActions: 0,
  pendingActions: 0,
  runningActions: 0,
  failedActions: 0,
};

type FailedAction = {
  image_id: number;
  message: string;
};

const ImageAltText = () => {
  const [count, setCount] = useState(defaultCount);
  const [failedActions, setFailedActions] = useState<FailedAction[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isGenerateButtonDisabled, setIsGenerateButtonDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { settings } = useSettings();

  //   console.log('Sending service to API:', settings?.generate_image_service);

  const types = useMemo(() => [...new Set(mimeTypes.values())], [mimeTypes]);

  const inProgress = useMemo(() => {
    return !!count.pendingActions || !!count.runningActions;
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

      setCount((prevCount) => ({
        ...prevCount,
        images: data.images_count,
        imagesWithoutAltText: data.images_without_alt_text_count,
        actions: data.actions_count,
        completeActions: data.complete_actions_count,
        pendingActions: data.pending_actions_count,
        runningActions: data.running_actions_count,
        failedActions: data.failed_actions_count,
      }));

      setFailedActions(Object.values(data.failed_actions || {}));

      if (!!data.pending_actions_count || !!data.running_actions_count) {
        setTimeout(getCount, 1000);
      }
    } catch (e) {
      setCount(defaultCount);
      setFailedActions([]);
    } finally {
      setIsGenerateButtonDisabled(false);
      setIsLoading(false);
    }
  }, []);

  const generateAltText = useCallback(async () => {
    setIsGenerateButtonDisabled(true);

    setCount((prevCount) => ({
      ...prevCount,
      runningActions: 1,
      completeActions: 0,
    }));

    console.log('Sending service to API:', settings?.image_alt_text_prompt_service);

    try {
      await fetch(
        `${window.filter_ai_api.url}?action=filter_ai_api_batch_image_alt_text&nonce=${window.filter_ai_api.nonce}`,
        {
          method: 'POST',
          body: JSON.stringify({
            service: settings?.generate_image_service,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      fetch(`${window.filter_ai_api.url}?action=filter_ai_api_batch_queue_run&nonce=${window.filter_ai_api.nonce}`, {
        method: 'POST',
      });
    } finally {
      getCount();
    }
  }, [settings?.generate_image_service, getCount]);

  const cancel = useCallback(async () => {
    setIsCancelling(true);

    try {
      await fetch(
        `${window.filter_ai_api.url}?action=filter_ai_api_cancel_batch_image_alt_text&nonce=${window.filter_ai_api.nonce}`,
        {
          method: 'POST',
        }
      );
    } finally {
      setIsCancelling(false);
    }
  }, []);

  useEffect(() => {
    getCount();
  }, []);

  return (
    <>
      {!!settings && !settings.image_alt_text_enabled && (
        <Notice status="error" isDismissible={false}>
          <RawHTML>
            {sprintf(
              __('Please activate this feature in the %1$sSettings%2$s.', 'filter-ai'),
              '<a href="/wp-admin/admin.php?page=filter_ai">',
              '</a>'
            )}
          </RawHTML>
        </Notice>
      )}

      {isLoading && <Spinner className="filter-ai-settings-spinner" />}

      {!isLoading && (
        <Panel header={__('Image Alt Text', 'filter-ai')} className="filter-ai-settings-panel">
          <PanelBody>
            <p>
              {sprintf(
                __(
                  'Generate alt text for images in the Media Library that are missing alt text. Supported image types include: %s.',
                  'filter-ai'
                ),
                types
                  .map((type) => type.replace(/image\//, ''))
                  .sort()
                  .join(', ')
              )}
            </p>
            <p>{sprintf(__('Total images: %s', 'filter-ai'), count.images)}</p>
            <p>{sprintf(__('Images missing alt text: %s', 'filter-ai'), count.imagesWithoutAltText)}</p>
          </PanelBody>
          {!inProgress && count.actions > 0 && (
            <PanelBody title={__('Previous run stats', 'filter-ai')}>
              <p>{sprintf(__('Images processed: %s', 'filter-ai'), count.actions)}</p>
              <p>{sprintf(__('Completed images: %s', 'filter-ai'), count.completeActions)}</p>
              <p>{sprintf(__('Failed images %s', 'filter-ai'), count.failedActions)}</p>
            </PanelBody>
          )}

          {!!count.failedActions && (
            <PanelBody title={sprintf(__('Failed images: %s', 'filter-ai'), count.failedActions)} initialOpen={false}>
              {failedActions?.map((action) => {
                return (
                  <p>
                    <a href={`/wp-admin/post.php?post=${action.image_id}&action=edit`} target="_blank">
                      {action.image_id}
                    </a>
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
                disabled={inProgress || !settings?.image_alt_text_enabled || isGenerateButtonDisabled}
              >
                {__('Generate Alt Text', 'filter-ai')}
              </Button>
            </PanelBody>
          )}

          {inProgress && (
            <PanelBody>
              <p style={{ fontWeight: 'bold' }}>{__('Generating', 'filter-ai')}</p>
              <p>{__('Your batch generation will continue to run in the background if you move away.', 'filter-ai')}</p>
              <ProgressBar value={(count.completeActions / count.actions) * 100} className="filter-ai-progress-bar" />
              <p>{`${count.completeActions} / ${count.actions} ${__('images processed', 'filter-ai')}`}</p>
              <Button variant="secondary" onClick={cancel} disabled={isCancelling}>
                {__('Cancel', 'filter-ai')}
              </Button>
            </PanelBody>
          )}

          {!count.images && (
            <PanelBody>
              <p>{__('No images could be found', 'filter-ai')}</p>
            </PanelBody>
          )}
        </Panel>
      )}
    </>
  );
};

export default ImageAltText;
