'use strict';

module.exports = (function() {
  /* Given a match in a node, replace the text with an image */
  function highlightTerm(node, term, index) {
    var highlightElement = document.createElement('em');
    highlightElement.classList.add('highlight');

    highlightElement.textContent = term;

    node.splitText(index);
    node.nextSibling.nodeValue = node.nextSibling.nodeValue.substr(
      term.length,
      node.nextSibling.nodeValue.length
    );
    highlightElement.appendChild(node.splitText(index));
    node.parentNode.insertBefore(highlightElement, node.nextSibling);
  }

  function highlight(el, terms) {
    var nodeIterator = document.createTreeWalker(
      el,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      function(node) {
        if (node.nodeType !== 1) {
          /* Text Node? Good! */
          return NodeFilter.FILTER_ACCEPT;
        }

        // if (ignoredTags[node.tagName] || node.classList.contains('no-emojify')) {
        //   return NodeFilter.FILTER_REJECT;
        // }

        return NodeFilter.FILTER_SKIP;
      },
      false
    );

    var nodeList = [];
    var node;
    while ((node = nodeIterator.nextNode()) !== null) {
      nodeList.push(node);
    }

    var unifiedReSource = terms
      .map(function(v) {
        var reSource = v.replace(/(^|[^\[])\^/g, '$1');
        return '(' + reSource + ')';
      })
      .join('|');

    /* The regex used to find emoji */
    var unifiedRe = new RegExp(unifiedReSource, 'gi');

    nodeList.forEach(function(node) {
      var match, matchIndex;
      var matches = [];

      while ((match = unifiedRe.exec(node.data)) !== null) {
        matches.push(match);
      }

      for (var i = matches.length; i-- > 0; ) {
        match = matches[i];
        highlightTerm(node, match[0], match.index, matchIndex);
      }
    });
  }

  function removeHighlights(el) {
    var nodeList = el.querySelectorAll('em.highlight');

    for (var i = 0; i < nodeList.length; ++i) {
      var highlightNode = nodeList[i];
      var textNode = document.createTextNode(highlightNode.textContent);
      highlightNode.parentNode.replaceChild(textNode, highlightNode);
    }
  }

  return {
    highlight: highlight,
    removeHighlights: removeHighlights
  };
})();
