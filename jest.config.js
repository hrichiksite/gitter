'use strict';

module.exports = {
  testMatch: ['<rootDir>/public/js/**/*-test.js'],
  moduleFileExtensions: ['js', 'json', 'vue'],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|svg)$': '<rootDir>/public/js/vue/__mocks__/file_mock.js'
  },
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.vue$': 'vue-jest',
    '^.+\\.hbs$': 'jest-handlebars'
  },
  browser: true
};
