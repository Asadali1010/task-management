import { describe, expect, it } from 'vitest';

import { isRichTextEmpty, normalizeRichTextValue, sanitizeRichTextHtml } from './rich-text-sanitize';

describe('sanitizeRichTextHtml', () => {
  it('strips script tags', () => {
    const result = sanitizeRichTextHtml('<p>Hello<script>alert("xss")</script></p>');

    expect(result).not.toContain('<script');
    expect(result).toContain('Hello');
  });

  it('strips onerror handlers', () => {
    const result = sanitizeRichTextHtml('<img src="x" onerror="alert(1)"><strong>Safe</strong>');

    expect(result).not.toContain('onerror');
    expect(result).not.toContain('<img');
    expect(result).toContain('<strong>Safe</strong>');
  });

  it('preserves bold formatting', () => {
    expect(sanitizeRichTextHtml('<strong>bold</strong>')).toBe('<strong>bold</strong>');
    expect(sanitizeRichTextHtml('<b>bold</b>')).toBe('<b>bold</b>');
  });

  it('preserves italic formatting', () => {
    expect(sanitizeRichTextHtml('<em>italic</em>')).toBe('<em>italic</em>');
    expect(sanitizeRichTextHtml('<i>italic</i>')).toBe('<i>italic</i>');
  });

  it('preserves ordered and unordered lists', () => {
    expect(sanitizeRichTextHtml('<ul><li>one</li><li>two</li></ul>')).toBe(
      '<ul><li>one</li><li>two</li></ul>',
    );
    expect(sanitizeRichTextHtml('<ol><li>first</li></ol>')).toBe('<ol><li>first</li></ol>');
  });

  it('preserves links with href', () => {
    expect(sanitizeRichTextHtml('<a href="https://example.com">Example</a>')).toBe(
      '<a href="https://example.com">Example</a>',
    );
  });

  it('strips javascript links', () => {
    const result = sanitizeRichTextHtml('<a href="javascript:alert(1)">Bad</a>');

    expect(result).not.toContain('javascript:');
  });
});

describe('isRichTextEmpty', () => {
  it('treats empty paragraph markup as empty', () => {
    expect(isRichTextEmpty('<p><br></p>')).toBe(true);
    expect(isRichTextEmpty('<p></p>')).toBe(true);
    expect(isRichTextEmpty('')).toBe(true);
  });

  it('treats formatted content as non-empty', () => {
    expect(isRichTextEmpty('<strong>text</strong>')).toBe(false);
  });
});

describe('normalizeRichTextValue', () => {
  it('returns empty string for empty markup', () => {
    expect(normalizeRichTextValue('<p><br></p>')).toBe('');
  });

  it('returns sanitized html for non-empty content', () => {
    expect(normalizeRichTextValue('<strong>Keep</strong><script>x</script>')).toBe('<strong>Keep</strong>');
  });
});
