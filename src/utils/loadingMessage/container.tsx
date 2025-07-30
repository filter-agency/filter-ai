import { __, sprintf } from '@wordpress/i18n';
import { useLoadingMessage } from './store';
import { createRoot, useMemo } from '@wordpress/element';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import loadingJSON from '@/assets/loading.json';

const LoadingMessage = () => {
  const { type = 'generating', label } = useLoadingMessage();

  const title = useMemo(() => {
    switch (type) {
      case 'customising':
        return __('Customising %s', 'filter-ai');
      case 'summarising':
        return __('Summarising %s', 'filter-ai');
      case 'importing':
        return __('Importing %s', 'filter-ai');
      default:
        return __('Generating %s', 'filter-ai');
    }
  }, [type]);

  const convertToLowerCase = (text: string) => {
    return text
      ?.split(' ')
      .map((word) => {
        if (word === word.toUpperCase()) {
          return word;
        }

        return word.toLowerCase();
      })
      .join(' ');
  };

  if (!label) {
    return null;
  }

  return (
    <>
      <div className="filter-ai-loading-message-overlay" />
      <div className="filter-ai-loading-message">
        <h2>{sprintf(title, label)}</h2>
        <p>
          {type === 'importing'
            ? sprintf(__('Importing and processing your %s...', 'filter-ai'), convertToLowerCase(label))
            : sprintf(
                __('Analysing your requirements and crafting the perfect %s.', 'filter-ai'),
                convertToLowerCase(label)
              )}
        </p>
        <p>{__('This can take a few moments.', 'filter-ai')}</p>
        <div className="filter-ai-loading-message-animation">
          <DotLottieReact loop autoplay data={loadingJSON} />
        </div>
      </div>
    </>
  );
};

const container = document.createElement('div');
container.id = 'filter-ai-loading-message-container';

document.body.appendChild(container);

const root = createRoot(container);

root.render(<LoadingMessage />);
