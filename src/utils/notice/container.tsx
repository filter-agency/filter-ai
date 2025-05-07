import { useNotice, hideNotice } from '@/utils';
import { Animate, Snackbar } from '@wordpress/components';
import { useMemo } from '@wordpress/element';

const { render } = window.wp?.element || {};

const container = document.createElement('div');
container.id = 'filter-ai-notice-container';

document.body.appendChild(container);

const NoticeContainer = () => {
  const notice = useNotice();

  const typeClass = useMemo(() => {
    return notice?.type === 'error' ? 'filter-ai-notice-snackbar-error' : '';
  }, [notice?.type]);

  if (!notice?.message) {
    return null;
  }

  return (
    <div className="filter-ai-notice">
      <Animate type="appear">
        {({ className }) => (
          <Snackbar className={`filter-ai-notice-snackbar ${typeClass} ${className}`} onDismiss={() => hideNotice()}>
            {notice?.title && <h2>{notice.title}</h2>}
            <div>{notice?.message}</div>
          </Snackbar>
        )}
      </Animate>
    </div>
  );
};

render?.(<NoticeContainer />, container);
