if (wp && wp.media) {
  const MediaFrame = wp.media.view.MediaFrame.Select;

  wp.media.view.MediaFrame.Select = MediaFrame.extend({
    initialize: function () {
      MediaFrame.prototype.initialize.apply(this, arguments);

      var State = wp.media.controller.State.extend({
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
    browseRouter: function (routerView) {
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
      var generateImgContent = wp.Backbone.View.extend({
        tagName: 'div',
        className: 'generateImg-content',
        template: wp.template('generateImg'),
        active: false,
        toolbar: null,
        frame: null,
      });

      var view = new generateImgContent();

      this.content.set(view);
    },
  });
}
