import DOMPurify from 'dompurify';

const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'ul', 'ol', 'li', 'a'];
const ALLOWED_ATTR = ['href'];

export function sanitizeRichTextHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}

export function isRichTextEmpty(html: string | null | undefined): boolean {
  if (!html) {
    return true;
  }

  const sanitized = sanitizeRichTextHtml(html);
  const textOnly = sanitized.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  return textOnly.length === 0;
}

export function normalizeRichTextValue(html: string): string {
  const sanitized = sanitizeRichTextHtml(html);
  return isRichTextEmpty(sanitized) ? '' : sanitized;
}
