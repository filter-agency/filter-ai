import { useNotice, hideNotice } from '@/utils';
import { Animate, Snackbar } from '@wordpress/components';

const { render } = window.wp.element;

const container = document.createElement('div');
container.id = 'filter-ai-notice-container';

document.body.appendChild(container);

const NoticeContainer = () => {
  const notice = useNotice();

  if (!notice) {
    return null;
  }

  return (
    <div className="filter-ai-notice">
      <Animate type="appear" options={{ origin: 'bottom right' }}>
        {({ className }) => (
          <Snackbar className={className} onDismiss={() => hideNotice()}>
            {notice}
          </Snackbar>
        )}
      </Animate>
    </div>
  );
};

render(<NoticeContainer />, container);
