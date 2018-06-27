#!/bin/bash

# See: http://adampaxton.com/how-to-deploy-to-multiple-heroku-apps-from-the-same-git-repository/

git subtree push --prefix OLD/mlstudy heroku-mlstudy master
