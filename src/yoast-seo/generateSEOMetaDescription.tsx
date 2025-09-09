import { createRoot } from '@wordpress/element';
import { useGenerateSEOMetaDescription } from './useGenerateSEOMetaDescription';
import { DropdownMenu } from '@/components/dropdownMenu';
import _ from 'underscore';

const GenerateSEOMetaDescription = () => {
  const generateSEOMetaDesc = useGenerateSEOMetaDescription();

  return <DropdownMenu controls={_.compact([generateSEOMetaDesc])} toggleProps={{ className: 'is-small' }} />;
};

const addButton = () => {
  const id = 'filter-ai-yst-seo-meta-desc-button';
  const field = document.getElementById('yoast-google-preview-description-metabox');
  const labelId = field?.getAttribute('aria-labelledby');
  const buttonContainer = labelId
    ? document.documentElement.querySelector(`#${labelId} ~ .yst-replacevar__buttons`)
    : null;

  if (!buttonContainer || document.getElementById(id)) {
    return;
  }

  const container = document.createElement('div');
  container.id = id;

  const root = createRoot(container);

  buttonContainer.appendChild(container);

  root.render(<GenerateSEOMetaDescription />);
};

const observer = new MutationObserver(addButton);

observer.observe(document.body, { childList: true, subtree: true });
