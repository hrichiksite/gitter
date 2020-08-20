'use strict';

const assert = require('assert');
const urlJoin = require('url-join');

const gitterApiBaseUrl = Cypress.env('apiBaseUrl');
assert(gitterApiBaseUrl);

function generateFixtures(fixtureDescription) {
  cy.log('Generating fixtures:', JSON.stringify(fixtureDescription));
  return fetch(urlJoin(gitterApiBaseUrl, 'private/fixtures'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(fixtureDescription)
  })
    .then(body => body.json())
    .then(newFixtures => {
      cy.log('Fixtures generated:', JSON.stringify(newFixtures));
      return newFixtures;
    });
}

module.exports = generateFixtures;
