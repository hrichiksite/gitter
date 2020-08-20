'use strict';

var speedy = require('speedy');
var persistence = require('gitter-web-persistence');

var userIds = [
  '54e4b1e56d46b9ea027e6e38',
  '54e4b1e56d46b9ea027e6e37',
  '54e4b1e56d46b9ea027e6e36',
  '54e4b1e56d46b9ea027e6e34',
  '54e4b1e56d46b9ea027e6e32',
  '54e4b1e56d46b9ea027e6e31',
  '54e4b1e46d46b9ea027e6e30',
  '54e4ad09fd96ff2ced1a8007',
  '54e4ad09fd96ff2ced1a8006',
  '54e4ad09fd96ff2ced1a8005',
  '54d2866d6761395896bb72a4',
  '54dde138aab12539d9a8617a',
  '54dde138aab12539d9a8617b',
  '54dde138aab12539d9a8617c',
  '54dde138aab12539d9a8617d',
  '54dde138aab12539d9a8617e',
  '54d2435d1669fd4815140719',
  '54d245111669fd481514071a',
  '54d245121669fd481514071b',
  '54d245121669fd481514071c',
  '54d245131669fd481514071d',
  '54d245131669fd481514071e',
  '54d245131669fd481514071f',
  '54d26067957e5e3250987a6e',
  '54d26068957e5e3250987a6f',
  '54d26069957e5e3250987a70'
];

speedy.samples(10);

speedy.run({
  withoutLimit: function(done) {
    persistence.ChatMessage.find({ _id: { $in: userIds } }).exec(done);
  },
  withLimit: function(done) {
    persistence.ChatMessage.find({ _id: { $in: userIds } })
      .limit(userIds.length)
      .exec(done);
  }
});
