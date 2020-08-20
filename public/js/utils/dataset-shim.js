'use strict';

function toAttribute(name) {
  var attribute = name.replace(/[A-Z]/g, function(a) {
    return '-' + a.toLowerCase();
  });

  return 'data-' + attribute.toLowerCase();
}

if (document.documentElement.dataset) {
  // Handle modern browsers
  module.exports = {
    get: function(element, name) {
      return element && element.dataset && element.dataset[name];
    },
    set: function(element, name, value) {
      element.dataset[name] = value;
    }
  };
} else {
  // Handle old internet explorer versions
  module.exports = {
    get: function(element, name) {
      return element && element.getAttribute(toAttribute(name));
    },

    set: function(element, name, value) {
      return element.setAttribute(toAttribute(name), value);
    }
  };
}
