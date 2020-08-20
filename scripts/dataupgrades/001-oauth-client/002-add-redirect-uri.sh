#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

MONGO_URL=${1:-}

function hash {
  if (which sha256sum >/dev/null); then
    sha256sum
  else
    md5
  fi
}

function generate_password {
  if (which openssl >/dev/null); then
    openssl rand -hex 32
  else
    (hostname; date +%s; ls -la /) | rev | hash | base64 | head -c 32
  fi
}

mongo $MONGO_URL <<DELIM
db.oauthclients.update(
  { clientKey: 'web-internal' },
  { clientKey: 'web-internal',
    clientSecret: '$(generate_password)',
    name: 'Web Client',
    tag: 'web-app',
  }, true /* upsert */);

db.oauthclients.update(
  { clientKey: '1' },
  {
    clientKey: '1',
    clientSecret: '$(generate_password)',
    name: 'Gitter OSX',
    tag: 'mac',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  true /* upsert */);

db.oauthclients.update(
  { clientKey: '2' },
  {
    clientKey: '2',
    clientSecret: '$(generate_password)',
    name: 'Gitter Beta OSX',
    tag: 'mac-beta',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  true /* upsert */);

db.oauthclients.update(
  { clientKey: '3' },
  {
    clientKey: '3',
    clientSecret: '$(generate_password)',
    name: 'Troupe Notifier Mac',
    tag: 'mac-notifier',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  true /* upsert */);

db.oauthclients.update(
  { clientKey: '4' },
  {
    clientKey: '4',
    clientSecret: '$(generate_password)',
    name: 'Troupe Notifier Mac Beta',
    tag: 'mac-notifier-beta',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  true /* upsert */);

db.oauthclients.update(
  { clientKey: '5' },
  {
    clientKey: '5',
    clientSecret: '$(generate_password)',
    name: 'Troupe for Windows Beta',
    tag: 'windows-notifier-beta',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  true /* upsert */);


db.oauthclients.update(
  { clientKey: '6' },
  {
    clientKey: '6',
    clientSecret: '$(generate_password)',
    name: 'Troupe for Windows',
    tag: 'windows-notifier',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  true /* upsert */);

/* iOS */

db.oauthclients.update(
  { clientKey: 'ios-beta-dev' },
  {
    clientKey: 'ios-beta-dev',
    clientSecret: '$(generate_password)',
    name: 'Gitter iOS App',
    tag: 'ios-beta-dev',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  true /* upsert */);

db.oauthclients.update(
  { clientKey: 'ios-beta' },
  {
    clientKey: 'ios-beta',
    clientSecret: '$(generate_password)',
    name: 'Gitter iOS App',
    tag: 'ios-beta',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  true /* upsert */);

db.oauthclients.update(
  { clientKey: 'ios-prod-dev' },
  {
    clientKey: 'ios-prod-dev',
    clientSecret: '$(generate_password)',
    name: 'Gitter iOS App',
    tag: 'ios-prod-dev',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  true /* upsert */);

db.oauthclients.update(
  { clientKey: 'ios-prod' },
  {
    clientKey: 'ios-prod',
    clientSecret: '$(generate_password)',
    name: 'Gitter iOS App',
    tag: 'ios-prod',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  true /* upsert */);

/* Android */

db.oauthclients.update(
  { clientKey: 'android-prod' },
  {
    clientKey: 'android-prod',
    clientSecret: '$(generate_password)',
    name: 'Gitter Android App',
    tag: 'android-prod',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  true /* upsert */);

/* Windows */

db.oauthclients.update(
  { clientKey: 'windows-desktop-prod' },
  {
    clientKey: 'windows-desktop-prod',
    clientSecret: '$(generate_password)',
    name: 'Gitter Windows Desktop App',
    tag: 'windows-desktop',
    registeredRedirectUri: 'app://gitter/oauth.html'
  },
  true /* upsert */);

/* Linux 32 & 64 */
db.oauthclients.update(
  { clientKey: 'linux-desktop-prod' },
  {
    clientKey: 'linux-desktop-prod',
    clientSecret: '$(generate_password)',
    name: 'Gitter Linux Desktop App',
    tag: 'linux-desktop',
    registeredRedirectUri: 'app://gitter/oauth.html'
  },
  true /* upsert */);

/* irc.gitter.im */

db.oauthclients.update(
  { clientKey: 'irc-dev' },
  {
    clientKey: 'irc-dev',
    clientSecret: '$(generate_password)',
    name: 'IRC Bridge',
    tag: 'irc-dev',
    registeredRedirectUri: 'http://localhost:3000/login/callback',
    canSkipAuthorization: true
  },
  true /* upsert */);

db.oauthclients.update(
  { clientKey: 'irc-beta' },
  {
    clientKey: 'irc-beta',
    clientSecret: '$(generate_password)',
    name: 'IRC Bridge',
    tag: 'irc-beta',
    registeredRedirectUri: 'https://irc-beta.gitter.im/login/callback',
    canSkipAuthorization: true
  },
  true /* upsert */);

db.oauthclients.update(
  { clientKey: 'irc-prod' },
  {
    clientKey: 'irc-prod',
    clientSecret: '$(generate_password)',
    name: 'IRC Bridge',
    tag: 'irc-prod',
    registeredRedirectUri: 'https://irc.gitter.im/login/callback',
    canSkipAuthorization: true
  },
  true /* upsert */);

/* developer.gitter.im  */

db.oauthclients.update(
  { clientKey: 'developer-dev' },
  {
    clientKey: 'developer-dev',
    clientSecret: '$(generate_password)',
    name: 'Gitter Developer Program',
    tag: 'developer-dev',
    registeredRedirectUri: 'http://localhost:4001/login/callback',
    canSkipAuthorization: true
  },
  true /* upsert */);

db.oauthclients.update(
  { clientKey: 'developer-beta' },
  {
    clientKey: 'developer-beta',
    clientSecret: '$(generate_password)',
    name: 'Gitter Developer Program',
    tag: 'developer-beta',
    registeredRedirectUri: 'https://developer-beta.gitter.im/login/callback',
    canSkipAuthorization: true
  },
  true /* upsert */);

db.oauthclients.update(
  { clientKey: 'developer-prod' },
  {
    clientKey: 'developer-prod',
    clientSecret: '$(generate_password)',
    name: 'Gitter Developer Program',
    tag: 'developer-prod',
    registeredRedirectUri: 'https://developer.gitter.im/login/callback',
    canSkipAuthorization: true
  },
  true /* upsert */);

db.oauthclients.update(
  { clientKey: 'billing-dev' },
  {
    clientKey: 'billing-dev',
    clientSecret: '$(generate_password)',
    name: 'Gitter Billing (Dev)',
    tag: 'billing-dev',
    registeredRedirectUri: 'http://localhost:5500/login/callback',
    canSkipAuthorization: true
  },
  true /* upsert */);

db.oauthclients.update(
  { clientKey: 'billing-beta' },
  {
    clientKey: 'billing-beta',
    clientSecret: '$(generate_password)',
    name: 'Gitter Billing (Beta)',
    tag: 'developer-beta',
    registeredRedirectUri: 'https://billing-beta.gitter.im/login/callback',
    canSkipAuthorization: true
  },
  true /* upsert */);

db.oauthclients.update(
  { clientKey: 'billing-prod' },
  {
    clientKey: 'billing-prod',
    clientSecret: '$(generate_password)',
    name: 'Gitter Billing',
    tag: 'billing-prod',
    registeredRedirectUri: 'https://billing.gitter.im/login/callback',
    canSkipAuthorization: true
  },
  true /* upsert */);

DELIM
exit $?
