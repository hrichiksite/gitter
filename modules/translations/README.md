# gitter-translations

Translations of Gitter to other languages. Please submit pull-requests if you would like to add or change anything!

[![Gitter](https://badges.gitter.im/gitter/gitter.svg)](https://gitter.im/gitter/gitter-translations?utm_source=badge&utm_medium=badge&utm_campaign=share-badge)

## How this works

At the moment we are busy externalising all of our strings, so the only two areas that currently work are:

1.  Timestamps in chat
2.  Homepage

## Homepage instructions

The homepage strings are kept in the homepage directory

## Additional areas of the application

We will continue to expand on the entire application over time. Please watch this repository for updates

## Testing

It possible to visit the site with the lang query parameter, ex. https://gitter.im/?redirect=no&lang=ko.

Or you can change the browser main language in Chrome in [Language Settings](chrome://settings/languages) by putting tested language [at the top of the list](https://stackoverflow.com/a/36074203/606571).

## Generating keys and placeholders

Generation and formatting happens automatically when linking this package to `webapp`

- `npm link` in this package
- `npm link '@gitterhq/translations'` in `webapp`

and then starting the `webapp` and going to:

<details>
<summary> Generated translation links </summary>

- http://localhost:5000/?&redirect=no&lang=ar
- http://localhost:5000/?redirect=no&lang=bg
- http://localhost:5000/?redirect=no&lang=cs
- http://localhost:5000/?redirect=no&lang=de
- http://localhost:5000/?redirect=no&lang=en
- http://localhost:5000/?redirect=no&lang=es
- http://localhost:5000/?redirect=no&lang=fr
- http://localhost:5000/?redirect=no&lang=id
- http://localhost:5000/?redirect=no&lang=it
- http://localhost:5000/?redirect=no&lang=ja
- http://localhost:5000/?redirect=no&lang=ka
- http://localhost:5000/?redirect=no&lang=ko
- http://localhost:5000/?redirect=no&lang=pl
- http://localhost:5000/?redirect=no&lang=pt
- http://localhost:5000/?redirect=no&lang=ru
- http://localhost:5000/?redirect=no&lang=sk
- http://localhost:5000/?redirect=no&lang=sv
- http://localhost:5000/?redirect=no&lang=tr
- http://localhost:5000/?redirect=no&lang=uk
- http://localhost:5000/?redirect=no&lang=zh-TW
- http://localhost:5000/?redirect=no&lang=zh

</details>

This adds all the missing keys to the homepage translation files.
