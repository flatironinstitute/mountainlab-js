#!/bin/bash

set -e

echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > .npmrc
docker pull magland/mldevel_publish
docker run -v $PWD/.npmrc:/root/.npmrc -v $PWD:/source magland/mldevel_publish npm