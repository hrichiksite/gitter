# Gitter webapp

[Gitter](https://gitter.im) is a community for software developers. This project is the main monolith web application.

This codebase even covers a lot of the mobile and desktop applications which embed a web frame.

If you are just interested in the Gitter API, see https://developer.gitter.im/

 - Roadmap/plan (dates not accurate),
    - [Epics roadmap](https://gitlab.com/groups/gitlab-org/-/roadmap?scope=all&utf8=%E2%9C%93&state=opened&label_name%5B%5D=group%3A%3Agitter&layout=QUARTERS)
    - [Epics list](https://gitlab.com/groups/gitlab-org/-/epics?scope=all&utf8=%E2%9C%93&state=opened&label_name[]=group%3A%3Agitter)
 - Security issue boards
    - https://gitlab.com/groups/gitlab-org/gitter/-/boards/1084052
    - https://gitlab.com/groups/gitlab-com/-/boards/1084045
    - [Responsible disclosure](https://about.gitlab.com/security/disclosure/)

![](https://i.imgur.com/wT0bSy2.png)


## Background

Development of Gitter can be done in any environment that supports Node.js and bash and can run Redis and MongoDB, but for simplicity we use Docker Compose to provide a pre-canned environment which contains:

 1. Mongodb (persistent storage)
 1. Elasticsearch (search)
 1. Redis (caching and some persistent storage)
 1. Neo4j (suggestions)

## Prerequisites

Follow these instructions to setup an environment to hack on Gitter.

 1. [Install Docker Compose](https://docs.docker.com/compose/install/)
    * On Linux, follow the instructions over at  https://docs.docker.com/compose/install/
    * On Mac, use [Docker for Mac](https://docs.docker.com/docker-for-mac/install/)
    * On Windows, get [Docker for Windows](https://docs.docker.com/docker-for-windows/install/)
 1. Install **Node 10.x (LTS)** [manually](https://nodejs.org/dist/latest-v10.x/) or using a tool like [nvm](https://github.com/creationix/nvm)
    * If you are on Windows, you can use [nvm-windows](https://github.com/coreybutler/nvm-windows)
 1. Install **npm 6.x**
    * Node **10.x** already comes with **npm 6.x**. Otherwise, you can install manually with `npm install npm@^6.x -g`
 1. Clone this repo: `git clone https://gitlab.com/gitlab-org/gitter/webapp.git`
 1. Run `npm install`
    * Go and make a cup of tea, because this will take a rather long time.


## Starting Gitter

TLDR;

```
docker-compose up -d --no-recreate
npm run create-seed-data
npm start
```

 * If you run into `Error: Cannot find module './build/Release/cld'`, delete the `node_modules` directory and run `npm install` again


### Start dependent services

Start Gitter's dependent services:

```shell
docker-compose up -d --no-recreate
```

If you run into the following error, you may need to re-run the same command with `sudo`.
```
ERROR: Couldn't connect to Docker daemon at http+docker://localunixsocket - is it running?

If it's at a non-standard location, specify the URL with the DOCKER_HOST environment variable.
```

This process will fetch Docker images from Docker Hub. You might want to make another cup of tea and have a biscuit at this point. You can also continue to the next section at this point to kill some time.

### Running Gitter without OAuth

The simplest way to run Gitter `webapp` is to start it without [OAuth configuration](#configure-oauth-and-service-secrets). To do that, make sure [the dependent services are running](#start-dependent-services) and then run `npm run create-seed-data` which will create a room and two users in the database. You can run the `create-seed-data` script as many times as you want. It will always create new room and users. After that you can start the app with `npm start` and follow the seed data links to login to the `webapp`.

*Warning: This simplistic version of Gitter doesn't support signing in with GitLab, GitHub or Twitter and doesn't support integration with GitLab or GitHub.*

*Warning: When you delete the containers (by running `docker-compose down` or `docker-compose up` without `--no-recreate`) you'll have to generate new seed data.*

*If you are interested in improving this process, please visit https://gitlab.com/gitlab-org/gitter/webapp/issues/2463*

### Configure OAuth and service secrets

<a id="configure-service-secrets"></id>

This is an optional step. If you don't want the sign in with GitLab, GitHub, Twitter features, then you can just use the test accounts that the `npm run create-seed-data` will log out (from the [step above](#running-gitter-without-oauth)).

Gitter connects to third party APIs. In order to do this, you will need to generate API tokens and add them to your configuration.

You only need to collect the secrets once. But you need to export the environment variables in any new terminal session.

In the future, we hope to streamline this process and skip OAuth providers. You can track https://gitlab.com/gitlab-org/gitter/webapp/issues/1973

#### Mac

To do this automatically, run the following command which will create a `.env` file (this only needs to be done once):
```shell
./obtain-secrets
```

Export the environment variables with (this needs to be done in any new terminal session):

```bash
source .env
```

#### Windows

The `./obtain-secrets` script doesn't support Windows yet.

Create `.env` in the project root and follow the `REM` comments in the snippet below (this only needs to be done once):

`.env`
```
SET web__sessionSecret=xxx
SET ws__superClientPassword=xxx
SET web__messageSecret=xxx
SET email__unsubscribeNotificationsSecret=xxx
SET integrations__secret=xxx
SET github__statePassphrase=xxx
REM Visit https://developer.twitter.com/en/apps/create, name: Gitter Twitter YOURTWITTERUSERNAME, callback url: http://localhost:5000/login/twitter/callback
REM After creation, click "keys and tokens" to get your Consumer API Keys
SET twitteroauth__consumer_key=xxx
SET twitteroauth__consumer_secret=xxx
REM Visit https://gitlab.com/profile/applications, name: Gitter User Dev, redirect URI: http://localhost:5000/login/gitlab/callback, scopes: api, read_user
SET gitlaboauth__client_id=xxx
SET gitlaboauth__client_secret=xxx
REM Visit https://github.com/settings/applications/new, name: Gitter Private Dev, authorization callback url: http://localhost:5000/login/callback
SET github__client_id=xxx
SET github__client_secret=xxx
REM Visit https://github.com/settings/applications/new, name: Gitter User Dev, authorization callback url: http://localhost:5000/login/callback
SET github__user_client_id=xxx
SET github__user_client_secret=xxx
REM Same as github__user_client_id
SET github__anonymous_app__client_id=xxx
REM Same as github__user_client_secret
SET github__anonymous_app__client_secret=xxx
REM This can be some random string
SET tokens__anonymousPassword=xxx
```

Export the environment variables with (this needs to be done in any new terminal session):

```powershell
@FOR /f "tokens=*" %i IN ('cat .env') DO @%i
```

#### Remote machines

If you've got an access to Gitter beta and production environments, you can [follow the infrastructure instructions](https://gitlab.com/gitlab-com/gl-infra/gitter-infrastructure/-/blob/master/docs/diagnostics.md#configure-secrets) to set up the secrets.


### Start Gitter services

Only proceed once [dependent services](#start-dependent-services) (Docker containers) have started.

Gitter is executed through Gulp with the following command:

```shell
npm start
```

Visit [http://localhost:5000](http://localhost:5000)

#### Inspecting the Node.js instance

You can inspect the Node.js instance with Chrome devtools by adding the `--inspect-node` flag.
This allows you to use things like breakpoints, `debugger`, and step through the code.

```sh
npm start -- --inspect-node
```

You can also install the [Node.js inspector Manager (NiM)](https://chrome.google.com/webstore/detail/gnhhdgbaldcilmgcpfddgdbkhjohddkj)
browser extension to automatically keep your devtools up to date when
Nodemon restarts the Node.js process.

### Clearing the local MongoDB

Local MongoDB uses a `gitter-mongodb` docker volume to persist the DB state even after shutting down the container. You can remove this volume by running `docker volume rm gitter-mongodb` (you might need to remove containers that use the volume or use `-f` option). Docker compose will create a new volume next time you start MongoDB container.

### Browsing local MongoDB (GUI)

The Docker compose command we ran above starts a [`mongo-express`](https://github.com/mongo-express/mongo-express) container. You can use it to view content/data in your local MongoDB, see [http://localhost:8081/](http://localhost:8081/).

### Shutting down Docker Compose

You can stop the docker containers with:

```shell
docker-compose stop
```

If you want to remove your containers, use

```shell
docker-compose rm -f
```

### Going further

We also have some other docs which give a [overview/walkthrough of the codebase](https://gitlab.com/gitlab-org/gitter/webapp/blob/develop/docs/code-overview.md)
and [some notes on touching production](https://gitlab.com/gl-infra/gitter-infrastructure/blob/master/README.md).


### Submitting a merge request

#### Code style/formatting (lint)

This project uses [Prettier](https://prettier.io/docs/en/install.html) for opinionated automatic formatting.
You can run the following commands to check and fix the formatting before submitting your merge request.

Checking is done in the `validate` CI job and this should pass regardless of your what project secrets you setup

```
npm run prettier -- --check "**/*.{js,vue}"

npm run prettier -- --write "**/*.{js,vue}"
```

There are also [Prettier plugins/integrations for your editor](https://prettier.io/docs/en/editors.html) if you prefer to have it built in and format on save.


#### Getting the GitLab CI tests green :white\_check\_mark:

Just add all of the variables from your `.env` file to your forked projects [**Settings** -> **CI/CD** -> **Environment variables**](https://docs.gitlab.com/ee/ci/variables/#variables) section

After adding the variables, just retry the pipeline.

You can look at the [issues labeled with ~"test"](https://gitlab.com/gitlab-org/gitter/webapp/issues?scope=all&utf8=%E2%9C%93&state=opened&label_name[]=test) for any known problems.


### Testing

All unit tests etc can be run with `npm test`


#### Run individual tests

Anything after the `--` is an argument to Mocha itself, see https://mochajs.org/#command-line-usage

```
npm run mocha -- test/some-test.js

npm run mocha -- test/some-test.js --grep "specific test"
```

#### End-to-end(e2e) tests

Start the `webapp` with the fixtures endpoint and GitHub API stubbed

macOS/Linux:
```shell
DISABLE_GITHUB_API=1 ENABLE_FIXTURE_ENDPOINTS=1 npm start
```

Windows:
```shell
set DISABLE_GITHUB_API=1&&set ENABLE_FIXTURE_ENDPOINTS=1&&npm start
```

Start the e2e tests

```shell
# Run with GUI (in Chrome)
npm run test-e2e-open

# Run headless without any GUI (in Electron)
npm run test-e2e-run
```


# Contributing

We use [git-flow](https://danielkummer.github.io/git-flow-cheatsheet/). Merge requests should be made against `develop` not `master`.

Please join us in [gitter/contributing](https://gitter.im/gitter/contributing) for questions or to get in touch.
