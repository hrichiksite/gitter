'use strict';

var isMobile = require('../../../utils/is-mobile');
var apiClient = require('../../../components/api-client');
var template = require('./tmpl/typeahead.hbs');

module.exports = function() {
  return {
    match: /(^|\s)(([\w-_]+\/[\w-_]+)?#(\d*))$/,
    maxCount: isMobile() ? 3 : 10,
    search: function(term, callback) {
      var terms = term.split('#');
      var repoName = terms[0];
      var issueNumber = terms[1];
      var query = {};

      if (repoName) query.repoName = repoName;
      if (issueNumber) query.issueNumber = issueNumber;

      apiClient.room
        .get('/issues', query)
        .catch(function() {
          return [];
        })
        .then(function(data) {
          callback(data);
        });
    },
    template: function(issue) {
      return template({
        name: issue.number,
        description: issue.title
      });
    },
    replace: function(issue) {
      if (typeof issue.number === 'string' && issue.number.indexOf('#') >= 0) {
        return '$1$3' + issue.number + ' ';
      } else {
        return '$1$3#' + issue.number + ' ';
      }
    }
  };
};
