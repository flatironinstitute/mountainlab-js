#/bin/bash
set -e -u
# npm runs scripts from the package root (https://docs.npmjs.com/cli/run-script)
export PATH="$PWD"/bin:"$PATH"; 
ml-config
ml-list-processors
