/**
 * i18n utility functions for internationalization
 */

/**
 * Get translated message
 * @param {string} messageName - The message key
 * @param {string|string[]} substitutions - Optional substitutions
 * @returns {string} Translated message
 */
export function getMessage(messageName, substitutions) {
  return chrome.i18n.getMessage(messageName, substitutions) || messageName;
}

/**
 * Translate all elements with data-i18n attribute
 * Usage: <element data-i18n="messageKey">fallback text</element>
 */
export function translatePage() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const message = getMessage(key);
    
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      // For input/textarea, set placeholder
      if (element.hasAttribute('placeholder')) {
        element.setAttribute('placeholder', message);
      } else {
        element.value = message;
      }
    } else {
      // For other elements, set text content
      element.textContent = message;
    }
  });
  
  // Translate placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    element.setAttribute('placeholder', getMessage(key));
  });
  
  // Translate titles
  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    const key = element.getAttribute('data-i18n-title');
    element.setAttribute('title', getMessage(key));
  });
  
  // Update document title
  const titleElement = document.querySelector('title[data-i18n]');
  if (titleElement) {
    const key = titleElement.getAttribute('data-i18n');
    document.title = getMessage(key);
  }
}

/**
 * Get current locale
 * @returns {string} Current locale (e.g., 'en', 'zh_CN')
 */
export function getLocale() {
  return chrome.i18n.getUILanguage();
}

/**
 * Check if current locale is Chinese
 * @returns {boolean}
 */
export function isZhCN() {
  const locale = getLocale();
  return locale.startsWith('zh');
}
