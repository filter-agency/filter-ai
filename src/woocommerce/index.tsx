import { createRoot } from '@wordpress/element';
import { ProductToolbar } from './ProductToolbar';

const loadButton = (id: string, buttonsContainerId: string) => {
  const buttonId = `filter-ai-wc-${id}-toolbar-container`;
  const productExcerptButtons = document.getElementById(buttonsContainerId);

  if (!productExcerptButtons || document.getElementById(buttonId)) {
    return;
  }

  const container = document.createElement('div');
  container.id = buttonId;

  const root = createRoot(container);

  productExcerptButtons.append(container);

  root.render(<ProductToolbar id={id} />);
};

const load = () => {
  if (!window?.filter_ai_dependencies?.wc) {
    return;
  }

  loadButton('content', 'wp-content-media-buttons');
  loadButton('excerpt', 'wp-excerpt-media-buttons');
};

const observer = new MutationObserver(load);

observer.observe(document.body, { childList: true, subtree: true });
