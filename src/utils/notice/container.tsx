import { useNotice, hideNotice } from './store';
import { linkifyNoticeMessage } from './linkify';
import { Animate, Snackbar } from '@wordpress/components';
import { useMemo, createRoot } from '@wordpress/element';

const NoticeContainer = () => {
  const notice = useNotice();

  const typeClass = useMemo(() => {
    return notice?.type === 'error' ? 'filter-ai-notice-snackbar-error' : '';
  }, [notice?.type]);

  const message = useMemo(() => linkifyNoticeMessage(notice?.message ?? ''), [notice?.message]);

  if (!notice?.message) {
    return null;
  }

  return (
    <div className="filter-ai-notice">
      <Animate type="appear">
        {({ className }) => (
          <Snackbar className={`filter-ai-notice-snackbar ${typeClass} ${className}`} onDismiss={() => hideNotice()}>
            {notice?.title && <h2>{notice.title}</h2>}
            <div>{message}</div>
          </Snackbar>
        )}
      </Animate>
    </div>
  );
};

const container = document.createElement('div');
container.id = 'filter-ai-notice-container';

document.body.appendChild(container);

const root = createRoot(container);

root.render(<NoticeContainer />);
