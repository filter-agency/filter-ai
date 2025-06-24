import { Button, Spinner, Panel, PanelBody, ProgressBar } from '@wordpress/components';
import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { useSettings } from '../useSettings';

const defaultCount = {
  posts: 0,
  postsWithout: 0,
  actions: 0,
  completeActions: 0,
  pendingActions: 0,
  runningActions: 0,
  failedActions: 0,
  postTypes: [],
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

const SEOTitles = () => {
  const [count, setCount] = useState(defaultCount);
  const [failedActions, setFailedActions] = useState<FailedAction[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isGenerateButtonDisabled, setIsGenerateButtonDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [postTypes, setPostTypes] = useState<PostType[]>([]);

  const { settings } = useSettings();

  const inProgress = useMemo(() => {
    return !!count.pendingActions || !!count.runningActions;
  }, [count]);

  const getCount = useCallback(async () => {
    try {
      const { data } = await fetch(
        `${window.filter_ai_api.url}?action=filter_ai_api_get_seo_title_count&nonce=${window.filter_ai_api.nonce}`
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

  const generateSEOTitles = useCallback(async () => {
    setIsGenerateButtonDisabled(true);

    try {
      await fetch(
        `${window.filter_ai_api.url}?action=filter_ai_api_batch_seo_title&nonce=${window.filter_ai_api.nonce}`,
        {
          method: 'POST',
        }
      );
    } finally {
      getCount();
    }
  }, []);

  const cancel = useCallback(async () => {
    setIsCancelling(true);

    try {
      await fetch(
        `${window.filter_ai_api.url}?action=filter_ai_api_cancel_batch_seo_title&nonce=${window.filter_ai_api.nonce}`,
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
      {isLoading && <Spinner className="filter-ai-settings-spinner" />}

      {!isLoading && (
        <Panel header={__('Yoast SEO Titles', 'filter-ai')} className="filter-ai-settings-panel">
          <PanelBody>
            <p>
              {sprintf(
                __('Generate missing SEO titles for the following post types: %s.', 'filter-ai'),
                postTypes
                  ?.slice(0, -1)
                  .map((type) => type.label)
                  .join(', ') +
                  (postTypes?.length > 1 ? ' & ' : '') +
                  postTypes?.slice(-1).map((type) => type.label)
              )}
            </p>
            <p>{sprintf(__('Total posts: %s', 'filter-ai'), count.posts)}</p>
            <p>{sprintf(__('Posts missing SEO titles: %s', 'filter-ai'), count.postsWithout)}</p>
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>{__('Total', 'filter-ai')}</th>
                  <th>{__('Missing', 'filter-ai')}</th>
                </tr>
              </thead>
              <tbody>
                {postTypes.map((type) => (
                  <tr>
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
              <p>{sprintf(__('SEO titles processed: %s', 'filter-ai'), count.actions)}</p>
              <p>{sprintf(__('Completed SEO titles: %s', 'filter-ai'), count.completeActions)}</p>
              <p>{sprintf(__('Failed SEO titles %s', 'filter-ai'), count.failedActions)}</p>
            </PanelBody>
          )}

          {!!count.failedActions && (
            <PanelBody
              title={sprintf(__('Failed SEO titles: %s', 'filter-ai'), count.failedActions)}
              initialOpen={false}
            >
              {failedActions?.map((action) => {
                return (
                  <p>
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
                onClick={generateSEOTitles}
                disabled={
                  inProgress ||
                  !settings?.yoast_seo_title_enabled ||
                  isGenerateButtonDisabled ||
                  !window.filter_ai_dependencies.yoast_seo
                }
              >
                {__('Generate SEO Titles', 'filter-ai')}
              </Button>
            </PanelBody>
          )}

          {inProgress && (
            <PanelBody>
              <p style={{ fontWeight: 'bold' }}>{__('Generating', 'filter-ai')}</p>
              <p>{__('Your batch generation will continue to run in the background if you move away.', 'filter-ai')}</p>
              <ProgressBar value={(count.completeActions / count.actions) * 100} className="filter-ai-progress-bar" />
              <p>{`${count.completeActions} / ${count.actions} ${__('SEO titles processed', 'filter-ai')}`}</p>
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

export default SEOTitles;
