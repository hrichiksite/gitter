'use strict';

function isWhitespace(char) {
  return char === '\n' || char === ' ' || char === '\t';
}

module.exports = {
  attachElContent: function fastAttachElContent(html) {
    var el = this.el;
    if (typeof html === 'string') {
      el.innerHTML = html;
      return this;
    }

    if (html.length) {
      el.innerHTML = '';
      var len = html.length;
      for (var i = 0; i < len; i++) {
        var chunk = html[i];
        /* Ignore empty text chunks */
        if (
          chunk.nodeType === 3 &&
          chunk.textContent.length === 1 &&
          isWhitespace(chunk.textContent[0])
        )
          continue;
        el.appendChild(chunk);
      }
      return this;
    }

    if (html.nodeType === 1) {
      el.innerHTML = '';
      el.appendChild(html);
      return this;
    }

    this.$el.html(html);
    return this;
  }
};
