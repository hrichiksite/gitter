'use strict';

const assert = require('assert');
const urlJoin = require('url-join');

const generateFixtures = require('./support/generate-fixtures');

const gitterBaseUrl = Cypress.env('baseUrl');

assert(
  gitterBaseUrl,
  'baseUrl is not defined (make sure to pass it in via --env or CYPRESS_baseUrl environment variable)'
);

describe('e2e tests', function() {
  beforeEach(() => {
    // Remove this when https://github.com/cypress-io/cypress/issues/781 is solved
    // Workaround from https://github.com/cypress-io/cypress/issues/781#issuecomment-389508520
    cy.visit(gitterBaseUrl);
    cy.clearCookies();
    //cy.getCookies().should('be.empty');
    cy.reload();
  });

  beforeEach(() => {
    // Remember the feature toggle cookie
    Cypress.Cookies.preserveOnce('fflip');
  });

  it('loads homepage', function() {
    cy.visit(gitterBaseUrl);

    cy.contains('Where communities thrive');
  });

  describe('signed in', () => {
    let fixtures;
    beforeEach(done => {
      generateFixtures({
        user1: {
          accessToken: 'web-internal'
        },
        user2: {
          accessToken: 'web-internal'
        },
        group1: {
          securityDescriptor: {
            extraAdmins: ['user1']
          }
        },
        troupe1: {
          users: ['user1', 'user2'],
          securityDescriptor: { extraAdmins: ['user1'] }
        },
        troupeInGroup1: { group: 'group1', users: ['user1', 'user2'] },

        message1: {
          user: 'user1',
          troupe: 'troupe1',
          text: 'hello from the parent'
        },
        message2: {
          user: 'user1',
          troupe: 'troupe1',
          text: 'hello from the child',
          parent: 'message1'
        },

        userToBeTokenDeleted1: {
          accessToken: 'web-internal'
        },
        oAuthClientToBeDeleted1: { ownerUser: 'userToBeTokenDeleted1' },
        oAuthAccessTokenToBeDeleted1: {
          user: 'userToBeTokenDeleted1',
          client: 'oAuthClientToBeDeleted1'
        }
      }).then(newFixtures => {
        fixtures = newFixtures;
        done();
      });
    });

    beforeEach(() => {
      cy.loginUser(fixtures.user1);
    });

    it('shows chat page', function() {
      cy.visitAndEnsureUser(urlJoin(gitterBaseUrl, fixtures.troupe1.lcUri), fixtures.user1);

      // Ensure the left-menu is loaded
      cy.get('.js-left-menu-root').contains(/All conversations/i);
      cy.get('.js-left-menu-root').contains(fixtures.troupe1.uri);

      // Ensure the room is loaded
      cy.get('.js-chat-name').contains(fixtures.troupe1.uri);
    });

    it('can send message', function() {
      cy.visitAndEnsureUser(urlJoin(gitterBaseUrl, fixtures.troupe1.lcUri), fixtures.user1);

      const MESSAGE_CONTENT = 'my new message';

      // Send a message
      cy.get('#chat-input-textarea').type(`${MESSAGE_CONTENT}{enter}`);
      cy.get('#chat-container').contains(MESSAGE_CONTENT);

      // Ensure the message is persisted after reload
      cy.reload();
      cy.get('#chat-container').contains(MESSAGE_CONTENT);
    });

    describe('receiving messages', () => {
      it('can receive a message', function() {
        cy.visitAndEnsureUser(urlJoin(gitterBaseUrl, fixtures.troupe1.lcUri), fixtures.user1);

        const MESSAGE_CONTENT = 'my new message';

        // Make sure our new message does not exist yet
        cy.get('#chat-container')
          .contains(MESSAGE_CONTENT)
          .should('not.exist');

        cy.sendMessage(fixtures.user1, fixtures.troupe1, MESSAGE_CONTENT);

        // See the message show up
        cy.get('#chat-container').contains(MESSAGE_CONTENT);
      });

      it('stops receiving messages after token is destroyed', function() {
        cy.login(fixtures.oAuthAccessTokenToBeDeleted1.token);

        cy.visitAndEnsureUser(
          urlJoin(gitterBaseUrl, fixtures.troupe1.lcUri),
          fixtures.userToBeTokenDeleted1
        );

        const MESSAGE_CONTENT = 'my new message';

        // Make sure our new message does not exist yet
        cy.get('#chat-container')
          .contains(MESSAGE_CONTENT)
          .should('not.exist');

        cy.sendMessage(fixtures.user1, fixtures.troupe1, MESSAGE_CONTENT);

        // See the message show up
        cy.get('#chat-container').contains(MESSAGE_CONTENT);

        // Delete the token by deleting the OAuth client
        cy.request({
          url: urlJoin(
            gitterBaseUrl,
            '/api/v1/oauth-clients/',
            fixtures.oAuthClientToBeDeleted1._id
          ),
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${fixtures.userToBeTokenDeleted1.accessToken}`,
            'Content-Type': 'application/json'
          }
        }).then(res => {
          assert.equal(res.status, 200);
        });

        // Send another message that should never show up for our `userToBeTokenDeleted1`
        const MESSAGE_THAT_SHOULD_NEVER_SHOW_CONTENT =
          'my new message after token was destroyed and realtime socket should be closed';

        // Make sure our new message does not exist yet
        cy.get('#chat-container')
          .contains(MESSAGE_THAT_SHOULD_NEVER_SHOW_CONTENT)
          .should('not.exist');

        cy.sendMessage(fixtures.user1, fixtures.troupe1, MESSAGE_THAT_SHOULD_NEVER_SHOW_CONTENT);

        // See the message show up
        cy.get('#chat-container')
          .contains(MESSAGE_THAT_SHOULD_NEVER_SHOW_CONTENT)
          .should('not.exist');
      });
    });

    it('can create a room', function() {
      cy.visitAndEnsureUser(urlJoin(gitterBaseUrl, fixtures.troupeInGroup1.lcUri), fixtures.user1);

      const NEW_ROOM_NAME = 'my-new-room';

      // Open the create room flow
      cy.get('.js-menu-bar-create-button').click();
      cy.get('.js-chat-action-create-room').click();

      // The community is automatically selected because of the current room we are visiting

      // Enter the room name
      cy.get('#create-room-name-input').type(NEW_ROOM_NAME);

      // Click the create submit button
      cy.get('.js-create-room-view-root .modal--default__footer button')
        .contains('Create')
        .click();

      // Modal should go away
      cy.get('.modal').should('not.exist');

      // Ensure the new room is loaded
      cy.get('.welcome-modal__header').contains('Get Started: Spread the word');
      cy.get('.js-chat-name').contains(NEW_ROOM_NAME);
    });

    it('can delete account', function() {
      cy.visitAndEnsureUser(urlJoin(gitterBaseUrl, fixtures.troupe1.lcUri), fixtures.user1);

      cy.get('#profile-menu').click();

      cy.get('#profile-menu-items')
        .contains('Delete Account')
        .click();

      cy.get('.modal')
        .contains(`Delete ${fixtures.user1.username}`, {
          // wait for the 10 second cooldown before the button is enabled
          timeout: 12000
        })
        .should('not.be.disabled')
        .click();

      // Make sure we got logged out and back on the homepage
      cy.url().should('eq', urlJoin(gitterBaseUrl, '/'));
    });

    // This test is very flaky thanks to https://gitlab.com/gitlab-org/gitter/webapp/issues/2276
    // So it is disabled for now.
    // FIXME: enable the test when https://gitlab.com/gitlab-org/gitter/webapp/issues/2276 is fixed
    xit('permalinks in main message feed and thread message feed', () => {
      cy.visitAndEnsureUser(
        urlJoin(gitterBaseUrl, fixtures.troupe1.lcUri, `?at=${fixtures.message2._id}`),
        fixtures.user1
      );

      cy.get('#chat-container .chat-item__highlighted').contains('hello from the parent');
      cy.get('#js-thread-message-feed-root .chat-item__highlighted').contains(
        'hello from the child'
      );
    });

    it('clicking unread thread message notification opens thread message feed', () => {
      cy.visitAndEnsureUser(urlJoin(gitterBaseUrl, fixtures.troupe1.lcUri), fixtures.user1);

      cy.sendMessage(fixtures.user2, fixtures.troupe1, 'child message for notification', {
        parentId: fixtures.message1._id
      });

      // Ensure the layout is done shifting
      cy.get('#chat-input-textarea').should('have.class', 'js-reset-textarea-size');

      cy.get('#bottom-unread-banner .banner-wrapper button.main')
        .should('be.visible')
        .click();

      cy.get('.js-thread-message-feed-root')
        .should('be.visible')
        .contains('child message for notification');
    });
  });
});
