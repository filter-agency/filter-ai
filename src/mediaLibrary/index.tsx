import { DropdownMenu } from '@/components/dropdownMenu';
import { ai, hideLoadingMessage, showLoadingMessage, showNotice, t } from '@/utils';

// @ts-expect-error can't find Underscore or Backbone
const Events = window?._?.extend({}, window?.Backbone?.Events);

(function () {
  const AttachmentDetails =
    window.wp.media?.view?.Attachment?.Details?.TwoColumn || window.wp?.media?.view?.Attachment?.Details;

  if (!AttachmentDetails) {
    return;
  }

  const OverrideAttachmentDetails = AttachmentDetails.extend({
    initialize: function () {
      AttachmentDetails.prototype.render.apply(this, arguments);

      this.listenTo(Events, 'filter-ai:generateAltText', this.generateAltText);
    },
    async generateAltText(event: Event) {
      event?.preventDefault();

      showLoadingMessage(t('Generating alt text'));

      try {
        const altText = await ai.getAltTextFromUrl(this.model.get('url'));
        if (!altText) {
          throw new Error(t('Sorry, there has been an issue while generating your alt text 0.'));
        }
        this.model.set('alt', altText);
        this.model.save();
        this.render();
        showNotice(t('Alt text has been updated.'));
      } catch (error) {
        console.error(error);

        // @ts-expect-error
        showNotice(error?.message || error);
      } finally {
        hideLoadingMessage();
      }
    },
  });

  if (window.wp.media.view.Attachment.Details.TwoColumn) {
    window.wp.media.view.Attachment.Details.TwoColumn = OverrideAttachmentDetails;
  } else {
    window.wp.media.view.Attachment.Details = OverrideAttachmentDetails;
  }
})();

(function () {
  const Modal = window.wp.media?.view?.Modal;

  if (!Modal) {
    return;
  }

  const { render } = window.wp.element;

  const OverrideModal = Modal.extend({
    render: function () {
      Modal.prototype.render.apply(this, arguments);

      this.$el.find('.media-frame-title').addClass('filter-ai-media-frame-title');

      const container = document.createElement('div');
      container.id = 'filter-ai-media-modal-container';

      this.$el.find('.edit-media-header').addClass('filter-ai-edit-media-header');

      this.$el.find('.media-modal-close').before(container);

      render(
        <DropdownMenu
          controls={[
            {
              title: t('Generate Alt Text'),
              onClick: () => {
                Events.trigger('filter-ai:generateAltText');
              },
            },
          ]}
        />,
        container
      );
    },
  });

  window.wp.media.view.Modal = OverrideModal;
})();
