import { DropdownMenu } from '@/components/dropdownMenu';
import { useSettings } from '@/settings';
import { ai, hideLoadingMessage, showLoadingMessage, showNotice, t } from '@/utils';
import { useMemo } from '@wordpress/element';
import _ from 'underscore';

const Events = _.extend({}, window?.Backbone?.Events);

(function () {
  const AttachmentDetails =
    window.wp.media?.view?.Attachment?.Details?.TwoColumn || window.wp.media?.view?.Attachment?.Details;

  if (!AttachmentDetails) {
    return;
  }

  const OverrideAttachmentDetails = AttachmentDetails.extend({
    initialize: function () {
      AttachmentDetails.prototype.render.apply(this, arguments);

      this.listenTo(Events, 'filter-ai:generateAltText', this.generateAltText);
    },
    async generateAltText(customPrompt?: string) {
      showLoadingMessage(t('Generating alt text'));

      try {
        const altText = await ai.getAltTextFromUrl(this.model.get('url'), this.model.get('alt'), customPrompt);

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

  const { createRoot } = window.wp.element;

  const ModalButton = () => {
    const { settings } = useSettings();

    const controls = useMemo(() => {
      const options = [];

      if (settings?.image_alt_text_enabled) {
        options.push({
          title: t('Generate Alt Text'),
          onClick: () => {
            Events.trigger('filter-ai:generateAltText', settings?.image_alt_text_prompt);
          },
        });
      }

      return options;
    }, [settings]);

    return <DropdownMenu controls={controls} />;
  };

  const OverrideModal = Modal.extend({
    render: function () {
      Modal.prototype.render.apply(this, arguments);

      this.$el.find('.media-frame-title').addClass('filter-ai-media-frame-title');

      const container = document.createElement('div');
      container.id = 'filter-ai-media-modal-container';

      const root = createRoot(container);

      this.$el.find('.edit-media-header').addClass('filter-ai-edit-media-header');

      this.$el.find('.media-modal-close').before(container);

      root.render(<ModalButton />);
    },
  });

  window.wp.media.view.Modal = OverrideModal;
})();
