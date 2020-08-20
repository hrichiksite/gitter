'use strict';

const logger = require('gitter-web-env').logger;

/**
 * createOptionsValidator creates a function that will accept options and
 * log out all unexpected key-value pairs in those options
 *
 * @param {String} validatorName unique name for identifying log messages
 * @param {Map<String,Boolean>} expectedOptionNames allowed options as keys with true as value,
 * all other options are going to be warnings in logs
 *
 * @example
 * createOptionsValidator(
 *   'restful.serializeChatsForTroupe',
 *   { limit: true }
 * )(options)
 */
const createOptionsValidator = (validatorName, expectedOptionNames) => options => {
  const allOptionNames = Object.keys(options);
  const unexpectedOptionNames = allOptionNames.filter(
    optionName => !expectedOptionNames[optionName]
  );

  if (unexpectedOptionNames.length === 0) {
    return;
  }

  const unexpectedOptions = unexpectedOptionNames.reduce(
    (partialOptions, optionName) => ({
      ...partialOptions,
      [optionName]: options[optionName]
    }),
    {}
  );
  logger.warn(`unexpected options - ${validatorName} - ${JSON.stringify(unexpectedOptions)}`);
};

module.exports = { createOptionsValidator };
