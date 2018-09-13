#!/bin/bash

set -e

# publish to npm
# you must add encrypted NPM_TOKEN env variable to .travis.yml
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > .npmrc
docker pull magland/mldevel_publish
docker run -v $PWD/.npmrc:/root/.npmrc -v $PWD:/source magland/mldevel_publish npm

# publish to anaconda
# you must add encrypted ANACONDA_API_TOKEN env variable to .travis.yml
docker pull magland/mldevel_publish
docker run -e "ANACONDA_API_TOKEN=$ANACONDA_API_TOKEN" -v $PWD:/source magland/mldevel_publish conda