'use strict';

var cdn = require('gitter-web-cdn');

const katexFolder = 'repo/katex/fonts-0.10.0';
const getKatexSuffix = (weight, style) => {
  const suffixMap = {
    'normal,normal': 'Regular',
    'normal,italic': 'Italic',
    'bold,normal': 'Bold',
    'bold,italic': 'BoldItalic'
  };
  return suffixMap[`${weight},${style}`];
};
const generateKatexFont = (family, weight, style) => ({
  fontPath: cdn(`${katexFolder}/KaTeX_${family}-${getKatexSuffix(weight, style)}`),
  // All modern browsers except IE support woff2 https://caniuse.com/#feat=woff2
  // IE is going to fall back on Times New Roman, 0.82% of users are using IE as of 07/2019
  formats: ['woff', 'woff2'],
  weight: 'normal',
  family: `KaTeX_${family}`,
  style: 'italic'
});

var FONTS = [
  {
    fontPath: cdn('fonts/sourcesans/SourceSansPro-Regular.otf'),
    formats: ['woff'],
    weight: 'normal',
    family: 'source-sans-pro',
    style: 'normal'
  },
  {
    fontPath: cdn('fonts/sourcesans/SourceSansPro-It.otf'),
    formats: ['woff'],
    weight: 'normal',
    family: 'source-sans-pro',
    style: 'italic'
  },
  {
    fontPath: cdn('fonts/sourcesans/SourceSansPro-Bold.otf'),
    formats: ['woff'],
    weight: 'bold',
    family: 'source-sans-pro',
    style: 'normal'
  },
  {
    fontPath: cdn('fonts/sourcesans/SourceSansPro-Semibold.otf'),
    formats: ['woff'],
    weight: 600,
    family: 'source-sans-pro',
    style: 'normal'
  },
  {
    fontPath: cdn('fonts/sourcesans/SourceSansPro-BoldIt.otf'),
    formats: ['woff'],
    weight: 'bold',
    family: 'source-sans-pro',
    style: 'italic'
  },
  {
    fontPath: cdn('fonts/sourcesans/SourceSansPro-Light.otf'),
    formats: ['woff'],
    weight: 300,
    family: 'source-sans-pro',
    style: 'normal'
  },
  {
    fontPath: cdn('fonts/sourcesans/SourceSansPro-ExtraLight.otf'),
    formats: ['woff'],
    weight: 200,
    family: 'source-sans-pro',
    style: 'normal'
  }
];
const KATEX = [
  generateKatexFont('AMS', 'normal', 'normal'),
  generateKatexFont('Caligraphic', 'bold', 'normal'),
  generateKatexFont('Caligraphic', 'normal', 'normal'),
  generateKatexFont('Fraktur', 'bold', 'normal'),
  generateKatexFont('Fraktur', 'normal', 'normal'),
  generateKatexFont('Main', 'bold', 'normal'),
  generateKatexFont('Main', 'bold', 'italic'),
  generateKatexFont('Main', 'normal', 'italic'),
  generateKatexFont('Main', 'normal', 'normal'),
  //generateKatexFont('Math', 'bold', 'normal'),
  generateKatexFont('Math', 'bold', 'italic'),
  generateKatexFont('Math', 'normal', 'italic'),
  //generateKatexFont('Math', 'normal', 'normal'),
  generateKatexFont('SansSerif', 'bold', 'normal'),
  generateKatexFont('SansSerif', 'normal', 'italic'),
  generateKatexFont('SansSerif', 'normal', 'normal'),
  generateKatexFont('Script', 'normal', 'normal'),
  generateKatexFont('Size1', 'normal', 'normal'),
  generateKatexFont('Size2', 'normal', 'normal'),
  generateKatexFont('Size3', 'normal', 'normal'),
  generateKatexFont('Size4', 'normal', 'normal'),
  generateKatexFont('Typewriter', 'normal', 'normal')
];
var LOCAL_FONTS = [
  { name: 'SourceSansPro-Bold', weight: 'bold', style: 'normal' },
  { name: 'SourceSansPro-BoldIt', weight: 'bold', style: 'italic' },
  { name: 'SourceSansPro-ExtraLight', weight: 200, style: 'normal' },
  { name: 'SourceSansPro-It', weight: 'normal', style: 'italic' },
  { name: 'SourceSansPro-Light', weight: 300, style: 'normal' },
  { name: 'SourceSansPro-Regular', weight: 'normal', style: 'normal' },
  { name: 'SourceSansPro-Semibold', weight: 600, style: 'normal' }
];

function getFonts() {
  return { local: LOCAL_FONTS, cdnFonts: [...FONTS, ...KATEX] };
}

function hasCachedFonts(cookies) {
  return (cookies.webfontsLoaded || '') === 'true';
}

module.exports = {
  getFonts: getFonts,
  hasCachedFonts: hasCachedFonts
};
