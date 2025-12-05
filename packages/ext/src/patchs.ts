const _createElement = document.createElement.bind(document)

/**
 * Patches `document.createElement` to ensure HTML elements have the correct namespace
 * in isolated content scripts when `document.contentType` is "image/svg+xml" or "application/xml".
 */
export function patchCreateElement() {
  const htmlTags = [
    "div",
    "p",
    "span",
    "a",
    "b",
    "strong",
    "i",
    "u",
    "img",
    "canvas",
    "video",
    "audio",
    "button",
    "input",
    "iframe",
    "textarea",
    "select",
    "option",
    "ul",
    "li",
    "ol",
    "table",
    "tr",
    "td",
    "th",
    "thead",
    "tbody",
    "footer",
    "header",
    "nav",
    "section",
    "article",
    "main",
    "aside",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "form",
    "label",
  ]
  document.createElement = function (tag: string) {
    if (htmlTags.includes(tag.toLowerCase())) {
      return document.createElementNS("http://www.w3.org/1999/xhtml", tag)
    }
    return _createElement(tag)
  }

  return {
    original: _createElement,
    restore() {
      document.createElement = _createElement
    },
  }
}
