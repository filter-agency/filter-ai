(() => {
  const $faqs = window.jQuery?.('.wp-block-filter-ai-faqs');

  if (!$faqs?.length) {
    return;
  }

  $faqs.each(function (this: any) {
    const $faqGroup = window.jQuery(this);

    $faqGroup.find('.filter-ai-faq-item-answer').hide();

    $faqGroup.find('summary').on('click', function (this: any, e: MouseEvent) {
      e.preventDefault();

      const $this = window.jQuery(this);
      const $parent = $this.closest('details');
      const isOpen = $parent.prop('open');

      if (isOpen) {
        $this.next('.filter-ai-faq-item-answer').slideUp(400, () => {
          $parent.removeAttr('open');
        });
      } else {
        $faqGroup.find('details[open] summary').trigger('click');

        $parent.prop('open', true);

        $this.next('.filter-ai-faq-item-answer').slideDown(400);
      }
    });
  });
})();
