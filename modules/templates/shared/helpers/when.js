'use strict';

function whenHelper(condition, truthValue, falseValue) {
  return condition ? truthValue : falseValue;
}

module.exports = whenHelper;
