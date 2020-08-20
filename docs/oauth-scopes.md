# OAuth Scopes

## GitLab

You can sign in via GitLab. Your username will have a `_gitlab` suffix. You can track [this issue for getting rid of the suffix and being able to change your username](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/1851).

We request following GitLab OAuth scopes:

- `read_user` - to be able to fetch your username, display name, and email for unread email notifications
- `api` - to be able to fetch your groups/projects when you try to create a community/room and decorate issues to show whether they are open/closed

The `api` scope is pretty far reaching and we wish we could just have [`read` access to the API](https://gitlab.com/gitlab-org/gitlab/-/issues/21909). GitLab also does not have a way to [restrict access to certain groups/projects yet](https://gitlab.com/gitlab-org/gitlab/issues/22115).

Ideally, we could have a split OAuth scope and upgrade flow like we have for GitHub. This way users could start out with just `read_user` scope granted. But our code doesn't support upgrade flows for providers other than GitHub at the moment. The other providers are implemented in a generic way with a single token.

You can see how we have we have the GitLab OAuth application settings configured:

![](https://i.imgur.com/G9n4LOs.png)


### Twitter

You can sign in via Twitter. Your username will have a `_twitter` suffix. You can track [this issue for getting rid of the suffix and being able to change your username](https://gitlab.com/gitlab-org/gitter/webapp/-/issues/1851).

For Twitter, we are requesting the bare minimum `Read-only` permissions. We add the email permission so we can send unread notification emails. You can see how we have permissions configured in our Twitter developer dashboard:

![](https://i.imgur.com/RjOO5eu.png)


## GitHub

For a quick rundown on how to sort out your GitHub OAuth scopes to get your GitHub organization/repo to appear, [see our FAQ section on **"Why isn't my GitHub organisation or repos appearing?"**](./faq.md#why-isnt-my-github-organisation-or-repos-appearing)

For GitHub, we split permissions to initially only include public repo information and user email for unread notification emails. This falls under the `Gitter Public Repo Access` OAuth application.

For the private repos, it's a separate scope(`Gitter Private Repo Access`) you can optionally [grant after the fact](#grant-private-repo-access). The only time we ever "write" to a private repo is to add a webhook integration. We will never, ever modify your code. Ever. Just like you, we're developers and entirely respect the privacy of your code.

GitHub is also nice and allows you to choose on a per-org basis what you want to share ([organization access control](https://help.github.com/en/github/setting-up-and-managing-organizations-and-teams/approving-oauth-apps-for-your-organization)).


**Gitter Public Repo Access**:

For a [description of these scopes see the GitHub docs](https://developer.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/):

 - `user:email`
 - `read:org`

**Gitter Private Repo Access**:

For a [description of these scopes see the GitHub docs](https://developer.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/):

 - `repo`
 - `user:email`
 - `read:org`


### Grant Private Repo Access

If you don't see **Gitter Private Repo Access** listed in your [personal application settings](https://github.com/settings/applications), you can start the process in Gitter via the user dropdown menu in the top-right.

![](https://i.imgur.com/hn4dRO1.png)

You can also use this link which will redirect you to add the private repo permission: https://gitter.im/login/upgrade?scopes=repo


### Organisation Access Control

GitHub introduced [organization-approved applications](https://blog.github.com/2015-01-19-organization-approved-applications/) which significantly changes how organisations interact with the API. This new feature means that organisations can block OAuth Applications and access needs to be requested/enabled. If you don't want Gitter to have access to a particular organisation for whatever reason, please ensure this is turned on or revoke Gitter's access to this organisation. You need to have admin access to the org in order to do this.

---

We normally request organisation access during sign-up so existing users creating/joining new organisations will run into a few snags.

There are one of two things you can do:

**Disable the setting**. If you visit `https://github.com/organizations/YOURORG/settings/oauth_application_policy` you can disable the restriction from this page.

**Manually grant access**

Visit your [personal application settings](https://github.com/settings/applications) and find any Gitter applications there, click on the name of application and you should see the list of organisations that allow access to the application and you can grant access here.

Please note that if you enable Gitter for access to private repositories, you will need to do this for the "Gitter Private Repo Access" application as well. If you don't see "Gitter Private Repo Access" listed in your personal application settings, see the ["Private Repositories"](#private-repositories) section above.

![](https://i.imgur.com/9GtNmUP.png)

![](https://i.imgur.com/HpCotUq.png) ![](https://i.imgur.com/Ljlb4nf.png)
