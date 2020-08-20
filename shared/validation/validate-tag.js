'use strict';

var MAX_TAG_LENGTH = 20;
var MAX_STAFF_TAG_LENGTH = 50;

var getMaxTagLength = function(isStaff) {
  return isStaff ? MAX_STAFF_TAG_LENGTH : MAX_TAG_LENGTH;
};

var validateTag = function(tagName, isStaff) {
  var reservedTagTestRegex = /:/;
  var isValid = true;
  var messageList = [];

  if (!isStaff && reservedTagTestRegex.test(tagName)) {
    messageList.push('Tags can not use `:` colons.');
    isValid = false;
  }
  var tagLength = !!tagName && tagName.length;
  var maxTagLength = getMaxTagLength(isStaff);
  if (!tagLength || tagLength <= 0 || tagLength > maxTagLength) {
    messageList.push('Tags must be between 1 and ' + maxTagLength + ' characters in length.');
    isValid = false;
  }

  return {
    isValid: isValid,
    messages: messageList
  };
};

module.exports = {
  validateTag: validateTag,
  getMaxTagLength: getMaxTagLength
};
