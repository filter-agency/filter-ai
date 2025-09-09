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
  const buttonContainer = document.documentElement.querySelector(
    '#replacement-variable-editor-field-5 ~ .yst-replacevar__buttons'
  );

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
