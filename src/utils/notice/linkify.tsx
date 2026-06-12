import type { ReactNode } from 'react';

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;
const TRAILING_PUNCTUATION_PATTERN = /[.,;:!?)]*$/;

const normalizeUrl = (url: string): string => {
  const normalizedUrl = url.replace(/&#0*38;/g, '&').replace(/&amp;/g, '&');

  try {
    const parsedUrl = new URL(normalizedUrl);

    if (parsedUrl.searchParams.get('page') === 'filter_ai_error_logs') {
      const logId = parsedUrl.searchParams.get('log_id');
      parsedUrl.search = '';
      parsedUrl.searchParams.set('page', 'filter_ai');
      if (logId) {
        parsedUrl.searchParams.set('filter_ai_log_id', logId);
      }
      parsedUrl.hash = 'error_logs';

      return parsedUrl.toString();
    }
  } catch {
    return normalizedUrl;
  }

  return normalizedUrl;
};

export const linkifyNoticeMessage = (message: string): ReactNode[] => {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = URL_PATTERN.exec(message)) !== null) {
    const rawUrl = match[0];
    const trailingPunctuation = rawUrl.match(TRAILING_PUNCTUATION_PATTERN)?.[0] ?? '';
    const url = normalizeUrl(trailingPunctuation ? rawUrl.slice(0, -trailingPunctuation.length) : rawUrl);

    if (match.index > lastIndex) {
      parts.push(message.slice(lastIndex, match.index));
    }

    parts.push(
      <a key={`${url}-${match.index}`} href={url} target="_blank" rel="noreferrer">
        {url}
      </a>
    );

    if (trailingPunctuation) {
      parts.push(trailingPunctuation);
    }

    lastIndex = match.index + rawUrl.length;
  }

  if (lastIndex < message.length) {
    parts.push(message.slice(lastIndex));
  }

  return parts.length ? parts : [message];
};
