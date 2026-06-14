(function () {
  const config = window.BLUEPRINT_I18N;
  if (!config) return;

  const { languages, translations, meta, storageKey, defaultLanguage } = config;
  const originalTextByNode = new WeakMap();
  const originalAttributeByElement = new WeakMap();
  const languageCodes = new Set(languages.map((language) => language.code));
  const currentFromStorage = localStorage.getItem(storageKey);
  let currentLanguage = languageCodes.has(currentFromStorage) ? currentFromStorage : defaultLanguage;

  function normalize(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function t(text, language = currentLanguage) {
    const key = normalize(text);
    if (!key || language === defaultLanguage) return text;
    return translations[language]?.[key] || text;
  }

  function updateMeta(language) {
    const htmlLang = languages.find((item) => item.code === language)?.htmlLang || "en";
    document.documentElement.lang = htmlLang;
    const pageMeta = meta?.[language];
    if (pageMeta) {
      document.title = pageMeta.title;
      const description = document.querySelector('meta[name="description"]');
      if (description) description.setAttribute("content", pageMeta.description);
    }
  }

  function translateAttributes(language) {
    document.querySelectorAll("[placeholder], [aria-label], [alt], [title]").forEach((element) => {
      if (!originalAttributeByElement.has(element)) originalAttributeByElement.set(element, {});
      const originals = originalAttributeByElement.get(element);
      ["placeholder", "aria-label", "alt", "title"].forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return;
        if (!originals[attribute]) originals[attribute] = element.getAttribute(attribute);
        element.setAttribute(attribute, t(originals[attribute], language));
      });
    });
  }

  function translateTextNodes(language) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (["SCRIPT", "STYLE", "IFRAME", "NOSCRIPT"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (parent.closest(".language-switcher")) return NodeFilter.FILTER_REJECT;
        return normalize(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (!originalTextByNode.has(node)) originalTextByNode.set(node, normalize(node.nodeValue));
      const original = originalTextByNode.get(node);
      const translated = t(original, language);
      node.nodeValue = node.nodeValue.replace(normalize(node.nodeValue), translated);
    });
  }

  function createLanguageSwitcher() {
    const nav = document.querySelector(".nav");
    if (!nav || nav.querySelector(".language-switcher")) return;
    const switcher = document.createElement("label");
    switcher.className = "language-switcher";
    switcher.innerHTML = `
      <span class="language-switcher-label">Language</span>
      <select aria-label="Language selector"></select>
    `;
    const select = switcher.querySelector("select");
    languages.forEach((language) => {
      const option = document.createElement("option");
      option.value = language.code;
      option.textContent = language.label;
      select.appendChild(option);
    });
    select.value = currentLanguage;
    select.addEventListener("change", () => setLanguage(select.value));
    nav.appendChild(switcher);
  }

  function setLanguage(language) {
    currentLanguage = languageCodes.has(language) ? language : defaultLanguage;
    localStorage.setItem(storageKey, currentLanguage);
    document.querySelectorAll(".language-switcher select").forEach((select) => {
      select.value = currentLanguage;
    });
    updateMeta(currentLanguage);
    translateTextNodes(currentLanguage);
    translateAttributes(currentLanguage);
    window.dispatchEvent(new CustomEvent("blueprint:languagechange", { detail: { language: currentLanguage } }));
  }

  document.addEventListener("DOMContentLoaded", () => {
    createLanguageSwitcher();
    setLanguage(currentLanguage);
  });

  window.BlueprintI18n = { setLanguage, getLanguage: () => currentLanguage, t };
})();
