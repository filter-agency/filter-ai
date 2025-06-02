import { editPostImage } from './editPostImage';

const load = () => {
  editPostImage();
};

const observer = new MutationObserver(load);

observer.observe(document.body, { childList: true, subtree: true });
