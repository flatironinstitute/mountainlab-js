[![Build Status](https://travis-ci.org/flatironinstitute/mountainlab-js.svg?branch=master)](https://travis-ci.org/flatironinstitute/mountainlab-js)

# MountainLab

MountainLab is data processing, sharing and visualization software for scientists. It was built to support MountainSort, spike sorting software, but is designed to be much more generally applicable.

# Credits and acknowledgements

The framework was conceived by and primarily implemented by Jeremy Magland at the Flatiron Institute and is released under the Apache license v2.

The project is currently being developed and maintained by:

* Jeremy Magland
* Tom Davidson
* Alex Morley
* Witold Wysota

Other key collaborators include folks at Flatiron Institute, including Alex Barnett, Dylan Simon, Leslie Greengard, Joakim Anden, and James Jun.

Jason Chung, Loren Frank, Leslie Greengard and Alex Barnett are direct collaborators in our spike sorting efforts and have therefore contributed to MountainLab, which has a broader scope. Other MountainSort users have contributed invaluable feedback, particularly investigators at UCSF (Mari Sosa has contributed code to the project).

MountainLab will also play a central role in the implementation of a website for comparing spike sorting algorithms on a standard set of ground-truth datasets. Alex Barnett, Jeremy Magland, and James Jun are leading this effort, but it is a community project, and we hope to have a lot of involvement from other players in the field of electrophysiology and spike sorting.

Alex Morley has a project and vision for applying continuous integration principles to research which will most likely use MountainLab as a core part of its implementation.

(If I have neglected to acknowledge your contribution, please remind me.)

## Installation

Mountainlab and associated plugins and helper code are available for Linux and MacOS. At some point, this may run on Windows.

If you are an end user of the software, it is recommended to follow the instructions below to install Mountainlab using [Conda](https://conda.io), an open-source, cross-platform, multi-language package manager. If you already use conda (e.g. if you use the Anaconda python distribution), you can skip to step 2.

If you are a developer, or just want to hack on the latest versions of the code, please see [Developer install instructions](./docs/docs_editable/developer_install_instructions.md)

Note: If you have a prior (non-js) version of MountainLab installed, then you may want to uninstall it for sanity's sake (either via `apt-get remove` or by removing the mountainlab binaries from your path), although it is possible for them to co-exist since the command-line utilities have different names. Note that the processor plugin libraries work equally well and simultaneously with both (we have *not* changed the .mp spec system). The default package search path has changed, though, so you will need to copy or link your processor packages to the new location (see below).

### Step 1: Install Conda

Conda manages software dependencies across multiple programming languages (like 'apt' on Ubuntu, or 'homebrew' on Mac), and installs software into isolated 'environments' (like 'virtualenv' for Python). MountainLab packages are available for Linux and MacOS; apart from the first download step, the instructions are identical for these two operating systems.

<details>
<summary>
<i>Click to expand conda install instructions </i>
</summary>

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

For more documentation of the conda install process, refer to the [conda docs](https://conda.io/docs/user-guide/install/index.html).

</details>



### Step 2: Install MountainLab, Mountainsort plugins, and all dependencies

```
# create a new conda environment and switch to it:
conda create -n mlab
conda activate mlab

# install mountainsort (includes mountainlab, ml_ephys, ml_ms4alg, ml_ms3, isosplit5, and other dependencies)
conda install -n mlab -c flatiron mountainsort

# You can also install mountainlab-js on its own with:
conda install -n mlab -c flatiron mountainlab
```

### Step 3: Test and configure your Installation

Test the installation by running
```
ml-config
```
The output of this command will explain how to configure MountainLab on your system (it simply involves setting environment variables by editing a .env file). Further information is provided below.

Note that, when installed using conda, MountainLab will default to searching a configuration directory within the current conda env (in this case: `~/conda/envs/mlab/etc/mountainlab/`; more generally, it will be at `$CONDA_PREFIX/etc/mountainlab`). It will *not* search `~/.mountainlab/` by default. Conda will also install all processor plugins in the `packages` subdirectory at that location. This isolation allows users to switch between multiple independent installs of different versions of MountainLab.


Further test the installation by running
```
ml-list-processors
```

This should list the names of all the available processors. If you only installed `mountainlab`, then it will be just the very few system processors that are distributed with MountainLab. If you installed `mountainsort`, you should see processors in the list beginning with `ml_epyhs` and `ml_ms4alg`, among others.

### Step 4: Configuration

As you will learn from running the ```ml-config``` command, MountainLab can be configured by setting environment variables. Ideally these should should be specified in the `$CONDA_PREFIX/etc/mountainlab/mountainlab.env` file, but those values can also be overridden by setting the variables by command-line in the terminal. You can always check whether these have been successfully set for the current instance of MountainLab by running `ml-config` after making changes.

The following are some of the configuration variables (they each have a default value if left empty):
* `ML_TEMPORARY_DIRECTORY` -- the location where temporary data files are stored (default: /tmp/mountainlab-tmp)
* `ML_PACKAGE_SEARCH_DIRECTORY` -- the primary location for ML processing packages (default: $CONDA_PREFIX/etc/mountainlab/packages)
* `ML_ADDITIONAL_PACKAGE_SEARCH_DIRECTORIES` -- optional additional directories to search for packages (colon separated list)
* `ML_ADDITIONAL_PRV_SEARCH_DIRECTORIES` -- optional additional directories to search for files pointed to by .prv objects

### Step 5: Install additional programs

If you are doing spike sorting, then you will also want to install the following for visualization:

[ephys-viz](https://github.com/flatironinstitute/ephys-viz) - Widgets for visualization of electrophysiology experiments and the results of spike sorting.

Install ephys-viz with:
```
conda install -n mlab -c flatiron ephys-viz
```

As ephys-viz is currently being developed, it does not yet have nearly as much functionality as our previous viewer (mountainview). Therefore, you will probably also want to install the newly packaged version of this GUI called [qt-mountainview](https://github.com/flatironinstitute/qt-mountainview), which is designed to be compatible with mountainlab-js. Ultimately, as we continue to develop ephys-viz, our user interfaces will no longer be Qt-dependent and will all run on both the desktop and in a web browser.

Install qt-mountainview with:
```
conda install -n mlab -c flatiron qt-mountainview
```


## Command reference

The following commands are available from any terminal. Use the `--help` flag on any of these to get more detailed information.
* `ml-config`  Show the current configuration (i.e., environment variables)
* `ml-exec-process`  Run a processor job without involving the process cache for completed processes
* `ml-exec-script` Run a processing script (.ml file) in exec mode
* `ml-lari-start`  Start a lari server, making your local machine a processing server
* `ml-list-processors`  List all registered processors on the local machine
* `ml-prv-create`  Create a new .prv file based on an existing data file (computes the sha1sum, etc)
* `ml-prv-locate`  Locate a file on the local machine (or remotely) based on a .prv file
* `ml-prv-sha1sum`  Compute the sha1sum of a data file (uses a cache for efficiency)
* `ml-prv-stat`  Compute the prv object for a data file (uses a cache for efficiency)
* `ml-queue-process`  Queue a processor job for running when resources become available
* `ml-queue-script` Run a processing script (.ml file) in queue mode
* `ml-run-process`  Run a processor job
* `ml-run-script` Run a processing script (.ml file) in run mode
* `ml-spec`  Retrieve the spec object for a particular registered processor
* `mls-spec` Show the spec for a processing script (.ml file)

## Installing processor packages

MountainLab only ships with a few system processors (source is located in mountainlab-js/system-packages). To install additional processor packages, clone package repositories into the $CONDA_PREFIX/etc/mountainlab/packages directory (or other configured package search directories). For example, see above for instructions on installing some packages recommended to get started.

MountainLab will recursively search in these locations to find `.mp` files with executable permissions. Each such file provides the spec information for a list of registered processors (see section on creating custom processor packages), and will be included in the output of `ml-list-processors`.

## A note about using previous versions of MountainSort with MountainLab-js

The previous version of MountainSort ("Mountainsort 3") is compatible with this new implementation of MountainLab. That's because it has .mp files that conform to the same specification.

These processors are included in the `ml_ms3` conda package, which is included by default when you install the `mountainsort` conda package; the processors are available with the prefix `ms3`. 

To create your own processor packages, see the section on that topic below.

## Running processor jobs from the command-line

Processors can either be run directly on the command-line, or using a Python script (see github.com/mountainsort_examples) for an example Python pipeline.

The command-line syntax (slightly different from the previous version of MountainLab) is:
```
ml-run-process <processors-name> --inputs [key:value input files] --outputs [key:value output files] --parameters [key:value parameters]
```
The options --inputs, --outputs, and --parameters may be abbreviates -i, -o, and -p, respectively. For example, to run a bandpass filter:
```
ml-run-process ephys.bandpass_filter --inputs timeseries:raw.mda --outputs timeseries_out:filt.mda --parameters samplerate:30000 --freq_min:300 --freq_max:6000
```
Note that .prv files can be substituted for both inputs or outputs. In such a case, where an input file has a .prv extension, MountainLab will search the local machine for the corresponding data file and substitute that in before running the processor (see the `ml-prv-locate` command). In the case that one of the *output* files has a .prv extension, MountainLab will store the output in a temporary file (in `ML_TEMPORARY_DIRECTORY`) and then create a corresponding .prv file in the output location specified in the command (see the `ml-prv-create` command).

Thus one can do command-line processing purely using .prv files, as in the following example of creating a synthetic electrophysiology dataset (which requires the ml_ephys processor library to be installed):
```
ml-run-process ephys.synthesize_random_waveforms --outputs waveforms_out:data/waveforms_true.mda.prv geometry_out:data/geom.csv --parameters upsamplefac:13 M:4
ml-run-process ephys.synthesize_random_firings --outputs firings_out:data/firings_true.mda.prv --parameters duration:600
ml-run-process ephys.synthesize_timeseries --inputs firings:data/firings_true.mda.prv waveforms:data/waveforms_true.mda.prv --outputs timeseries_out:data/raw.mda.prv --parameters duration:600 waveform_upsamplefac:13
```

All files will be stored in temporary locations, which can be retrieved using the `ml-prv-locate` command as follows:
```
ml-prv-locate raw_synth.mda.prv 
/tmp/mountainlab-tmp/output_184a04c2877517f8996fd992b6f923bee8c6bbd2_timeseries_out
```

In place of `ml-run-process`, you may substitute `ml-exec-process` to bypass the process caching system, or `ml-queue-process` to have MountainLab wait for resources to be available before execution.

## Examples

Some spike sorting examples can be found at https://github.com/flatironinstitute/mountainsort_examples and in the examples/spike_sorting directory. There should be one subdirectory per example, with a readme.md file for each.


## Custom processor libraries

Here is a list of user-contributed processor packages that we know of.
You may git clone each of these into a working directory, then link them to your MountainLab packages directory (typically `$CONDA_PREFIX/etc/mountainlab/packages`; or run `ml-config` to find this location)

* **Identity processors**
A set of "hello world" processors, to show how to make a simple processor and do file I/O.
  - [`ml_identity`](https://github.com/alexmorley/ml_identity):
  Python version, by Alex Morley.
  - [`ml_identity_matlab`](https://github.com/tsgouvea/ml_identity_matlab):
  Matlab version, by Thiago Gouvea.

* [`ddms`](https://github.com/alexmorley/ddms):
Tools for converting to/from neurosuite format, by Alex Morley.

* [`ironclust`](https://github.com/jamesjun/ironclust):
CPU-only octave implementation of [JRCLUST](https://github.com/JaneliaSciComp/JRCLUST/wiki) algorithm, wrapped as a processor, by James Jun.

* Loren Frank's lab processors:

  - [`franklab_msdrift`](https://bitbucket.org/franklab/franklab_msdrift):
  Modified drift processors that compare both neighbor and non-neighbor epochs for drift tracking, by Mari Sosa.

  - [`franklab_mstaggedcuration`](https://bitbucket.org/franklab/franklab_mstaggedcuration): Tagged curation processors that preserve "rejected" clusters for accurate metrics recalculation, by Anna Gillespie.  


You can also create your own MountainLab processor libraries using any language (python, C/C++, matlab, etc). Processor libraries are simply represented by executable .mp files that provide the specifications (spec) for a collection of processors together with command strings telling MountainLab how to execute those processors using system calls. For details, see the above `ml_identity` processors, and 
[creating custom processor libraries](docs/docs_editable/creating_custom_processor_libraries.md)

## Using processing scripts (.ml files)

Since processors can be run individually using system calls, processing pipelines may be formed in many different ways, including bash scripts. However, the preferred way is to use the JavaScript system built in to MountainLab. This allows scripts to be portable and more secure. MountainLab processing scripts can either be run from the command-line or from within a web browser, and can execute jobs on the local machine or on a remote server. Detailed documentation can be found in [processing scripts](docs/docs_editable/processing_scripts.md).

## Related Projects / Components
[KBucket](https://github.com/flatironinstitute/kbucket) & [kbclient](https://github.com/magland/kbclient) - Distributed Data Access  
[MountainView](https://github.com/flatironinstitute/qt-mountainview) & [EPhys-Viz](https://github.com/flatironinstitute/ephys-viz) (WIP) - Visualisation  
[MountainLab PyTools](https://github.com/magland/mountainlab_pytools) - Python Tools  
