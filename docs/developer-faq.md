# FAQ

Frequently asked questions by developers.

## Toggle between `beta`/`beta-staging`

`beta-staging` lives on the same domain as `beta`, https://beta.gitter.im/

Here is a bookmarklet for the `beta-staging` toggle (`beta` toggle). It just sets a staging cookie.

```
javascript:void((function(d){document.cookie='gitter_staging_beta=' + (document.cookie.indexOf('gitter_staging_beta=staged') >= 0 ? 'none' : 'staged') + ';domain=.gitter.im;path=/;expires=' + new Date(Date.now() + 31536000000).toUTCString(); location.reload();})(document));
```


## How do I access Gitter over my local network?

#### Update the config

Create `config/config.users-overrides.json` and copy/paste `config/config.dev.json` into your new config.

Adjust all of the `localhost` entries to your local IP in the following sections,

 - `web`
 - `cdn`
 - `webhooks`
 - `ws`
 - `embed`

---

Alternatively to copying the whole `config/config.dev.json` over you can just use the relevant parts,

```json
{
  "web": {
    "homeurl": "/",
    "domain": "192.168.1.135",
    "baseserver": "192.168.1.135",
    "baseport": "5000",
    "basepath": "http://192.168.1.135:5000",
    "apiBasePath": "http://192.168.1.135:5000/api",
    "badgeBaseUrl" : "http://192.168.1.135:4000"
  },
  "cdn": {
    "use": false,
    "hosts": [
      "192.168.1.135:5001"
    ]
  },
  "webhooks": {
    "basepath": "http://192.168.1.135:3001"
  },
  "ws": {
    "fayeUrl": "http://192.168.1.135:5000/bayeux"
  },
  "embed": {
    "basepath": "http://192.168.1.135:8061"
  }
}
```

#### Update the OAuth callbacks

The OAuth callbacks you created initially have a `localhost:5000` redirect URI
which will just 404 on a separate device when you try to sign in.

Recreate your secrets using your local network IP, see https://gitlab.com/gitlab-org/gitter/webapp#configure-service-secrets

Restart the server. You should now be able to access Gitter over your local IP from other devices


## Debug logging

There are various `debug(...)` statements throughout the code that trace various functions.
If you want to see these log lines, follow the steps below:

### Backend

For the backend, set the `DEBUG` environment variable,

