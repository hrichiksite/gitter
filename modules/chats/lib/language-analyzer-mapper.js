'use strict';

var MAPPING = {
  ar: 'ar',
  de: 'de',
  en: 'en',
  es: 'es',
  fr: 'fr',
  ja: 'ja',
  pt: 'pt',
  ru: 'ru',
  'zh-Hant': 'zh',
  zh: 'zh'
};

module.exports = exports = function languageAnalyzerMapping(iso639Code) {
  if (MAPPING.hasOwnProperty(iso639Code)) {
    return 'analyzer-' + MAPPING[iso639Code];
  }

  return 'default';
};
