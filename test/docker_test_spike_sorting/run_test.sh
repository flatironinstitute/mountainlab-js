#!/bin/bash

# Run this in the directory where the script is found.
set -e

docker build -t mountainlab-js-test .
docker run -it mountainlab-js-test
