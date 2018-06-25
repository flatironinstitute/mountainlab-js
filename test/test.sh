#/bin/bash

set -e
if [ -z "$GLOBAL_INSTALL_FLAG" ]
then
    echo [testing a local install]
    DIR=`dirname $0`
    export PATH=$DIR/../bin:$PATH
else
    echo [ testing a global install, npm bin -g = $(npm bin -g) ]
fi

ml-list-processors
