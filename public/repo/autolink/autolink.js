!(function(e) {
  function t(e) {
    for (
      var t,
        n = document.createNodeIterator(
          e,
          NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
          function(e) {
            return 1 !== e.nodeType
              ? NodeFilter.FILTER_ACCEPT
              : 'A' === e.tagName
              ? NodeFilter.FILTER_REJECT
              : NodeFilter.FILTER_SKIP;
          },
          !1
        );
      null !== (t = n.nextNode());

    ) {
      var r = /\b((?:https?:\/\/|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>“”‘’'"]+|\(([^\s()<>“”‘’'"]+|(\([^\s()<>“”‘’'"]+\)))*\))+(?:\(([^\s()<>“”‘’'"]+|(\([^\s()<>“”‘’'"]+\)))*\)|[^\s`!()\[\]{};:.,<>?«»“”‘’'"]))/i,
        o = r.exec(t.data);
      if (o) {
        var i = o[0],
          a = document.createElement('a');
        a.setAttribute('target', '_blank'),
          a.setAttribute('rel', 'nofollow'),
          (a.textContent = i),
          i.match(/^https?:\/\//)
            ? a.setAttribute('href', i)
            : a.setAttribute('href', 'http://' + i);
        var d = t.splitText(o.index);
        (d.nodeValue = d.nodeValue.substr(i.length)), t.parentNode.insertBefore(a, d), n.nextNode();
      }
    }
  }
  return (
    (e.autolink = t),
    'function' == typeof define &&
      define.amd &&
      define([], function() {
        return t;
      }),
    t
  );
})(window);
