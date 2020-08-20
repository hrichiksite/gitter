'use strict';
var $ = require('jquery');
var link = require('./tmpl/link.hbs');

module.exports = (function() {
  var decorator = {
    decorate: function(view) {
      view.$el.find('*[data-link-type="mention"]').each(function() {
        var $mention = $(this);
        var username = $mention.data('screenName');

        if (username) {
          $mention.html(
            link({
              href: 'https://github.com/' + username,
              content: '@' + username
            })
          );
        }
      });

      view.$el.find('*[data-link-type="commit"]').each(function() {
        var $commit = $(this);
        var repo = $commit.data('commitRepo');
        var sha = $commit.data('commitSha');

        if (repo && sha) {
          var shortSha = sha.substring(0, 7);
          $commit.html(
            link({
              href: 'https://github.com/' + repo + '/commit/' + sha,
              content: repo + '@' + shortSha
            })
          );
        }
      });
    }
  };

  return decorator;
})();
