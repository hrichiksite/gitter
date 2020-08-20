function generatePassword() {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < 24; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

[
  {
    clientKey: 'web-internal',
    name: 'Web Client',
    tag: 'web-app'
  },
  {
    clientKey: '1',
    name: 'Gitter OSX',
    tag: 'mac',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  {
    clientKey: '2',
    name: 'Gitter Beta OSX',
    tag: 'mac-beta',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  {
    clientKey: '3',
    name: 'Troupe Notifier Mac',
    tag: 'mac-notifier',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  {
    clientKey: '4',
    name: 'Troupe Notifier Mac Beta',
    tag: 'mac-notifier-beta',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  {
    clientKey: '5',
    name: 'Troupe for Windows Beta',
    tag: 'windows-notifier-beta',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  {
    clientKey: '6',
    name: 'Troupe for Windows',
    tag: 'windows-notifier',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  {
    clientKey: 'ios-beta-dev',
    name: 'Gitter iOS App',
    tag: 'ios-beta-dev',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  {
    clientKey: 'ios-beta',
    name: 'Gitter iOS App',
    tag: 'ios-beta',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  {
    clientKey: 'ios-prod-dev',
    name: 'Gitter iOS App',
    tag: 'ios-prod-dev',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  {
    clientKey: 'ios-prod',
    name: 'Gitter iOS App',
    tag: 'ios-prod',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  {
    clientKey: 'android-prod',
    name: 'Gitter Android App',
    tag: 'android-prod',
    registeredRedirectUri: 'https://gitter.im/login/oauth/callback',
    canSkipAuthorization: true
  },
  {
    clientKey: 'osx-desktop-prod',
    name: 'Gitter OSX Desktop App',
    tag: 'windows-desktop',
    registeredRedirectUri: 'app://gitter/oauth.html'
  },
  {
    clientKey: 'windows-desktop-prod',
    name: 'Gitter Windows Desktop App',
    tag: 'windows-desktop',
    registeredRedirectUri: 'app://gitter/oauth.html'
  },
  {
    clientKey: 'linux-desktop-prod',
    name: 'Gitter Linux Desktop App',
    tag: 'linux-desktop',
    registeredRedirectUri: 'app://gitter/oauth.html'
  },
  {
    clientKey: 'osx-desktop-prod-v4',
    name: 'Gitter macOS Desktop App',
    tag: 'windows-desktop',
    registeredRedirectUri: 'https://gitter.im/login/desktop/callback'
  },
  {
    clientKey: 'windows-desktop-prod-v4',
    name: 'Gitter Windows Desktop App',
    tag: 'windows-desktop',
    registeredRedirectUri: 'https://gitter.im/login/desktop/callback'
  },
  {
    clientKey: 'linux-desktop-prod-v4',
    name: 'Gitter Linux Desktop App',
    tag: 'linux-desktop',
    registeredRedirectUri: 'https://gitter.im/login/desktop/callback'
  },
  {
    clientKey: 'irc-dev',
    name: 'IRC Bridge',
    tag: 'irc-dev',
    registeredRedirectUri: 'http://localhost:3000/login/callback',
    canSkipAuthorization: true
  },
  {
    clientKey: 'irc-beta',
    name: 'IRC Bridge',
    tag: 'irc-beta',
    registeredRedirectUri: 'https://irc-beta.gitter.im/login/callback',
    canSkipAuthorization: true
  },
  {
    clientKey: 'irc-prod',
    name: 'IRC Bridge',
    tag: 'irc-prod',
    registeredRedirectUri: 'https://irc.gitter.im/login/callback',
    canSkipAuthorization: true
  },
  {
    clientKey: 'developer-dev',
    name: 'Gitter Developer Program',
    tag: 'developer-dev',
    registeredRedirectUri: 'http://localhost:4001/login/callback',
    canSkipAuthorization: true
  },
  {
    clientKey: 'developer-beta',
    name: 'Gitter Developer Program',
    tag: 'developer-beta',
    registeredRedirectUri: 'https://developer-beta.gitter.im/login/callback',
    canSkipAuthorization: true
  },
  {
    clientKey: 'developer-prod',
    name: 'Gitter Developer Program',
    tag: 'developer-prod',
    registeredRedirectUri: 'https://developer.gitter.im/login/callback',
    canSkipAuthorization: true
  },
  {
    clientKey: 'billing-dev',
    name: 'Gitter Billing (Dev)',
    tag: 'billing-dev',
    registeredRedirectUri: 'http://localhost:5500/login/callback',
    canSkipAuthorization: true
  },
  {
    clientKey: 'billing-beta',
    name: 'Gitter Billing (Beta)',
    tag: 'developer-beta',
    registeredRedirectUri: 'https://billing-beta.gitter.im/login/callback',
    canSkipAuthorization: true
  },
  {
    clientKey: 'billing-prod',
    name: 'Gitter Billing',
    tag: 'billing-prod',
    registeredRedirectUri: 'https://billing.gitter.im/login/callback',
    canSkipAuthorization: true
  }
].forEach(function(d) {
  printjson({ clientKey: d.clientKey });
  db.oauthclients.update(
    { clientKey: d.clientKey },
    {
      clientKey: d.clientKey,
      clientSecret: generatePassword(),
      name: d.name,
      tag: d.tag,
      registeredRedirectUri: d.registeredRedirectUri,
      canSkipAuthorization: d.canSkipAuthorization
    },
    true /* upsert */
  );
});
