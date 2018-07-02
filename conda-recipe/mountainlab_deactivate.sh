#!/bin/bash -e
echo "=== [ mountainlab-js deactivation ] ==========================================="
echo ":"
mldir_conda="${CONDA_PREFIX?}"/etc/mountainlab

# if we set confdir on activation, and it hasn't changed, unset it.
if [ -n "$MLCONFDIR_WASEMPTY" ] && [ "$ML_CONFIG_DIRECTORY" = "$mldir_conda" ]; then
    echo ": Deactivating mountainlab search path for env ${CONDA_PROMPT_MODIFIER}."
    unset ML_CONFIG_DIRECTORY 
    unset MLCONFDIR_WASEMPTY
else 
    if [ -n "$ML_CONFIG_DIRECTORY" ]; then
	echo ": User-set ML_CONFIG_DIRECTORY left unchanged ( '$ML_CONFIG_DIRECTORY' )."
    else
	echo ": ML_CONFIG_DIRECTORY already unset/null, nothing to do"
    fi
fi
echo ":"
echo "==============================================================================="
