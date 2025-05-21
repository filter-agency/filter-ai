import { createRoot } from '@wordpress/element';
import { ProductDescriptionToolbar } from './productDescription';
import { ProductExcerptToolbar } from './productExcerpt';

const loadContent = () => {
  const id = 'filter-ai-wc-content-toolbar-container';
  const productDescriptionButtons = document.getElementById('wp-content-media-buttons');

  if (!productDescriptionButtons || document.getElementById(id)) {
    return;
  }

  const container = document.createElement('div');
  container.id = id;

  const root = createRoot(container);

  productDescriptionButtons.append(container);

  root.render(<ProductDescriptionToolbar />);
};

const loadExcerpt = () => {
  const id = 'filter-ai-wc-excerpt-toolbar-container';
  const productExcerptButtons = document.getElementById('wp-excerpt-media-buttons');

  if (!productExcerptButtons || document.getElementById(id)) {
    return;
  }

  const container = document.createElement('div');
  container.id = id;

  const root = createRoot(container);

  productExcerptButtons.append(container);

  root.render(<ProductExcerptToolbar />);
};

const load = () => {
  loadContent();
  loadExcerpt();
};

const observer = new MutationObserver(load);

observer.observe(document.body, { childList: true, subtree: true });
