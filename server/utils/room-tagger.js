'use strict';

var LanguageDetect = require('languagedetect');
var lang = new LanguageDetect();
var keywords = require('keyword-extractor');

// const
var MAX_TAGS = 6; // maximum amount of tags
var MAX_LANGS = 3; // maximum amount of languages to be returned from detection
var MIN_CONFIDENCE = 0.2; // minimum confidence for language detection

// to be used inside filter
var dedupe = function(val, i, arr) {
  return arr.indexOf(val) === i;
};

// removes undefined and null values from array
var clean = function(val) {
  return !!val;
};

var format = function(item) {
  return item.toLowerCase().replace("'s", '');
};

var removeLitterTags = function(item) {
  return /^[\w_-]+$/.test(item);
};

/**
 * detect() detects the language of a String
 *
 * str        String - the string to be detected
 * @returns    Array - list of languages, ordered by confidence
 */
var detect = function(str) {
  return lang
    .detect(str, MAX_LANGS)
    .filter(function(lang) {
      return lang[1] >= MIN_CONFIDENCE;
    })
    .map(function(lang) {
      return lang[0];
    });
};

/**
 * extract() gets keywords from a String
 *
 * str        String - the string to be extracted
 * lang       String (optional) - the language of the String, if known
 * @returns    Array - list of keywords
 */
var extract = function(str, lang) {
  var supported = ['english', 'spanish', 'polish']; // unfortunately the keyword-extractor lib, does not provide a public list of supported langs
  var language = supported.indexOf(lang) >= 0 ? lang : 'english';
  return keywords.extract(str, {
    language: language,
    return_changed_case: true
  });
};

/**
 * getContentBlob() gets the extractable parts from the repo and the room and concatenates them
 *
 * room     Room - the room object
 * repo     Object - the information from GitHub
 * @return  String - the content
 */
var getContentBlob = function(room, repo) {
  return [room.topic, repo.description].filter(clean).reduce(function(prev, curr) {
    return prev + ' ' + curr;
  }, '');
};

// returns a set of known attributes from github
var getRepoKeywords = function(repo) {
  return [
    // repo.name,
    repo.language
    // repo.owner && repo.owner.login,
    // repo.source && repo.source.owner.login
  ];
};

// merges all the tags and trims them it based on MAX_TAGS
var mergeTags = function(/* arrays */) {
  var args = [].slice.call(arguments);

  return [].concat
    .apply([], args)
    .filter(clean) // remove null and undefined values
    .map(format)
    .filter(removeLitterTags)
    .filter(dedupe)
    .slice(0, MAX_TAGS);
};

// module will take a Room Obejct and a Repo Object (from GitHub) and return an array of tags.
module.exports = function autoTag(room, repo) {
  repo = repo || {}; // setting default, in case we have no GitHub data

  var content = getContentBlob(room, repo);
  var languages = detect(content);
  var keywords = extract(content, languages[0]); // top language
  var gh_keywords = getRepoKeywords(repo);

  return mergeTags(gh_keywords, keywords);
};
