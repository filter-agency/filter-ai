import { Button, Panel, PanelBody, PanelHeader, Spinner } from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
  ErrorLogDetail,
  ErrorLogSummary,
  nativeGetErrorLog,
  nativeListErrorLogs,
} from '@/utils/ai/services/nativeClient';

const getInitialLogId = () => {
  const value = new URLSearchParams(window.location.search).get('filter_ai_log_id');
  return value ? Number.parseInt(value, 10) || null : null;
};

const setLogUrl = (logId: number | null) => {
  const url = new URL(window.location.href);
  url.searchParams.set('page', 'filter_ai');
  if (logId) {
    url.searchParams.set('filter_ai_log_id', logId.toString());
  } else {
    url.searchParams.delete('filter_ai_log_id');
  }
  url.hash = 'error_logs';
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
};

const ErrorLogs = () => {
  const [logs, setLogs] = useState<ErrorLogSummary[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(getInitialLogId);
  const [selectedLog, setSelectedLog] = useState<ErrorLogDetail | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isLoadingLog, setIsLoadingLog] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLoadingLogs(true);
    nativeListErrorLogs()
      .then((items) => {
        setLogs(items);
        setError('');
      })
      .catch(() => {
        setError(__('Unable to load Filter AI error logs.', 'filter-ai'));
      })
      .finally(() => setIsLoadingLogs(false));
  }, []);

  useEffect(() => {
    if (!selectedLogId) {
      setSelectedLog(null);
      return;
    }

    setIsLoadingLog(true);
    nativeGetErrorLog(selectedLogId)
      .then((log) => {
        setSelectedLog(log);
        setError('');
      })
      .catch(() => {
        setSelectedLog(null);
        setError(__('Error log not found.', 'filter-ai'));
      })
      .finally(() => setIsLoadingLog(false));
  }, [selectedLogId]);

  const openLog = (id: number) => {
    setSelectedLogId(id);
    setLogUrl(id);
  };

  const showAllLogs = () => {
    setSelectedLogId(null);
    setLogUrl(null);
  };

  return (
    <Panel className="filter-ai-settings-panel filter-ai-error-logs">
      <PanelHeader>
        <h2>{__('Error Logs', 'filter-ai')}</h2>
      </PanelHeader>
      <PanelBody>
        <p>
          {__(
            'Recent AI provider and Filter AI errors. Entries older than one week are pruned automatically.',
            'filter-ai'
          )}
        </p>
        {error && (
          <div className="notice notice-error inline">
            <p>{error}</p>
          </div>
        )}
        {selectedLogId ? (
          <div className="filter-ai-error-log-detail">
            <div className="filter-ai-error-log-back">
              <Button variant="link" onClick={showAllLogs}>
                {__('Back to all logs', 'filter-ai')}
              </Button>
            </div>
            {isLoadingLog && <Spinner />}
            {selectedLog && (
              <>
                <h3>{selectedLog.title}</h3>
                <dl className="filter-ai-error-log-meta">
                  <dt>{__('Date', 'filter-ai')}</dt>
                  <dd>{selectedLog.date}</dd>
                  <dt>{__('Source', 'filter-ai')}</dt>
                  <dd>{selectedLog.source}</dd>
                  <dt>{__('Message', 'filter-ai')}</dt>
                  <dd>{selectedLog.message}</dd>
                </dl>
                <pre className="filter-ai-error-log-content">{selectedLog.content}</pre>
              </>
            )}
          </div>
        ) : (
          <>
            {isLoadingLogs && <Spinner />}
            {!isLoadingLogs && !logs.length && <p>{__('No Filter AI errors have been logged yet.', 'filter-ai')}</p>}
            {!!logs.length && (
              <table className="widefat striped filter-ai-error-log-table">
                <thead>
                  <tr>
                    <th>{__('Date', 'filter-ai')}</th>
                    <th>{__('Message', 'filter-ai')}</th>
                    <th>{__('Details', 'filter-ai')}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.date}</td>
                      <td>{log.message}</td>
                      <td>
                        <a
                          href={`?page=filter_ai&filter_ai_log_id=${log.id}#error_logs`}
                          onClick={(event) => {
                            event.preventDefault();
                            openLog(log.id);
                          }}
                        >
                          {__('View full response', 'filter-ai')}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </PanelBody>
    </Panel>
  );
};

export default ErrorLogs;
