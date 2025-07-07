import { createRoot } from 'react-dom/client';
import GenerateImgTabView from './generateImgTabView';
import { __ } from '@wordpress/i18n';

declare const wp: any;

export function addGenerateImageTab() {
  if (!(wp && wp.media)) {
    console.warn('[GenerateImgTab] wp.media not available.');
    return;
  }

  const MediaFrame = wp.media.view.MediaFrame.Select;

  wp.media.view.MediaFrame.Select = MediaFrame.extend({
    initialize: function () {
      MediaFrame.prototype.initialize.apply(this, arguments);

      const State = wp.media.controller.State.extend({
        insert: function () {
          this.MediaFrame.close();
        },
      });

      this.states.add([
        new State({
          id: 'generateImg',
          title: __('Generate AI Image', 'filter-ai'),
          search: false,
        }),
      ]);

      this.on('content:render:generateImg', this.renderGenerateImg, this);
    },
    browseRouter: function (routerView: any) {
      routerView.set({
        upload: {
          text: wp.media.view.l10n.uploadFilesTitle,
          priority: 20,
        },
        generateImg: {
          text: __('Generate AI Image', 'filter-ai'),
          priority: 30,
        },
        browse: {
          text: wp.media.view.l10n.mediaLibraryTitle,
          priority: 40,
        },
      });
    },

    renderGenerateImg: function () {
      const container = document.createElement('div');
      container.className = 'generateImg-content';

      const View = wp.Backbone.View.extend({
        className: 'generateImg-wrapper',
        render: function () {
          this.$el.append(container);
          try {
            renderGenerateImgReact(container);
          } catch (err) {
            console.error('[GenerateImgTab] React render error:', err);
          }

          return this;
        },

        remove: function () {
          unmountGenerateImgReact();
          wp.Backbone.View.prototype.remove.call(this);
        },
      });

      const view = new View();
      this.content.set(view);
    },
  });
}

let root: any = null;

function renderGenerateImgReact(container: HTMLElement) {
  root = createRoot(container);
  root.render(<GenerateImgTabView />);
}

function unmountGenerateImgReact() {
  if (root) {
    root.unmount();
    root = null;
  }
}

function tryAddGenerateImageTab() {
  if (wp?.media?.view?.MediaFrame?.Select) {
    addGenerateImageTab();
  }
}

const observer = new MutationObserver(() => {
  tryAddGenerateImageTab();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
