document.addEventListener('DOMContentLoaded', () => {
  // get all accordions
  const filterAIFAQs = document.querySelectorAll('.filter-ai-faqs-js');

  // stop here if non exist
  if (!filterAIFAQs) return;

  // loop through each accordion
  filterAIFAQs.forEach((accordion, index) => {
    // get custom attributes set by the block
    const faqsInitialState = accordion.getAttribute('data-filter-ai-faqs-items-initial-state');

    if (faqsInitialState == 'open') {
      // get all children for loop
      var accordionItems = accordion.children;

      // loop through all accordion items and open them
      for (var i = 0; i < accordionItems.length; i++) {
        // run function to open accordion item
        openAccordionItem(accordionItems[i]);
      }
    } else if (faqsInitialState == 'first') {
      // get all children for loop
      var accordionItems = accordion.children;

      // run function to open accordion item
      openAccordionItem(accordionItems[0]);
    }
  });

  // function to open an accordion item
  function openAccordionItem(accordionItem) {
    // get accordion item elements
    var accordionItemToggle = accordionItem.querySelector('.toggle-btn');
    var accordionItemPanel = accordionItem.querySelector('.toggle-panel');

    // update accordion item elements as needed
    accordionItemToggle.classList.add('is-active');
    accordionItemToggle.setAttribute('aria-expanded', 'true');

    accordionItemPanel.classList.add('is-active');
    accordionItemPanel.setAttribute('aria-hidden', 'false');
  }
});
