'use strict';

/*\
|*|
|*|  :: cookies.js ::
|*|
|*|  A complete cookies reader/writer framework with full unicode support.
|*|
|*|  Revision #1 - September 4, 2014
|*|
|*|  https://developer.mozilla.org/en-US/docs/Web/API/document.cookie
|*|  https://developer.mozilla.org/User:fusionchess
|*|
|*|  This framework is released under the GNU Public License, version 3 or later.
|*|  http://www.gnu.org/licenses/gpl-3.0-standalone.html
|*|
|*|  Syntaxes:
|*|
|*|  * docCookies.setItem(name, value[, end[, path[, domain[, secure]]]])
|*|  * docCookies.getItem(name)
|*|  * docCookies.removeItem(name[, path[, domain]])
|*|  * docCookies.hasItem(name)
|*|  * docCookies.keys()
|*|
\*/
var secure = document.location.protocol === 'https:';

module.exports = {
  get: function(sKey) {
    if (!sKey) {
      return null;
    }
    return (
      decodeURIComponent(
        document.cookie.replace(
          new RegExp(
            '(?:(?:^|.*;)\\s*' +
              encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, '\\$&') +
              '\\s*\\=\\s*([^;]*).*$)|^.*$'
          ),
          '$1'
        )
      ) || null
    );
  },
  set: function(sKey, sValue) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) return;
    // document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + "; expires=Fri, 31 Dec 9999 23:59:59 GMT; domain=" + domain + (secure ? "; secure" : "");
    document.cookie =
      encodeURIComponent(sKey) +
      '=' +
      encodeURIComponent(sValue) +
      '; expires=Fri, 31 Dec 9999 23:59:59 GMT; ' +
      (secure ? '; secure; SameSite=None' : '');
  }
};
