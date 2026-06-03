import { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { filterAILogo } from '@/assets/filter-logo';
import { createRoot, useEffect, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import ImageAltText from './imageAltText';
import SEOTitles from './seoTitles';
import SEOMetaDescriptions from './seoMetaDescriptions';
import AIServiceNotice from '@/components/aiServiceNotice';
import BrandVoiceNotice from '@/components/brandVoiceNotice';

type Tab = {
  label: string;
  Component: () => ReactNode;
};

type Tabs = Record<string, Tab>;

const baseUrl = '?page=filter_ai_submenu_page_batch';

const tabs: Tabs = {
  image_alt_text: {
    label: __('Image Alt Text', 'filter-ai'),
    Component: ImageAltText,
  },
  seo_titles: {
    label: __('SEO Titles', 'filter-ai'),
    Component: SEOTitles,
  },
  seo_meta_descriptions: {
    label: __('SEO Meta Descriptions', 'filter-ai'),
    Component: SEOMetaDescriptions,
  },
};

const getKey = () => {
  const key = window.location.hash.replace('#', '');

  if (key in tabs) {
    return key;
  }

  return 'image_alt_text';
};

const BatchGeneration = () => {
  const [currentTabKey, setCurrentTabKey] = useState(getKey());

  const Content = useMemo(() => {
    return tabs[currentTabKey].Component;
  }, [currentTabKey]);

  useEffect(() => {
    const abortController = new AbortController();

    window.addEventListener(
      'hashchange',
      () => {
        setCurrentTabKey(getKey());
      },
      { signal: abortController.signal }
    );

    return () => {
      abortController.abort();
    };
  }, []);

  return (
    <div className="filter-ai-settings">
      <header className="filter-ai-settings-header">
        <div className="filter-ai-settings-header-content">
          <img src={filterAILogo} alt={__('Filter AI logo', 'filter-ai')} />
          <div>
            <h1>{__('Filter AI Batch Generation', 'filter-ai')}</h1>
            <p>{__('Run AI generation across many posts, pages, and media items at once.', 'filter-ai')}</p>
          </div>
        </div>
        <nav className="nav-tab-wrapper">
          {Object.keys(tabs).map((key) => {
            const isActive = currentTabKey === key;

            return (
              <a
                key={key}
                href={`${baseUrl}#${key}`}
                className={`nav-tab ${isActive ? 'nav-tab-active' : ''}`}
                onClick={(e) => {
                  // Modifier-clicks / middle-click / right-click → let the
                  // browser handle the link normally (open in new tab, etc.).
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
                    return;
                  }
                  e.preventDefault();
                  // Update the URL bar without firing hashchange (which is the
                  // async path that introduced the 1–2 frame delay where the
                  // previous tab's content was still painted under the new
                  // active-tab indicator). flushSync forces React to apply the
                  // state update and re-render BEFORE returning from this
                  // handler, so the DOM is correct before the next paint.
                  window.history.replaceState(null, '', `${baseUrl}#${key}`);
                  flushSync(() => setCurrentTabKey(key));
                }}
              >
                {tabs[key].label}
              </a>
            );
          })}
        </nav>
      </header>
      <div className="filter-ai-settings-content">
        <BrandVoiceNotice />
        <AIServiceNotice />
        <Content />
        <div>
          <a href="/wp-admin/tools.php?page=action-scheduler">{__('View batch generation log', 'filter-ai')}</a>
        </div>
      </div>
    </div>
  );
};

(function () {
  const container = document.getElementById('filter-ai-batch-container');

  if (!container) {
    return;
  }

  const root = createRoot(container);

  root.render(<BatchGeneration />);
})();
