#!/bin/bash

PACKAGE_NAME=`cat package.json | jq -r '.name'`
VERSION=`cat package.json | jq -r '.version'`
BUILD_NUMBER=`cat package.json | jq -r '.conda.build_number'`
UPLOAD_CHANNEL=`cat devel/conda_upload_config.json | jq -r '.anaconda_upload_channel'`

cmd="anaconda upload $CONDA_PREFIX/conda-bld/linux-64/$PACKAGE_NAME-$VERSION-$BUILD_NUMBER.tar.bz2 -u $UPLOAD_CHANNEL"
echo $cmd
$cmd