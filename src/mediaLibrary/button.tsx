import { DropdownMenu } from '@/components/dropdownMenu';
import { useSettings } from '@/settings';
import { ai, hideLoadingMessage, showLoadingMessage, showNotice } from '@/utils';
import { useEffect, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import _ from 'underscore';
import { usePrompts } from '@/utils/ai/prompts/usePrompts';

const maxPixelSize = 2000;

const Events = _.extend({}, window?.Backbone?.Events);

(() => {
  const AttachmentDetails =
    window.wp?.media?.view?.Attachment?.Details?.TwoColumn || window.wp?.media?.view?.Attachment?.Details;

  if (!AttachmentDetails) return;

  const OverrideAttachmentDetails = AttachmentDetails.extend({
    render: function () {
      AttachmentDetails.prototype.render.apply(this, arguments);

      this.listenTo(Events, 'filter-ai:generateAltText', this.generateAltText);

      Events.trigger('filter-ai:generateAltTextEnabled', true);
    },
    remove: function () {
      AttachmentDetails.prototype.remove.apply(this);

      this.stopListening(Events, 'filter-ai:generateAltText', this.generateAltText);

      Events.trigger('filter-ai:generateAltTextEnabled', false);
    },
    async generateAltText(customPrompt?: string) {
      showLoadingMessage(__('Alt Text', 'filter-ai'));

      try {
        if (!this.model.get('sizes')?.medium?.url) {
          if (this.model.get('width') > maxPixelSize || this.model.get('height') > maxPixelSize) {
            throw new Error(__('Please choose a smaller image.', 'filter-ai'));
          }
        }

        const url = this.model.get('sizes')?.medium?.url || this.model.get('url');

        const altText = await ai.getAltTextFromUrl(url, this.model.get('alt'), customPrompt);

        if (!altText) {
          throw new Error(__('Sorry, there has been an issue while generating your alt text.', 'filter-ai'));
        }

        this.model.set('alt', altText);

        this.model.save();

        this.render();

        showNotice({ message: __('Alt text has been updated.', 'filter-ai') });
      } catch (error) {
        console.error(error);

        // @ts-expect-error Property 'message' does not exist on type '{}'
        showNotice({ message: error?.message || error, type: 'error' });
      } finally {
        hideLoadingMessage();
      }
    },
  });

  if (window.wp?.media.view.Attachment.Details.TwoColumn) {
    window.wp.media.view.Attachment.Details.TwoColumn = OverrideAttachmentDetails;
  } else if (window.wp?.media.view.Attachment.Details) {
    window.wp.media.view.Attachment.Details = OverrideAttachmentDetails;
  }
})();

(() => {
  const Modal = window.wp?.media?.view?.Modal;

  if (!Modal) return;

  const { createRoot } = window.wp?.element || {};

  const ModalButton = () => {
    const [generateAltTextEnabled, setGenerateAltTextEnabled] = useState(false);

    const { settings } = useSettings();

    const prompt = usePrompts('image_alt_text_prompt');

    const controls = useMemo(() => {
      const options = [];

      if (settings?.image_alt_text_enabled) {
        options.push({
          title: __('Generate Alt Text', 'filter-ai'),
          onClick: () => {
            Events.trigger('filter-ai:generateAltText', prompt);
          },
          isDisabled: !generateAltTextEnabled,
        });
      }

      return options;
    }, [settings, generateAltTextEnabled]);

    useEffect(() => {
      Events.listenTo(Events, 'filter-ai:generateAltTextEnabled', setGenerateAltTextEnabled);

      if (document.documentElement.querySelector('.attachment-details .alt-text')) {
        setGenerateAltTextEnabled(true);
      }

      return () => {
        Events.stopListening(Events, 'filter-ai:generateAltTextEnabled', setGenerateAltTextEnabled);
      };
    }, []);

    return <DropdownMenu controls={controls} />;
  };

  const OverrideModal = Modal.extend({
    render: function () {
      Modal.prototype.render.apply(this, arguments);

      this.$el.find('.media-frame-title').addClass('filter-ai-media-frame-title');

      const container = document.createElement('div');
      container.id = 'filter-ai-media-modal-container';

      const root = createRoot?.(container);

      this.$el.find('.edit-media-header').addClass('filter-ai-edit-media-header');

      this.$el.find('.media-modal-close').before(container);

      root.render(<ModalButton />);
    },
  });

  window.wp.media.view.Modal = OverrideModal;
})();
