'use strict';

const $ = require('jquery');
const _ = require('lodash');
const Backbone = require('backbone');
const Marionette = require('backbone.marionette');
require('./views/behaviors/isomorphic');
const debug = require('debug-proxy')('app:chat-messsage-reports');

const context = require('gitter-web-client-context');

function getAccountAgeString(user) {
  if (user) {
    const createdDate = new Date(user.accountCreatedDate);

    return `
      ${Math.floor(
        (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      )} days, ${createdDate.getFullYear()}-${createdDate.getMonth()}-${createdDate.getDay()}
    `;
  }

  return '';
}

const ReportView = Marionette.ItemView.extend({
  tagName: 'tr',

  template: data => {
    return `
      <td class="admin-chat-report-table-cell admin-chat-report-table-reporter-cell model-id-${data.reporterUser &&
        data.reporterUser.id}">
        <div class="admin-chat-report-table-reporter-cell-username">
          ${data.reporterUser ? data.reporterUser.username : 'Unknown'}
        </div>
        <div class="admin-chat-report-table-reporter-cell-id">
          ${data.reporterUserId}
        </div>
        <div title="Account age">
          ${getAccountAgeString(data.reporterUser)}
        </div>
      </td>
      <td class="admin-chat-report-table-cell admin-chat-report-table-message-author-cell model-id-${data.messageUser &&
        data.messageUser.id}">
        <div class="admin-chat-report-table-message-author-cell-username">
          ${data.messageUser ? data.messageUser.username : 'Unknown'}
        </div>
        <div class="admin-chat-report-table-message-author-cell-id">
          ${data.messageUserId}
        </div>
        <div title="Account age">
          ${getAccountAgeString(data.messageUser)}
        </div>
      </td>

      <td class="admin-chat-report-table-cell admin-chat-report-item-message-text">
        <div>
          Weight: <strong>${data.weight}</strong>&nbsp;&nbsp;&nbsp;--&nbsp;${data.sent}
        </div>
        <div class="admin-chat-report-table-message-cell-id">
          ${data.messageId}
        </div>
        <div>
          ${_.escape(data.messageText)}
        </div>
      </td>
    `;
  }
});

const ReportCollectionView = Marionette.CompositeView.extend({
  childView: ReportView,
  childViewContainer: '.js-report-list',

  childViewOptions: function(item) {
    return item;
  },

  template: function() {
    return `
      <table>
        <thead>
          <tr>
            <td class="admin-chat-report-table-header-cell admin-chat-report-table-reporter-cell">
              Reporter
            </td>
            <td class="admin-chat-report-table-header-cell admin-chat-report-table-message-author-cell">
              Message Author
            </td>
            <td class="admin-chat-report-table-header-cell">
              Message text
            </td>
          </tr>
        </thead>
        <tbody class="js-report-list"></tbody>
      </table>
    `;
  }
});

const DashboardView = Marionette.LayoutView.extend({
  behaviors: {
    Isomorphic: {
      reportTable: { el: '.js-report-table', init: 'initReportCollectionView' }
    }
  },

  initReportCollectionView: function(optionsForRegion) {
    return new ReportCollectionView(
      optionsForRegion({
        collection: new Backbone.Collection(this.model.get('reports'))
      })
    );
  },

  template: function(data) {
    const reports = data.reports;
    const lastReport = reports && reports[reports.length - 1];

    let paginationLink = '';
    if (lastReport) {
      paginationLink = `
        <hr />
        <a href="?beforeId=${lastReport.id}">
          Next page
        </a>
      `;
    }

    return `
      <div class="dashboard">
        <div class="js-report-table"></div>

        ${paginationLink}
        <br />
        <br />
        <br />
        <br />
      </div>
    `;
  }
});

const snapshot = context.getSnapshot('adminChatMessageReportDashboard');

debug('snapshot', snapshot);

new DashboardView({
  el: $('.js-chat-message-report-dashboard-root'),
  model: new Backbone.Model(snapshot)
}).render();
