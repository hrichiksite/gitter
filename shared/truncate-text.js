'use strict';

// Truncates inputText to the desired length and adds ellipsis if the text is overflowing
// Ellipsis are inclusive to the desired length
function truncateText(inputText = '', length) {
  if (inputText.length > length) {
    return inputText.substring(0, length - 3) + '...';
  }

  return inputText;
}

module.exports = truncateText;
