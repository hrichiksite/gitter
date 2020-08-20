# Gitter account

A Gitter account is associated with GitLab/GitHub/Twitter and matches whatever info you have on that platform.

If you updated some info on GitLab/GitHub/Twitter, sign out of Gitter and sign back in to have it updated.


## Can I merge/connect my accounts?

There isn't a way to merge accounts.

We will probably introduce this capability after we add the [ability to set your own username](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/1851). You can track [this issue](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/1752) for linking different accounts together.


## Can I change my username?

You can't change your username. Your username matches whatever OAuth provider you signed in with.

If you changed your username on GitHub, sign out of Gitter and sign back in again to update it.


### How do I remove the  `_gitlab`/`_twitter` suffix from my username

See above, you can't change your username.

We add the `_gitlab`/`_twitter` suffix to avoid name collisions with GitHub.
If you don't want the suffix added, sign in with GitHub.

You can track [#1851](https://gitlab.com/gitlab-org/gitter/webapp/issues/1851)
for the ability to customize your username in the future and remove the suffix.

## How do I update my avatar?

Sign out of Gitter and sign back in to update your avatar (or any other info).

Currently, there is an outstanding bug where this doesn't work with GitLab/Twitter accounts, https://gitlab.com/gitlab-org/gitter/webapp/issues/1834


## How do I delete my account?

You can delete your account by using the profile menu dropdown in the top-right -> **Delete Account**

![](https://i.imgur.com/j3Gowl7.png)

This could leave some communities/rooms orphaned without an admin (make sure to set another admin before deletion).

We can't recover your data after deletion but you can re-create your account at any time by signing back in.

### Ghost user

If you want to remove/disassociate all of your personal information from your Gitter account,
you can use the **Remove personal information and turn my account into a "ghost"** checkbox in the delete account modal.

This will:

 - Clear any backing identities (such as GitLab/Twitter) including GitHub tokens
 - Clear any emails
 - Change your username to `ghost~<id>` and your display name to "Ghost"
 - Clear your avatar
 - Mark your ghost user account as removed

This will **NOT**:

 - Delete your messages
 - Delete your communities/rooms
 - Change mentions of your username

![](https://i.imgur.com/rX3plq5.png)
