# Integrations/Activity

Gitter is integrated with numerous services via webhooks. When you add an integration to a chat room, you will see events from that integration appear in the right-toolbar under the "Activity" section.

![](https://i.imgur.com/nZZcCN3.png)

Our integrations include:

 - GitLab
 - GitHub
 - BitBucket
 - Trello
 - AppVeyor
 - CircleCI
 - Codecov
 - Codeship
 - Coveralls
 - Discourse
 - Docker Hub
 - Doorbell
 - Drone
 - GitBook
 - GoCD
 - Heroku
 - Huboard
 - Jenkins
 - Logentries
 - New Relic
 - Open Collective
 - PagerDuty
 - Pivotal Tracker
 - Sentry
 - SnapCI
 - Sprint.ly
 - The Bug Geneie
 - TrackJS
 - Travis
 - Send us a Merge request to add your own, https://gitlab.com/gitlab-org/gitter/services


## Setup

**Room settings dropdown** -> **Integrations**

![](https://i.imgur.com/AI4pBBP.png)

### GitHub

#### Per-repository

Integrations for a set of GitHub repositories can be configured
automatically by using the **Integrations** menu shown above:

1. **Room settings dropdown** -> **Integrations**
2. Select **GitHub**
3. Authorise the use of the app, if necessary
4. Select one or more repositories from the displayed list

Events occurring in the selected repositories will now be displayed
in the room as notifications.

#### Per-organisation

It may be desirable to automatically receive all notifications for
all repositories in a given GitHub organisation.  If your GitHub
organisation frequently adds repositories, and you have a single Gitter
room for the entire organisation, it can be rather laborious to
continually add new integrations for each new repository.  Currently,
receiving notifications for an entire organisation requires manual
configuration.

To set up notifications for an entire organisation:

1. **Room settings dropdown** -> **Integrations** -> **GitHub** -> **Configure manually**
2. A dialog box will appear containing an access token. For the sake
   of these instructions, we will assume that the access token is `e07c5162bd8b`.

Now, go to your organisation on GitHub and navigate to the organisation's
settings, and go to the **Webhooks** section. Add a new webhook, and enter
the following settings:

| Field        | Value                                     |
|--------------|-------------------------------------------|
| Payload URL  |`https://webhooks.gitter.im/e/e07c5162bd8b`|
| Content-type | application/json                          |
| Secret       |                                           |

Note that `e07c5162bd8b` should obviously be replaced with the access token
generated for you in step `2` above.

Confirm the addition of the webhook, and you should now start receiving
organisation-wide events in the configured Gitter room.

