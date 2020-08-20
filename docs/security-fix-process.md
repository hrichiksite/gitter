# Develop a security fix

Based off the [GitLab security fix process](https://gitlab.com/gitlab-org/release/docs/blob/master/general/security/developer.md). This section is aimed at other GitLabbers.

Security fixes are made **exclusively** against https://dev.gitlab.org/gitlab/gitter/webapp

 - Before starting, run `npm run security-harness`. This script will install a Git `pre-push` hook that will prevent
pushing to any remote besides `dev.gitlab.org`, in order to prevent accidental disclosure.
    - You may want to clone a separate `dev.gitlab.org` only repo to better separate things instead of adding another remote
    - Otherwise here are some commands to setup and use the `dev.gitlab.org` remote,
       - `git remote add security-dev git@dev.gitlab.org:gitlab/gitter/webapp.git`
       - `git push security-dev`
 - Before starting, update the `develop`/`master` branches and tags on `dev.gitlab.org` by running
   ```
   git checkout develop && git pull origin develop && git push security-dev
   git checkout master && git pull origin master && git push security-dev
   git push security-dev --tags
   ```
 - Feel free to cancel all of the CI jobs that kick-off because of the new stuff we just pushed (we already ran them in the public project anyway), https://dev.gitlab.org/gitlab/gitter/webapp/pipelines
 - Create the merge request against https://dev.gitlab.org/gitlab/gitter/webapp
 - Once the merge request is ready, create a security fix release on `dev.gitlab.org` and deploy to staging/production (see below)

## Security fix release
 - Squash the fix into one commit for easier cherry-picking
 - Before releasing, update the `develop`/`master` branches and tags on `dev.gitlab.org` by running
   ```
   git checkout develop && git pull origin develop && git push security-dev
   git checkout master && git pull origin master && git push security-dev
   git push security-dev --tags
   ```
 - You can cancel all the tag and master pipelines triggered 
 - Now create hotfix (example if production version is `19.50.0`)
   ```
   git checkout 19.50.0
   git flow hotfix start 19.50.1
   git cherry-pick {the squashed security fix}
   git push security-dev hotfix/19.50.1
   ```
 - Trigger deployment to staging manually in the [pipeline view](https://dev.gitlab.org/gitlab/gitter/webapp/pipelines)
 - Perform checks in staging described in the [release checklist](https://gitlab.com/gitlab-com/gl-infra/gitter-infrastructure#release-checklist)
 - If everything looks good and the fix has been verified in staging, prepare production release
   ```
   git flow hotfix finish 19.50.1
   git push security-dev master
   git push --tags security-dev
   ```
 - Trigger deployment to production manually in the [pipeline view](https://dev.gitlab.org/gitlab/gitter/webapp/pipelines) (the tag pipeline)
 - Verify the fix is in place on production
 - In some of your pipelines, run the job to push the same fix to `beta` and `beta_staging`


## Backport the change
Backport the change to the [public `webapp` project](https://gitlab.com/gitlab-org/gitter/webapp)
```
git push origin master
git push origin developer
git push --tags origin
```
You can cancel the hotfix tag pipeline in https://gitlab.com/gitlab-org/gitter/webapp

Add the hotfix to the [changelog](https://gitlab.com/gitlab-org/gitter/webapp/blob/develop/CHANGELOG.md). Link the confidential issue for all the details that will be public at a later time. Description *ideally* shouldn't explain how to reproduce the issue (e.g. `Fix integration activity XSS` instead of `Stored XSS via Wiki links`). Link the HackerOne profile of the person disclosing the issue (`https://hackerone.com/{user name}`).

Example:
```markdown
 - Fix integration activity XSS, https://gitlab.com/gitlab-org/gitter/webapp/issues/2068
     - Thanks to [@mishre](https://hackerone.com/mishre) for [responsibly disclosing](https://about.gitlab.com/security/disclosure/) this vulnerability to us.
     - https://dev.gitlab.org/gitlab/gitter/webapp/merge_requests/1
```