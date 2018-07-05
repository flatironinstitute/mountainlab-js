#!/bin/bash
#echo "=== [ mountainlab-js deactivation ] ==========================================="
#echo ":"

# if we set confdir on activation, and it hasn't changed, unset it.
if [ -n "$ML_CONFDIR_WASEMPTY" ] && [ "$ML_CONFIG_DIRECTORY" = "$ML_CONDA_DIR" ]; then
#    echo ": Deactivating mountainlab search path for env (${CONDA_DEFAULT_ENV})."
    unset ML_CONFIG_DIRECTORY 
else 
    if [ -n "$ML_CONFIG_DIRECTORY" ]; then
	echo ": Original user-set ML_CONFIG_DIRECTORY left unchanged ( '$ML_CONFIG_DIRECTORY' )."
    else
	echo ": ML_CONFIG_DIRECTORY already unset/null, nothing to do"
    fi
fi
#echo ":"
#echo "==============================================================================="

unset ML_CONFDIR_WASEMPTY
unset ML_CONDA_DIR
unset ML_CONDA_PACKAGES_DIR
unset ML_CONDA_DATABASE_DIR
