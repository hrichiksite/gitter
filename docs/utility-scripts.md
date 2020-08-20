# Utility scripts overview

These are scripts that can help you answer questions like "What's this user's eyeball state?" and "What's the userId for mydigitalself?". They can be found in `scripts/utils`.


## :wrench: Before you can run a script :wrench:
1. [SSH into a box](https://gitlab.com/gl-infra/gitter-infrastructure#ssh-to-boxes) if you are running the script in beta or prod
1. [Setup secrets](https://gitlab.com/gitlab-org/gitter/webapp#configure-service-secrets)
1.  **IMPORTANT:** Adjust the `NODE_ENV=prod` environment variable to the desired environment, `prod`, `beta`, `dev`


## Spam on Gitter (fighting abuse)

See https://gitlab.com/gitlab-com/gl-security/runbooks/-/blob/master/abuse/gitter_spam.md


## Utility scripts

### `auto-lurk-room.js`

```
NODE_ENV=prod ./scripts/utils/auto-lurk-room.js --members 30000 --min 31
```


### `delete-user.js`

Removes a user from all room and destroys their auth tokens. Requires a username.

e.g

```
NODE_ENV=prod ./scripts/utils/delete-user.js --username trevorah
```

### `delete-messages-from-user.js`

Delete all messages for a given user

```
NODE_ENV=prod ./scripts/utils/delete-messages-from-user.js --username someusername
# Delete more messages if they have more
NODE_ENV=prod ./scripts/utils/delete-messages-from-user.js --username someusername --limit 30000
# Dry run to see what will be deleted
NODE_ENV=prod ./scripts/utils/delete-messages-from-user.js --username someusername --limit 30000 --grep "badmessage" --dry
# Actually delete
NODE_ENV=prod ./scripts/utils/delete-messages-from-user.js --username someusername --limit 30000 --grep "badmessage"
```


### `delete-room.js`

Deletes a room and kicks users out. Requires a room uri.

e.g

```
NODE_ENV=prod ./scripts/utils/delete-room.js --uri trevorah/noembed
```


### `delete-token.js`

```
NODE_ENV=prod ./delete-token.js -t XXXXXXXXXX
```


### `hellban.js`

Hellbanning a user will still let them send messages but they won't actually
show up in the room or even be persisted.

Ban user `badusername`, e.g `NODE_ENV=prod ./scripts/utils/migrate-messages.js --username badusername`
Unban user `badusername`, e.g `NODE_ENV=prod ./scripts/utils/migrate-messages.js --username badusername -u`


### `migrate-messages.js`

Migrates all chat messages from one room to another. Requires two rooms.

e.g `NODE_ENV=prod ./scripts/utils/migrate-messages.js --from trevorah/oldroom --to trevorah/newroom`


### `mobile-notify-user.js`

Sends a test push notification to all devices registered by user. Requires a username.

e.g `NODE_ENV=prod ./scripts/utils/mobile-notify-user.js trevorah`


### `online-state.js`

Prints the current online state for a user. Requires a username.

e.g `NODE_ENV=prod ./scripts/utils/online-state.js trevorah`


### `redirect-room.js`

Redirect `roomA` to `roomB`. *note:* this will delete `roomA`

e.g `NODE_ENV=prod ./scripts/utils/redirect-room.js -f fromroom -t toroom`


### `suggested-rooms.js`

Lists out the rooms suggested to a user. Requires a username.

e.g `NODE_ENV=prod ./scripts/utils/suggested-rooms.js trevorah`


### `update-room-tags.js`

Updates the tags used by the explore page.

e.g `NODE_ENV=prod ./scripts/utils/update-room-tags.js`


### `unread.js`

Lists out why a user has an unread badge. Requires a username.

e.g `NODE_ENV=prod ./scripts/utils/unread.js trevorah`


### `whois.js`

Looks up users from ids. Requires user ids.

e.g `NODE_ENV=prod ./scripts/utils/whois.js 53bec5764bf9c36505409389`



## Adjusting Feature Toggles

Use the `NODE_ENV=prod ./scripts/utils/feature-toggle.js` script to adjust feature toggles:

For example,

```shell
# Include suprememoocow and trevorah in the test
NODE_ENV=prod ./scripts/utils/feature-toggle.js fancy-new-feature --include-user suprememoocow --include-user trevorah

# Exclude users from the test
NODE_ENV=prod ./scripts/utils/feature-toggle.js fancy-new-feature --exclude-user suprememoocow --exclude-user trevorah

# Include a percentage of all users
NODE_ENV=prod ./scripts/utils/feature-toggle.js fancy-new-feature --percentage 70

# Undo "include a percentage of all users"
NODE_ENV=prod ./scripts/utils/feature-toggle.js fancy-new-feature --percentage-off

# Include everyone
NODE_ENV=prod ./scripts/utils/feature-toggle.js fancy-new-feature --enable

# Undo "include everyone"
NODE_ENV=prod ./scripts/utils/feature-toggle.js fancy-new-feature --enable-off

# Disable Chrome, version 47 and below
NODE_ENV=prod ./scripts/utils/feature-toggle.js fancy-new-feature --disable-browser Chrome:47

# Disable all versions of IE
NODE_ENV=prod ./scripts/utils/feature-toggle.js fancy-new-feature --disable-browser IE:all

# Renable the feature for Chrome
NODE_ENV=prod ./scripts/utils/feature-toggle.js fancy-new-feature --disable-browser-off Chrome
```

To turn on and off features manually in your browser:

```
http://localhost:5000/api_web/features/[feature]/[0/1]
```

For example:

```
http://localhost:5000/api_web/features/chat-cache/1
```


## Updating the Social Graph

The social graph updater runs as a batch job in a cron every few hours. You can manually invoke it as follows.

```shell
NODE_ENV=prod ./scripts/graphs/upload-graph.js
```

The uploader script starts a local webserver, and it will guess the URL for that webserver by looking at the host computers
network interfaces. If you want to the script against production from your developer computer, you'll need to specify the OpenVPN
tunnel interface, otherwise the script will serve from a URL inaccessible from OpenVPN.

You can do this as follows:
```shell
NODE_ENV=prod LISTEN_IF=utun0 ./scripts/graphs/upload-graph.js
```
