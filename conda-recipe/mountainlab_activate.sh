#!/bin/bash -e
echo "=== [ mountainlab-js activate script ] ======================================="
echo ":"

# This will be default mountainlab dir (equivalent to ~/.mountainlab) for this install
mldir_conda="${CONDA_PREFIX?}"/etc/mountainlab

# if user has specified ML_CONFIG_DIRECTORY, warn, but don't overwrite it
if [ -z "$ML_CONFIG_DIRECTORY" ]; then
    echo ": OK! Default mountainlab search path for active env ${CONDA_PROMPT_MODIFIER}is:"
    echo ":     '$mldir_conda'"
    export ML_CONFIG_DIRECTORY=$mldir_conda
    export MLCONFDIR_WASEMPTY=true
else 
    if [ -n "$MLCONFDIR_WASEMPTY" ] && [ "$ML_CONFIG_DIRECTORY" = "$mldir_conda" ]; then 
	echo ": OK! Reactivation, nothing to do."
    else
	echo ": WARN! Default mountainlab search path already set ('$ML_CONFIG_DIRECTORY')."
	echo ":       This may override conda search paths; run 'unset ML_CONFIG_DIRECTORY' to reset."
    fi
fi
echo ":"
echo ": Run 'ml-config' to see all search paths in use."
echo "==============================================================================="
