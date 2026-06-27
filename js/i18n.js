/**
 * ProposalAI — i18n (Internationalization) Engine
 * ================================================
 * Automatically detects browser language, loads the correct
 * locale JSON file, and replaces all [data-i18n] elements.
 */

const I18N = (() => {
  const SUPPORTED = ['en', 'pt', 'es', 'fr', 'de', 'it', 'zh', 'ja'];
  const FLAGS = {
    en: '🇺🇸', pt: '🇧🇷', es: '🇪🇸',
    fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹',
    zh: '🇨🇳', ja: '🇯🇵'
  };
  const NAMES = {
    en: 'English', pt: 'Português', es: 'Español',
    fr: 'Français', de: 'Deutsch', it: 'Italiano',
    zh: '中文', ja: '日本語'
  };

  let currentLang = 'en';
  let strings = {};

  function detectLang() {
    const saved = localStorage.getItem('proposalai_lang');
    if (saved && SUPPORTED.includes(saved)) return saved;
    // Force default to English as requested
    return CONFIG?.DEFAULT_LANGUAGE || 'en';
  }

  async function load(lang) {
    try {
      const res = await fetch(`locales/${lang}.json`);
      if (!res.ok) throw new Error('Locale not found');
      strings = await res.json();
      currentLang = lang;
      localStorage.setItem('proposalai_lang', lang);
    } catch (e) {
      if (lang !== 'en') {
        const res = await fetch('locales/en.json');
        strings = await res.json();
        currentLang = 'en';
      }
    }
  }

  function apply() {
    // data-i18n → textContent
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (strings[key] !== undefined) el.textContent = strings[key];
    });
    // data-i18n-ph → placeholder
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.dataset.i18nPh;
      if (strings[key] !== undefined) el.placeholder = strings[key];
    });
    // data-i18n-title → title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.dataset.i18nTitle;
      if (strings[key] !== undefined) el.title = strings[key];
    });
    // Update lang selector button if it exists
    const btn = document.getElementById('lang-btn');
    if (btn) btn.textContent = `${FLAGS[currentLang]} ${NAMES[currentLang]}`;
    // Update html lang attribute
    document.documentElement.lang = currentLang;
  }

  function t(key) {
    return strings[key] || key;
  }

  function buildLangMenu(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    SUPPORTED.forEach(lang => {
      const item = document.createElement('button');
      item.className = `lang-option ${lang === currentLang ? 'active' : ''}`;
      item.textContent = `${FLAGS[lang]} ${NAMES[lang]}`;
      item.dataset.lang = lang;
      item.addEventListener('click', () => switchLang(lang));
      container.appendChild(item);
    });
  }

  async function switchLang(lang) {
    await load(lang);
    apply();
    // Rebuild any lang menus
    document.querySelectorAll('[data-lang-menu]').forEach(el => {
      buildLangMenu(el.id);
    });
    // Dispatch event so pages can react
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  async function init() {
    const lang = detectLang();
    await load(lang);
    apply();
  }

  return { init, t, switchLang, buildLangMenu, getCurrentLang: () => currentLang, getFlags: () => FLAGS, getNames: () => NAMES };
})();

// Auto-init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => I18N.init());
} else {
  I18N.init();
}