To show logs for everything you can use `*` [wildcards](https://www.npmjs.com/package/debug#wildcards) in the filter,
```
DEBUG="*" npm start
```

Other examples,
```
DEBUG="gitter:app:permissions:pre-creation:gh-repo-policy-evaluator" npm start
DEBUG="gitter:app:permissions:pre-creation:*" npm start
DEBUG="gitter:app:permissions:pre-creation*" npm start

DEBUG="gitter:app:push-notification-gateway*, gitter:app:group-creation-service*" npm start
```

To disable, you can set the filter to an empty string,
```
DEBUG="" npm start
```

### Windows

On Windows, the syntax to set an environment variable is a little different,

```
set DEBUG="gitter:app:push-notification-gateway*"&&npm start
```

---

There is also `require('gitter-web-env').logger` which gets logged to file and Kibana(Elasticsearch) in production. These messages are shown in the console/terminal though so you can see them in development.

 - `logger.error(...)`
 - `logger.warn(...)`
 - `logger.info(...)`

```
logging:level=info npm start
```

### Frontend

For the frontend, use `window.localStorage.debug` in the devtools console

To show logs for everything you can use `*` [wildcards](https://www.npmjs.com/package/debug#wildcards) in the filter,
```js
window.localStorage.debug = '*';
```

Other examples,
```js
window.localStorage.debug = 'app:eyeballs:detector';
window.localStorage.debug = 'app:eyeballs:*';
window.localStorage.debug = 'app:eyeballs*';

window.localStorage.debug = 'app:eyeballs:*,app:router-chat*';
```

To disable, you can set the filter to an empty string,
```js
window.localStorage.debug = '';
```


## View `webpack` bundle visualization (webpack report)

Run the webapp with the `WEBPACK_REPORT` environment variable set to generate the HTML report

macOS/Linux:
```
WEBPACK_REPORT=1 npm start
```

Windows:
```
set WEBPACK_REPORT=1&&npm start
```

Open `webpack-report/index.html` in your browser



## Upgrading `@gitterhq/services` to add support for more services (integrations, activity feed)

Recently merged a merge request for [`@gitterhq/services](https://gitlab.com/gitlab-org/gitter/services)? then read on…

### Prerequisites

Before you proceed, make sure you have done the following:

1. Pushed a tagged release of [`@gitterhq/services`](https://gitlab.com/gitlab-org/gitter/services) to GitLab
2. Updated the [`@gitterhq/services`](https://gitlab.com/gitlab-org/gitter/services) dependency in [`gitter-webhooks-handler`](https://gitlab.com/gitlab-org/gitter/gitter-webhooks-handler) via npm
3. Deployed the new [`gitter-webhooks-handler`](https://gitlab.com/gitlab-org/gitter/gitter-webhooks-handler) (don't worry, your new service won't be accessible unless someone is adept at guessing URLs)

### Updating `@gitterhq/services`

Once you are sure the above is done, preform the following:

1. Update the version of the `@gitterhq/services` dependency in this project's [`package.json`](package.json)
2. `npm install`
3. `make sprites`
4. Commit your changes and release!


## Troubleshooting

### `npm ERR! Maximum call stack size exceeded`

If you are running into `npm ERR! Maximum call stack size exceeded`

```bash
# Remove nested `node_modules` directories
$ find . -name "node_modules" -exec rm -rf '{}' +

# Remove nested `package-lock.json`
$ find . -name "package-lock.json" -exec rm -rf '{}' +

# Try installing again
$ npm install
```


## Miscellaneous tips & tricks

- You can access the homepage even when signed in by using the `?redirect=no` query - https://gitter.im/?redirect=no (http://localhost:5000/?redirect=no)

### Easily get your Gitter access token

1. You can get your access token by running `troupeContext.accessToken` in the browser's DevTools console

### Sign in with Gitter access token

1. Open Gitter in a different browser using the `access_token` query parameter, `https://gitter.im/?access_token=<your token>`

If you are using the desktop app, you can follow [these steps to manually authorize](https://gitlab.com/gitlab-org/gitter/desktop/#manually-sign-inauthorize)

### Invalidate Gitter access token

You can use the handy utility script: `scripts/utils/delete-token.js`

Or you can simply delete the token from the database,

```sh
$ ssh mongo-replica-01.prod.gitter
$ mongo mongo-replica-01.prod.gitter

> use gitter
> db.oauthaccesstokens.findOne({ token: 'xxx' })
> db.oauthaccesstokens.remove({ token: 'xxx' })
```


### Invalidate a GitHub access token

If a GitHub token leaks, we can invalidate with the https://developer.github.com/v3/apps/oauth_applications/#delete-an-app-token API

To grab the `clientId` and `clientSecret` for the request below, use the following links:

 - For `user.githubUserToken` -> `Gitter Public Repo Access`: https://github.com/organizations/gitterHQ/settings/applications/70282
 - For `user.githubToken` -> `Gitter Private Repo Access`: https://github.com/organizations/gitterHQ/settings/applications/69324

Then fire off the request to delete the GitHub token:
```
DELETE https://api.github.com/applications/:clientId/token

Basic authentication
Username: <clientId>
Password: <clientSecret>

Accept: application/vnd.github.doctor-strange-preview+json
Content-Type: application/json

Body:
{
	"access_token": "xxxtokentorevoke"
}
```

## Working with renovate configuration

### Testing renovate before merging

`renovate` can be run locally

Install it as a global package/command

```
$ npm i -g renovate
```

The issue is that renovate reads the config from the repository itself and it always uses default branch (`develop` for webapp). AFAIK there isn't away to point it to a different branch. There is an [issue for interactive MR for config changes](https://github.com/renovatebot/renovate/issues/547) that will remove need for this local/fork testing process.

#### Pointing renovate to your fork

```
git remote add myfork <url of your fork>
git push renovate-range-strategy myfork
```

Go to your fork's repository settings (`<myfork url>/-/settings/repository`) and set `renovate-range-strategy` as default branch.

Add `"renovateFork": true,` to your `renovate.json` and push it on top of `myfork/renovate-range-strategy` branch.

Create a token for your user and give it these scopes `api, read_user, read_repository`.

Now you can run renovate

```
renovate --platform gitlab --dry-run true --print-config true --token "<token>" viktomas/webapp
```
