import { useLoadingMessage } from './store';
import { Spinner } from '@wordpress/components';
import { createRoot } from '@wordpress/element';

const LoadingMessage = () => {
  const loadingMessage = useLoadingMessage();

  if (!loadingMessage) {
    return null;
  }

  return (
    <>
      <div className="filter-ai-loading-message-overlay" />
      <div className="filter-ai-loading-message">
        <p>{loadingMessage}</p>
        <Spinner />
      </div>
    </>
  );
};

const container = document.createElement('div');
container.id = 'filter-ai-loading-message-container';

document.body.appendChild(container);

const root = createRoot(container);

root.render(<LoadingMessage />);
