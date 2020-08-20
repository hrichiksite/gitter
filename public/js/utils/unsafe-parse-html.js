'use strict';

/* Parse an HTML string into a DOM Element */
module.exports = function(html) {
  var d = document.createElement('DIV');
  d.innerHTML = html.trim();
  var children = d.children;
  var len = children.length;
  if (len === 1) return children[0];

  var docfrag = document.createDocumentFragment();
  for (var i = 0; i < len; i++) {
    docfrag.appendChild(children[0]);
  }
  return docfrag;
};
