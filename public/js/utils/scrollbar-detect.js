'use strict';

var hasScrollBars;

// Some innovative scrollbar measuring stuff
function detect() {
  var scrollDiv = document.createElement('div');
  scrollDiv.className = 'scrollbar-measure';
  document.body.appendChild(scrollDiv);

  // Get the scrollbar width
  var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;

  document.body.removeChild(scrollDiv);

  return scrollbarWidth > 0;
}

module.exports = function scrollbarDetect() {
  if (hasScrollBars !== undefined) return hasScrollBars;

  return (hasScrollBars = detect());
};
