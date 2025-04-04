import { DropdownMenu } from '@/components/dropdownMenu';
import { createRoot } from '@wordpress/element';
import { useGenerateExcerpt } from './useGenerateExcerpt';
import _ from 'underscore';

const PostToolbar = () => {
  const generateExcerpt = useGenerateExcerpt();

  return <DropdownMenu controls={_.compact([generateExcerpt])} toggleProps={{ className: 'is-small' }} />;
};

const addToolbar = () => {
  const id = 'filter-ai-post-toolbar-container';
  const postActionsButton = document.documentElement.querySelector('.editor-all-actions-button');

  if (!postActionsButton || document.getElementById(id)) {
    return;
  }

  const container = document.createElement('div');
  container.id = id;

  const root = createRoot(container);

  postActionsButton.before(container);

  root.render(<PostToolbar />);
};

const observer = new MutationObserver(addToolbar);

observer.observe(document.body, { childList: true, subtree: true });
