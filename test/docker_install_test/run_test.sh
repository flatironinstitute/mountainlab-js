#!/bin/bash

# Run this in the directory where the script is found.
# It will download the current source code from github, and then test the installation

set -e

rm -rf mountainlab-js-test
git clone https://github.com/flatironinstitute/mountainlab-js mountainlab-js-test
docker build -t mountainlab-js-test .
docker run -it mountainlab-js-test
