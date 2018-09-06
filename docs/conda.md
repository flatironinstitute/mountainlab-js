## Conda

Conda manages software dependencies across multiple programming languages (like 'apt' on Ubuntu, or 'homebrew' on Mac), and installs software into isolated 'environments' (like 'virtualenv' for Python). MountainLab packages are available for Linux and MacOS; apart from the first download step, the instructions are identical for these two operating systems.

The steps below assume you are using `bash` as your shell (the default on Linux and MacOS), and that you want to install conda and all of its files to `~/conda`

On Linux:
```
wget https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh -O miniconda3.sh
```
On Mac:
```
curl https://repo.continuum.io/miniconda/Miniconda3-latest-MacOS-x86_64.sh -o miniconda3.sh
```
Now install Conda
```
# Install conda in batch mode to ~/conda
bash miniconda3.sh -bp ~/conda

# Set up conda shell scripts on login (* see CONDA ACTIVATION note below)
echo ". /home/tjd/conda/etc/profile.d/conda.sh" >> ~/.bashrc
```

Close and reopen your terminal. You should now be able to run the `conda` command to activate the base environment:

```
# activate the ‘base' conda environment
conda activate base

# have conda update itself
conda update conda

# Prevent conda from 'stacking' environments; allow only one active env at a time:
# [Later in 2018 (conda 4.6) this will be the default, and this command will no longer work or be needed]
conda config --set max_shlvl 1
```

To create and activate a new conda environment:

```
conda create -n myenv1
conda activate myenv1
```

For more documentation of the conda install process, refer to the [conda docs](https://conda.io/docs/user-guide/install/index.html).
