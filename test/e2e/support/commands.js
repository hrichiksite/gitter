'use strict';

const assert = require('assert');
const urlJoin = require('url-join');

const gitterBaseUrl = Cypress.env('baseUrl');
assert(
  gitterBaseUrl,
  'baseUrl is not defined (make sure to pass it in via --env or CYPRESS_baseUrl environment variable)'
);
const gitterApiBaseUrl = Cypress.env('apiBaseUrl');
assert(
  gitterApiBaseUrl,
  'gitterApiBaseUrl is not defined (make sure to pass it in via --env or CYPRESS_gitterApiBaseUrl environment variable)'
);

// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

Cypress.Commands.add('login', accessToken => {
  cy.log(`Logging in with token ${accessToken}`);
  cy.request({
    url: gitterBaseUrl,
    method: 'GET',
    body: {
      access_token: accessToken
    }
  }).then(res => {
    assert.equal(res.status, 200);
  });
});

Cypress.Commands.add('loginUser', user => {
  cy.log(`Logging in as user ${user.username} -> ${user.accessToken}`);

  // Clear out any previous user session
  cy.clearCookie('d_auth');
  cy.clearCookie('d_session');

  // Now we can sign in with the new user
  cy.login(user.accessToken);
});

Cypress.Commands.add('visitAndEnsureUser', (url, user) => {
  cy.visit(url);
  cy.window()
    .its('troupeContext.user.id')
    .should('equal', user._id);
});

Cypress.Commands.add('toggleFeature', (featureName, force) => {
  cy.log(`Toggling feature toggle ${featureName}: ${force}`);
  // Make sure the feature toggle already exists
  cy.request({
    url: urlJoin(gitterApiBaseUrl, 'private/fixtures'),
    method: 'POST',
    body: {
      featureToggle1: { name: featureName }
    }
  });

  // Then toggle the feature
  cy.request({
    url: urlJoin(gitterBaseUrl, '/api_web/features/', featureName, force ? '1' : '0'),
    method: 'GET'
  })
    .its('body')
    .then(body => {
      assert.equal(body.status, 200);
      assert.equal(body.action, force);
    });
});

Cypress.Commands.add('sendMessage', (user, room, messageText, attributes) => {
  cy.log(`Sending message in ${room._id}: "${messageText}"`);

  // Send the message
  cy.request({
    url: urlJoin(gitterBaseUrl, '/api/v1/rooms/', room._id, '/chatMessages'),
    method: 'POST',
    body: { ...attributes, text: messageText },
    headers: {
      Authorization: `Bearer ${user.accessToken}`,
      'Content-Type': 'application/json'
    }
  }).then(res => {
    assert.equal(res.status, 200);
  });
});
