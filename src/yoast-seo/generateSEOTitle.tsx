import { createRoot } from '@wordpress/element';
import { useGenerateSEOTitle } from './useGenerateSEOTitle';
import { DropdownMenu } from '@/components/dropdownMenu';
import _ from 'underscore';

const GenerateSEOTitle = () => {
  const generateSEOTitle = useGenerateSEOTitle();

  return <DropdownMenu controls={_.compact([generateSEOTitle])} toggleProps={{ className: 'is-small' }} />;
};

const addButton = () => {
  const id = 'filter-ai-yst-seo-title-button';
  const buttonContainer = document.documentElement.querySelector(
    '#replacement-variable-editor-field-4 ~ .yst-replacevar__buttons'
  );

  if (!buttonContainer || document.getElementById(id)) {
    return;
  }

  const container = document.createElement('div');
  container.id = id;

  const root = createRoot(container);

  buttonContainer.appendChild(container);

  root.render(<GenerateSEOTitle />);
};

const observer = new MutationObserver(addButton);

observer.observe(document.body, { childList: true, subtree: true });
