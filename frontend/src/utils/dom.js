export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

export function $$(selector, parent = document) {
  return parent.querySelectorAll(selector);
}

export function createElement(tag, className, attributes = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  Object.keys(attributes).forEach(key => {
    el.setAttribute(key, attributes[key]);
  });
  return el;
}

export function addStyles(element, styles) {
  Object.assign(element.style, styles);
}

export function showElement(element) {
  element.classList.remove('hidden');
}

export function hideElement(element) {
  element.classList.add('hidden');
}

export function toggleElement(element) {
  element.classList.toggle('hidden');
}