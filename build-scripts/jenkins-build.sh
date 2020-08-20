#!/bin/bash

###############################################################################
# Taken from Jenkins config
# The goal here is to chip away at this file and slowly move everything into
# gulp so that we're able to switch CI tools easier.
###############################################################################

set -euo pipefail
IFS=$'\n\t'

set -e
set -x

if [[ "${FORCE_CLEAN_WORKSPACE:-}" == "true" ]]; then
  git clean -xfd
fi

GIT_BRANCH_SHORT=${GIT_BRANCH##origin/}

secrets_dir=""
trap clean_up EXIT

function clean_up {
  if [[ -n "${secrets_dir}" ]]; then
    rm -rf "${secrets_dir}"
  fi

  if [[ -n "${secrets_file}" ]]; then
    rm -rf "${secrets_file}"
  fi
}

function load_secrets {
  secrets_dir=$(mktemp -d 2>/dev/null || mktemp -d -t 'mytmpdir')
  secrets_file=$(mktemp)
  git clone -b develop --depth 1 git@gitlab.com:gl-gitter/secrets.git ${secrets_dir}
  pushd ${secrets_dir}
  ${secrets_dir}/webapp/env-file test > ${secrets_file}
  chmod 400 "${secrets_file}"
  GITTER_SECRETS_ENV_FILE="${secrets_file}"
  export GITTER_SECRETS_ENV_FILE
  popd
}

load_secrets

function get_pr {
  curl -s --fail -u "${GITHUB_API_CREDENTIALS_USERNAME}:${GITHUB_API_CREDENTIALS_PASSWORD}" \
      "https://api.github.com/repos/troupe/gitter-webapp/pulls?state=all&head=troupe:${GIT_BRANCH_SHORT}" | \
      python -c 'import sys, json; j=json.load(sys.stdin); print (j[0]["number"] if len(j) > 0 else "")'

}

function get_pr_labels {
  curl -s --fail -u "${GITHUB_API_CREDENTIALS_USERNAME}:${GITHUB_API_CREDENTIALS_PASSWORD}" \
    	"https://api.github.com/repos/troupe/gitter-webapp/issues/${ghprbPullId}/labels" | \
        python -c 'import sys, json; j=json.load(sys.stdin); print "\n".join(map(lambda x: x["name"], j))'
}

if [[ -z "${ghprbPullId:-}" ]] && [[ -n "${GIT_BRANCH_SHORT:-}" ]] && [[ "${GIT_BRANCH_SHORT:-}" != "develop" ]] && [[ "${GIT_BRANCH_SHORT:-}" != "master" ]] ; then
  export ghprbPullId=$(get_pr || "")
  echo "Pull Request found: ${ghprbPullId:-}"
fi

export TEST_REDIS_HOST=${TEST_REDIS_HOST:-}
export FAST_UGLIFY=${FAST_UGLIFY:-}
export SENTRY_API_KEY=${SENTRY_API_KEY:-}
export SENTRY_DOMAIN=${SENTRY_DOMAIN:-}
export SENTRY_SLUG=${SENTRY_SLUG:-}

# test if the selected git tag is actually the checked out branch.
# a prod build checked out a feature branch once, and we have no idea why.
# better to be safe than have premature builds on prod.
test ${SELECTED_GIT_TAG:-} = ${GIT_BRANCH:-}

if [ ${STAGED_ENVIRONMENT:-} = true ]; then
  make continuous-integration ASSET_TAG_PREFIX=S GIT_BRANCH=${GIT_BRANCH:-} GIT_COMMIT=${GIT_COMMIT:-}
else
  make continuous-integration GIT_BRANCH=${GIT_BRANCH:-} GIT_COMMIT=${GIT_COMMIT:-}
fi

mkdir -p output/meta/

### Write pull-request labels to file for later
if [[ -n ${ghprbPullId:-} ]]; then
  get_pr_labels > output/meta/pr-labels.txt
  echo "${ghprbPullId:-}" > output/meta/pr-number.txt
fi

### Build Reports for Jenkins plot plugin
#mkdir -p output/plot-reports/

#PROD_DEPS_ALL_COUNT=$(npm --parseable --loglevel error ls --production |wc -l)
#echo "YVALUE=${PROD_DEPS_ALL_COUNT}" > output/plot-reports/production-dependencies-all-count.properties

#PROD_DEPS_DIRECT_COUNT=$(npm --parseable --loglevel error ls --production --depth 0 |wc -l)
#echo "YVALUE=${PROD_DEPS_DIRECT_COUNT}" > output/plot-reports/production-dependencies-direct-count.properties


#for i in router-app router-chat; do
#  SIZE=$(stat --printf="%s" "output/assets/styles/${i}.css.gz")
#  echo "YVALUE=${SIZE}" > output/plot-reports/css-size-${i}.properties
#done

#for i in vendor router-app router-chat; do
#  SIZE=$(stat --printf="%s" "output/assets/js/${i}.js.gz")
#  echo "YVALUE=${SIZE}" > output/plot-reports/js-size-${i}.properties
#done

if [[ "${FORCE_AUTO_DEPLOY:-}" != true ]] && [[ "${ENVIRONMENT:-}" = beta ]] && [[ "${STAGED_ENVIRONMENT:-}" = true ]]; then
  echo "Should we do an auto-deploy?"
  if [[ -f "output/meta/pr-labels.txt" ]]; then
    if grep -q 'auto-deploy' output/meta/pr-labels.txt; then
      touch output/meta/auto-deploy
    fi
  fi

else
  touch output/meta/auto-deploy
fi
