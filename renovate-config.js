'use strict';

const renovateConfig = require('./renovate.json');

module.exports = {
  ...renovateConfig,
  token: process.env.RENOVATE_GITLAB_TOKEN
};
