import sanitizeHtml from 'sanitize-html';

/** 富文本白名单：后台编辑器产出的 HTML 在返回前台前统一过滤 */
const RICH_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
    'h1', 'h2', 'h3', 'h4', 'h5', 'blockquote',
    'ul', 'ol', 'li',
    'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'figure', 'figcaption', 'pre', 'code',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
    code: ['class'],
    pre: ['class'],
    span: ['style'],
    p: ['style'],
  },
  allowedStyles: {
    '*': {
      'text-align': [/^(?:left|right|center|justify)$/],
      'font-weight': [/^(?:bold|normal|\d{3})$/],
      color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/],
      'background-color': [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/],
    },
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  disallowedTagsMode: 'discard',
};

export function sanitizeRichHtml(html: string | null | undefined): string | null {
  if (html === null || html === undefined) return null;
  return sanitizeHtml(String(html), RICH_OPTIONS);
}

/** 摘要 / 标题类字段：剥掉所有标签，折叠空白 */
export function stripHtml(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  return sanitizeHtml(String(text), { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();
}

/** 单行文本入参统一 trim + 空串转 null，便于可选字段干净落库 */
export function textOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length ? str : null;
}
