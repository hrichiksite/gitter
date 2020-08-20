'use strict';

// Can't use `classList.toggle` with the second parameter (force)
// Because IE11 does not support it
var toggleClass = function(element, class1, force) {
  var result = force;

  // note: svg on IE does not have classList so fallback to class
  if (element.classList) {
    if (arguments.length === 3) {
      if (force) {
        element.classList.add(class1);
      } else {
        element.classList.remove(class1);
      }
    } else {
      result = element.classList.toggle(class1);
    }
  } else if (element.getAttribute) {
    var classContent = element.getAttribute('class');
    var classContentWithoutTargetClass = classContent.replace(
      new RegExp('(^|\\s)' + class1 + '($|\\s)'),
      ''
    );
    if (force || classContent === classContentWithoutTargetClass) {
      element.setAttribute('class', classContentWithoutTargetClass + ' ' + class1);
    } else {
      element.setAttribute('class', classContentWithoutTargetClass);
    }
  }

  return result;
};

module.exports = toggleClass;
