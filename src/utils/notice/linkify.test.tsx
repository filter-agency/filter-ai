import { linkifyNoticeMessage } from './linkify';

describe('linkifyNoticeMessage', () => {
  it('turns log URLs in notice messages into anchors', () => {
    const url = 'https://example.test/wp-admin/admin.php?page=filter_ai_error_logs&log_id=42';
    const normalizedUrl = 'https://example.test/wp-admin/admin.php?page=filter_ai&filter_ai_log_id=42#error_logs';
    const parts = linkifyNoticeMessage(`Invalid part data. View the error log: ${url}`);

    expect(parts).toHaveLength(2);
    expect(parts[0]).toBe('Invalid part data. View the error log: ');
    expect(parts[1]).toMatchObject({
      props: {
        href: normalizedUrl,
        target: '_blank',
        rel: 'noreferrer',
        children: normalizedUrl,
      },
    });
  });

  it('keeps trailing punctuation outside the link', () => {
    const url = 'https://example.test/wp-admin/admin.php?page=filter_ai_error_logs&log_id=42';
    const normalizedUrl = 'https://example.test/wp-admin/admin.php?page=filter_ai&filter_ai_log_id=42#error_logs';
    const parts = linkifyNoticeMessage(`Open ${url}.`);

    expect(parts).toHaveLength(3);
    expect(parts[1]).toMatchObject({
      props: {
        href: normalizedUrl,
      },
    });
    expect(parts[2]).toBe('.');
  });

  it('normalizes entity-encoded ampersands in admin URLs', () => {
    const encodedUrl = 'https://example.test/wp-admin/admin.php?page=filter_ai_error_logs&#038;log_id=42';
    const decodedUrl = 'https://example.test/wp-admin/admin.php?page=filter_ai&filter_ai_log_id=42#error_logs';
    const parts = linkifyNoticeMessage(`Open ${encodedUrl}`);

    expect(parts[1]).toMatchObject({
      props: {
        href: decodedUrl,
        children: decodedUrl,
      },
    });
  });
});
