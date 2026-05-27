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

export function getCurrentLanguage() {
  const storedLanguage = readStoredLanguage();
  return isSupportedLanguage(storedLanguage) ? storedLanguage : DEFAULT_LANGUAGE;
}

export function setLanguage(lang) {
  if (!isSupportedLanguage(lang)) {
    throw new RangeError(`Unsupported language: ${lang}`);
  }

  writeStoredLanguage(lang);
  return lang;
}

export function t(key, params = {}) {
  const lang = getCurrentLanguage();
  const dictionary = translations[lang] ?? translations[DEFAULT_LANGUAGE];
  const fallbackDictionary = translations[DEFAULT_LANGUAGE];
  const template = dictionary[key] ?? fallbackDictionary[key] ?? key;

  return interpolate(template, params);
}

export const supportedLanguages = Object.freeze(Object.keys(translations));
