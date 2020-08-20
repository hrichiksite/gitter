'use strict';

const linkRegexp = /(https?:\/\/[^\s<]+[^<.,:;"'\]\s])/g;

const RTLO = '\u202E';
const ENCODED_RTLO = '%E2%80%AE';

const normalizeIdn = urlString => {
  const normalizedHost = new URL(urlString).host;
  if (normalizedHost.indexOf('xn--') === 0) {
    return new URL(urlString).href;
  }
  return urlString;
};

function sanitizeUrl(url) {
  const noRtlo = url.replace(RTLO, ENCODED_RTLO);
  return normalizeIdn(noRtlo);
}

/**
 * takes the message text and replaces suspicious unicode characters in URLS
 * namely, RTLO and unicode in host names
 */
function sanitizeChatText(chatText) {
  const urls = chatText.match(linkRegexp);
  if (!urls || !urls.length) return chatText;
  const replacements = urls.map(u => ({ original: u, new: sanitizeUrl(u) }));
  return replacements.reduce(
    (text, replacement) => text.replace(replacement.original, replacement.new),
    chatText
  );
}

module.exports = { sanitizeChatText };
