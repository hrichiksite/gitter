'use strict';

var IS_DEVELOPMENT = process.env.NODE_ENV === 'dev';

module.exports = {
  // expects an array of updates where each element is a valid req for elasticClient.update
  createBulkUpdate: function(updates) {
    return {
      body: updates.reduce(function(body, update) {
        body.push({
          update: {
            _index: update.index,
            _type: update.type,
            _id: update.id,
            _retry_on_conflict: update._retry_on_conflict
          }
        });
        body.push(update.body);
        return body;
      }, [])
    };
  },
  findErrors: function(req, res) {
    if (IS_DEVELOPMENT) {
      // ERRORS for bulk updater disabled in dev until
      // https://github.com/troupe/gitter-webapp/issues/2080
      return;
    }

    if (!res.errors) return;

    var errors = [];

    res.items.forEach(function(item, index) {
      if (item.update.error) {
        errors.push({
          path: req.body[index * 2],
          body: req.body[index * 2 + 1],
          resp: item
        });
      }
    });

    if (!errors.length) return;

    return new Error(
      'elastic bulk upload failed for some. failures: ' + JSON.stringify(errors, null, 2)
    );
  }
};
