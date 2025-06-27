import { createRoot } from 'react-dom/client';
import GenerateImgTab from './GenerateImgTab';

declare const wp: any;

if (wp && wp.media) {
  const MediaFrame = wp.media.view.MediaFrame.Select;

  wp.media.view.MediaFrame.Select = MediaFrame.extend({
    initialize: function () {
      MediaFrame.prototype.initialize.apply(this, arguments);

      const State = wp.media.controller.State.extend({
        insert: function () {
          console.log('Custom Tab');
          this.MediaFrame.close();
        },
      });

      this.states.add([
        new State({
          id: 'generateImg',
          title: 'Generate AI Image',
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
        browse: {
          text: wp.media.view.l10n.mediaLibraryTitle,
          priority: 30,
        },
        generateImg: {
          text: 'Generate Img',
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
          renderGenerateImgReact(container);
          return this;
        },

        remove: function () {
          unmountGenerateImgReact(container);
          wp.Backbone.View.prototype.remove.call(this);
        },
      });

      const view = new View();
      this.content.set(view);
    },
  });
}

// Use createRoot to mount React content
let root: any = null;

function renderGenerateImgReact(container: HTMLElement) {
  root = createRoot(container);
  root.render(<GenerateImgTab />);
}

function unmountGenerateImgReact(container: HTMLElement) {
  if (root) {
    root.unmount();
    root = null;
  }
}
