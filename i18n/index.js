import en from "./en.js";
import he from "./he.js";

const DEFAULT_LANGUAGE = "he";
const STORAGE_KEY = "enzymetrics.language";

const translations = {
  he,
  en,
};

function canUseLocalStorage() {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function isSupportedLanguage(lang) {
  return Object.hasOwn(translations, lang);
}

function readStoredLanguage() {
  if (!canUseLocalStorage()) {
    return null;
  }

  return window.localStorage.getItem(STORAGE_KEY);
}

function writeStoredLanguage(lang) {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(STORAGE_KEY, lang);
  }
}

function interpolate(template, params = {}) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    const value = params[key];
    return value === undefined || value === null ? match : String(value);
  });
}

export function getLanguageDirection(lang = getCurrentLanguage()) {
  return lang === "he" ? "rtl" : "ltr";
}

function applyDocumentDirection(lang) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = lang;
  document.documentElement.dir = getLanguageDirection(lang);
}

export function getCurrentLanguage() {
  const storedLanguage = readStoredLanguage();
  return isSupportedLanguage(storedLanguage) ? storedLanguage : DEFAULT_LANGUAGE;
}

export function setLanguage(lang) {
  if (!isSupportedLanguage(lang)) {
    throw new RangeError(lang);
  }

  writeStoredLanguage(lang);
  applyDocumentDirection(lang);

  if (typeof document !== "undefined") {
    applyTranslations();
  }

  return lang;
}

export function t(key, params = {}) {
  const lang = getCurrentLanguage();
  const dictionary = translations[lang] ?? translations[DEFAULT_LANGUAGE];
  const fallbackDictionary = translations[DEFAULT_LANGUAGE];
  const template = dictionary[key] ?? fallbackDictionary[key] ?? key;

  return interpolate(template, params);
}

export function applyTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  root.querySelectorAll("[data-i18n-attr-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", t(element.dataset.i18nAttrPlaceholder));
  });

  root.querySelectorAll("[data-i18n-attr-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAttrAriaLabel));
  });

  root.querySelectorAll("[data-i18n-attr-alt]").forEach((element) => {
    element.setAttribute("alt", t(element.dataset.i18nAttrAlt));
  });

  if (root === document) {
    const lang = getCurrentLanguage();
    applyDocumentDirection(lang);
    document.title = t("app.title");
  }
}

export const supportedLanguages = Object.freeze(Object.keys(translations));
