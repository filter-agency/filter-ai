import { Button, Spinner, Panel, PanelBody, ProgressBar, Notice } from '@wordpress/components';
import { RawHTML, useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { useSettings } from '../useSettings';
import { useServices } from '@/utils/ai/services/useServices';

const defaultCount = {
  posts: 0,
  postsWithout: 0,
  actions: 0,
  completeActions: 0,
  pendingActions: 0,
  runningActions: 0,
  failedActions: 0,
  postTypes: [],
  lastRunService: 'N/A',
};

type FailedAction = {
  post_id: number;
  message: string;
};

type PostType = {
  label: string;
  total: number;
  missing: number;
};

const SEOMetaDescriptions = () => {
  const [count, setCount] = useState(defaultCount);
  const [failedActions, setFailedActions] = useState<FailedAction[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isGenerateButtonDisabled, setIsGenerateButtonDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [postTypes, setPostTypes] = useState<PostType[]>([]);

  const { settings } = useSettings();

  const services = useServices();

  const inProgress = useMemo(() => {
    return !!count.pendingActions || !!count.runningActions;
  }, [count]);

  const getCount = useCallback(async () => {
    try {
      const { data } = await fetch(
        `${window.filter_ai_api.url}?action=filter_ai_api_get_seo_meta_description_count&nonce=${window.filter_ai_api.nonce}`
      )
        .then((r) => r.json())
        .catch(() => ({}));

      if (!data) {
        throw new Error('no data');
      }

      setCount((prevCount) => {
        return {
          ...prevCount,
          posts: data.total_count,
          postsWithout: data.total_missing_count,
          actions: data.actions_count,
          completeActions: data.complete_actions_count,
          pendingActions: data.pending_actions_count,
          runningActions: data.running_actions_count,
          failedActions: data.failed_actions_count,
          lastRunService: data.last_run_service,
        };
      });

      setFailedActions(Object.values(data.failed_actions || {}));

      setPostTypes(
        data.post_types?.sort((a: PostType, b: PostType) => {
          if (a.label < b.label) return -1;
          if (a.label > b.label) return 1;
          return 0;
        }) || []
      );

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

  const generateSEOMetaDescriptions = useCallback(async () => {
    setIsGenerateButtonDisabled(true);

    try {
      await fetch(
        `${window.filter_ai_api.url}?action=filter_ai_api_batch_seo_meta_description&nonce=${window.filter_ai_api.nonce}`,
        {
          method: 'POST',
        }
      );

      fetch(`${window.filter_ai_api.url}?action=filter_ai_api_batch_queue_run&nonce=${window.filter_ai_api.nonce}`, {
        method: 'POST',
      });
    } finally {
      getCount();
    }
  }, [settings?.yoast_seo_meta_description_prompt_service, getCount]);

  const cancel = useCallback(async () => {
    setIsCancelling(true);

    try {
      await fetch(
        `${window.filter_ai_api.url}?action=filter_ai_api_cancel_batch_seo_meta_description&nonce=${window.filter_ai_api.nonce}`,
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
      {!window.filter_ai_dependencies.yoast_seo && (
        <Notice status="error" isDismissible={false}>
          {__('Please install and activate the Yoast SEO plugin.', 'filter-ai')}
        </Notice>
      )}

      {!!settings && !settings.yoast_seo_meta_description_enabled && (
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
        <Panel header={__('Yoast SEO Meta Descriptions', 'filter-ai')} className="filter-ai-settings-panel">
          <PanelBody>
            <p>
              {sprintf(
                __('Generate missing SEO meta descriptions for the following post types: %s.', 'filter-ai'),
                postTypes
                  ?.slice(0, -1)
                  .map((type) => type.label)
                  .join(', ') +
                  (postTypes?.length > 1 ? ' & ' : '') +
                  postTypes?.slice(-1).map((type) => type.label)
              )}
            </p>
            <p>{sprintf(__('Total posts: %s', 'filter-ai'), count.posts)}</p>
            <p>{sprintf(__('Posts missing SEO meta descriptions: %s', 'filter-ai'), count.postsWithout)}</p>
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>{__('Total', 'filter-ai')}</th>
                  <th>{__('Missing', 'filter-ai')}</th>
                </tr>
              </thead>
              <tbody>
                {postTypes.map((type, index) => (
                  <tr key={index}>
                    <td>{type.label}</td>
                    <td>{type.total}</td>
                    <td>{type.missing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PanelBody>
          {!inProgress && count.actions > 0 && (
            <PanelBody title={__('Previous run stats', 'filter-ai')}>
              <p>
                {sprintf(
                  __('AI Service: %s', 'filter-ai'),
                  services?.[count.lastRunService]?.metadata.name ?? 'unknown'
                )}
              </p>
              <p>{sprintf(__('SEO meta descriptions processed: %s', 'filter-ai'), count.actions)}</p>
              <p>{sprintf(__('Completed SEO meta descriptions: %s', 'filter-ai'), count.completeActions)}</p>
              <p>{sprintf(__('Failed SEO meta descriptions %s', 'filter-ai'), count.failedActions)}</p>
            </PanelBody>
          )}

          {!!count.failedActions && (
            <PanelBody
              title={sprintf(__('Failed SEO meta descriptions: %s', 'filter-ai'), count.failedActions)}
              initialOpen={false}
            >
              {failedActions?.map((action) => {
                return (
                  <p key={action.post_id}>
                    <a href={`/wp-admin/post.php?post=${action.post_id}&action=edit`} target="_blank">
                      {action.post_id}
                    </a>
                    {': '}
                    {action.message ? action.message : 'Unknown'}
                  </p>
                );
              })}
            </PanelBody>
          )}

          {!inProgress && count.postsWithout > 0 && (
            <PanelBody>
              <Button
                variant="primary"
                onClick={generateSEOMetaDescriptions}
                disabled={
                  inProgress ||
                  !settings?.yoast_seo_meta_description_enabled ||
                  isGenerateButtonDisabled ||
                  !window.filter_ai_dependencies.yoast_seo
                }
              >
                {__('Generate SEO Meta Descriptions', 'filter-ai')}
              </Button>
            </PanelBody>
          )}

          {inProgress && (
            <PanelBody>
              <p style={{ fontWeight: 'bold' }}>{__('Generating', 'filter-ai')}</p>
              <p>{__('Your batch generation will continue to run in the background if you move away.', 'filter-ai')}</p>
              <ProgressBar value={(count.completeActions / count.actions) * 100} className="filter-ai-progress-bar" />
              <p>{`${count.completeActions} / ${count.actions} ${__('SEO meta descriptions processed', 'filter-ai')}`}</p>
              <Button variant="secondary" onClick={cancel} disabled={isCancelling}>
                {__('Cancel', 'filter-ai')}
              </Button>
            </PanelBody>
          )}

          {!count.posts && (
            <PanelBody>
              <p>{__('No posts could be found', 'filter-ai')}</p>
            </PanelBody>
          )}
        </Panel>
      )}
    </>
  );
};

export default SEOMetaDescriptions;
