'use strict';

var Builder = require('node-spritesheet').Builder;
var services = require('@gitterhq/services');
var fse = require('fs-extra');

var legacyImages = [];
var retinaImages = [];
Object.keys(services).forEach(function(serviceKey) {
  var service = services[serviceKey];
  Object.keys(service.icons).map(function(iconKey) {
    var icon = service.icons[iconKey];

    fse.copySync(
      icon.legacy,
      __dirname + '/../output/temp-sprites/' + serviceKey + '-' + iconKey + '.png'
    );
    legacyImages.push(__dirname + '/../output/temp-sprites/' + serviceKey + '-' + iconKey + '.png');
    fse.copySync(
      icon.retina,
      __dirname + '/../output/temp-sprites/' + serviceKey + '-' + iconKey + '@2x.png'
    );
    retinaImages.push(
      __dirname + '/../output/temp-sprites/' + serviceKey + '-' + iconKey + '@2x.png'
    );
  });
});

var builder = new Builder({
  outputDirectory: __dirname + '/../public/sprites',
  outputCss: 'services.css',
  selector: '.service-sprite',
  filter: function(stupid_library_doesnt_work_unless_I_add_a_filter) {
    return stupid_library_doesnt_work_unless_I_add_a_filter;
  }
});

builder.addConfiguration('default', {
  images: legacyImages,
  pixelRatio: 1,
  outputImage: 'services.png'
});

builder.addConfiguration('retina', {
  images: retinaImages,
  pixelRatio: 2,
  outputImage: 'services@2x.png'
});

builder.build(function() {});
