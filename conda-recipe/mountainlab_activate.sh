#echo "=== [ mountainlab-js activate script ] ======================================="
#echo ":"

# These dirs are created on install (see conda-recipe/meta.yaml)
export ML_CONDA_DIR="${CONDA_PREFIX?}"/etc/mountainlab
export ML_CONDA_PACKAGES_DIR="$ML_CONDA_DIR"/packages
export ML_CONDA_DATABASE_DIR="$ML_CONDA_DIR"/database

# if user has specified ML_CONFIG_DIRECTORY, warn, but don't overwrite it
if [ -z "$ML_CONFIG_DIRECTORY" ] ; then
#    echo ": OK! Default mountainlab search path for active env (${CONDA_DEFAULT_ENV}) is:"
#    echo ":     '$ML_CONDA_DIR'"
    export ML_CONFIG_DIRECTORY=$ML_CONDA_DIR
    export ML_CONFDIR_WASEMPTY=true
else
    if [ -n "$MLCONFDIR_WASEMPTY" ] && [ "$ML_CONFIG_DIRECTORY" = "$ML_CONDA_DIR" ]; then 
	echo ": OK! mountainlab env reactivation, nothing to do."
    else
	echo ": WARN! Default mountainlab search path already set ('$ML_CONFIG_DIRECTORY')."
	echo ":       This may override conda search paths; run 'unset ML_CONFIG_DIRECTORY' to reset."
    fi
fi
#echo ":"
#echo ": Run 'ml-config' to see all search paths in use."
#echo "==============================================================================="
