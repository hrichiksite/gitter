'use strict';

function getIana() {
  try {
    return new window.Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {
    return;
  }
}

module.exports = function getTimezoneInfo() {
  var d = new Date();
  var m = d.toTimeString().match(/\(([^\)]+)\)/);
  var abbr = (m && m[1]) || '';
  var offset = d.getTimezoneOffset();

  var sign = offset >= 0 ? '+' : '-';
  offset = Math.abs(offset);
  var hours = Math.floor(offset / 60);
  var mins = Math.round(offset % 60);

  return {
    offset: sign + (hours > 9 ? hours : '0' + hours) + (mins > 9 ? mins : '0' + mins),
    iso: sign + (hours > 9 ? hours : '0' + hours) + ':' + (mins > 9 ? mins : '0' + mins),
    abbr: abbr,
    iana: getIana()
  };
};
