[![Build Status](https://travis-ci.org/flatironinstitute/mountainlab-js.svg?branch=master)](https://travis-ci.org/flatironinstitute/mountainlab-js)

# MountainLab

MountainLab is data processing, sharing and visualization software for scientists. It was built to support MountainSort, spike sorting software, but is designed to be more generally applicable.

## Spike Sorting

This page documents MountainLab only. If you would like to use MountainSort spike sorting software, then please [follow this link](https://github.com/flatironinstitute/mountainsort_examples/blob/master/README.md) for installation and usage instructions.

## Installation

MountainLab and associated plugins and helper code are available for Linux and MacOS. At some point, this may run on Windows.

The easiest way to install MountainLab is using conda:

```
conda install -c flatiron -c conda-forge mountainlab mountainlab_pytools
```

You should regularly update the installation via:

```
conda install -c flatiron -c conda-forge mountainlab mountainlab_pytools
```

If you are not familiar with conda or do not have it installed, then you should read [this conda guide](docs/conda.md).

## Alternative installation

Alternatively you can install MountainLab using npm (you must first install a [recent version of NodeJS](docs/nodejs.md))

```
npm install -g mountainlab
```

and mountainlab_pytools can be installed using pip (use python 3.6 or later)

```
pip install mountainlab_pytools
```

## Developer installation

Developers should install MountainLab and mountainlab_pytools from source

```
git clone [this-repo]
cd [this-repo-name]
npm install .
```

Then add `[this-repo-name]/bin` to your `PATH` environment variable.

See the [mountainlab_pytools repository](https://github.com/magland/mountainlab_pytools) for information on installing that package from source.

## A note about prior versions of MountainLab

If you have a prior (non-js) version of MountainLab installed, then you may want to uninstall it for sanity's sake (either via `apt-get remove` or by removing the mountainlab binaries from your path), although it is possible for them to co-exist since the command-line utilities have different names. Note that the processor plugin libraries work equally well and simultaneously with both (we have *not* changed the .mp spec system). The default package search path has changed, though, so you will need to copy or link your processor packages to the new location (see below).

## Test and configure your Installation

Test the installation by running
```
ml-config
```
The output of this command will explain how to configure MountainLab on your system (it simply involves setting environment variables by editing a .env file).

Note that, when installed using conda, MountainLab will default to searching a configuration directory within the current conda env. Otherwise, the default location will be be in `~/.mountainlab`. You can always determine this location by running `ml-config`.

Further test the installation by running
```
ml-list-processors
```

This should list the names of all the available processors. If you have not yet installed any processor packages, then it will just list a single `hello.world` processor distributed with MountainLab. To see the specification for this processor in human-readable format, enter
```
ml-spec hello.world -p
```

This will show the inputs, outputs, and parameters for this processor. Since it is a minimalist processor, it doesn't have any of these, so the output of this command will be very unexciting.

## Processors

MountainLab is not useful if it can't do more than `hello.world`. The main functionality of MountainLab is to wrap well-defined, deterministic compute operations into processors. Each processor has a specification which defines the inputs, outputs, and parameters that the processor operates on, and can encapsulate programs written in any language.

In order to run a processor it must either be installed or available in a Singularity container.

## Installing processors

The easiest way to install a MountainLab processor package is using conda. For example, the `ml_ephys` package contains processors that are useful for electrophysiology and spike sorting. It can be installed via:

```
conda install -c flatiron -c conda-forge ml_ephys
```

Assuming that the conda package is configured properly, this will make a symbolic link in a `packages/` directory within the current conda environment. To verify that it was installed properly, try `ml-list-processors` once again. This time, in addition to `hello.world`, you should see a collection of processors that start with the `ephys.` prefix. Now we can get something more useful from `ml-spec`:

```
ml-spec ephys.bandpass_filter -p
```

Alternatively, if you are not using conda, or if a MountainLab package is not available in conda, then you can control which processor packages are registered by manually creating symbolic links to the `packages/` directory as follows:

```
pip install ml_ephys
ml-link-python-module ml_ephys `ml-config package_directory`/ml_ephys
```

Here, `ml-link-python-module` is a convenience command distributed with MountainLab that creates symbolic links based on installed python modules. The `ml-config package_directory` command returns the directory where MountainLab looks for processor packages.

Developers of processor packages should use the following method for installing packages from source

```
git clone https://github.com/magland/ml_ephys
ln -s ml_ephys `ml-config package_directory`/ml_ephys
```

Note that in this last case, you should make sure that all python dependencies of `ml_ephys` are installed.

In general, MountainLab finds registered processors by recursively searching the packages directory for any executable files with a `.mp` extension. More details on creating plugin processor packages can be found elsewhere in the documentation.

## Running processors

Once installed, processors can either be run directly on the command-line (as shown in this section), or by using a Python script (see github.com/mountainsort_examples for an example Python pipelines).

From the command-line (or within a bash script) processors jobs can be executed by issuing the `ml-run-process` command:

```
ml-run-process [processor_name] \
    --inputs \
        [ikey1]:[ifile1] \
        [ikey2]:[ifile2] \
        ... 
    --outputs \
        [okey1]:[ofile1] \
        ... 
    --parameters \
        [pkey1]:[pval1] \
        ... 
    [other options]
```

(Note that `-i`, `-o`, and `-p` can be used in place of `--inputs`, `--outputs`, and `--parameters`)

For example, to run the `hello.world` processor:

```
ml-run-process hello.world
```

MountainLab maintains a database/cache of all of the processor jobs that have executed. If the same processor command is issued at a later time, with the same input files, output files, and parameters, then the system recognizes this and does not actually run the job. To force it to re-execute, use the `--force_run` flag as follows:

```
ml-run-process hello.world --force_run
```

To get help on other options of `ml-run-process`, use the following or look elsewhere in the documentation

```
ml-run-process --help
```

Non-hello-world examples can be found in the [MountainSort examples repository](https://github.com/flatironinstitute/mountainsort_examples/blob/master/README.md)


## Configuration

As you will learn from running the ```ml-config``` command, MountainLab can be configured by setting environment variables. Ideally these should should be specified in the `mountainlab.env` file (see the output `ml-config` to determine its location), but those values can also be overridden by setting the variables by command-line in the terminal. You can always check whether these have been successfully set for the current instance of MountainLab by running `ml-config` after making changes.

The following are some of the configuration variables (they each have a default value if left empty):
* `ML_TEMPORARY_DIRECTORY` -- the location where temporary data files are stored (default: /tmp/mountainlab-tmp)
* `ML_PACKAGE_SEARCH_DIRECTORY` -- the primary location for ML processing packages
* `ML_ADDITIONAL_PACKAGE_SEARCH_DIRECTORIES` -- optional additional directories to search for packages (colon separated list)
* `ML_ADDITIONAL_PRV_SEARCH_DIRECTORIES` -- optional additional directories to search for files pointed to by .prv objects

## Command reference

The following commands are available from any terminal. Use the `--help` flag on any of these to get more detailed information.
* `mda-info`  Get information about a .mda file
* `ml-config`  Show the current configuration (i.e., environment variables)
* `ml-exec-process`  Run a processor job without involving the process cache for completed processes
* `ml-link-python-module` Register a processor package from an installed python module, as described above
* `ml-list-processors`  List all registered processors on the local machine
* `ml-prv-create`  Create a new .prv file based on an existing data file (computes the sha1sum, etc)
* `ml-prv-download`  Download a file corresponding to a .prv file or object
* `ml-prv-locate`  Locate a file on the local machine (or remotely) based on a .prv file
* `ml-prv-sha1sum`  Compute the sha1sum of a data file (uses a cache for efficiency)
* `ml-prv-stat`  Compute the prv object for a data file (uses a cache for efficiency)
* `ml-read-dir`  Read a directory, which could be a kbucket path, returning a JSON object
* `ml-run-process`  Run a processor job
* `ml-spec`  Retrieve the spec object for a particular registered processor

## PRV files

**This section needs to be expanded and corrected. Right now it does not explain what a PRV file is.**

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

## Custom processor libraries

Here is a list of user-contributed processor packages that we know of.
You may git clone each of these into a working directory, then link them to your MountainLab packages directory as above.

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


## Credits and acknowledgements

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

## Related Projects / Components

[KBucket](https://github.com/flatironinstitute/kbucket) & [kbclient](https://github.com/magland/kbclient) - Distributed Data Access  
[MountainView](https://github.com/flatironinstitute/qt-mountainview) & [EPhys-Viz](https://github.com/flatironinstitute/ephys-viz) (WIP) - Visualisation  
[MountainLab PyTools](https://github.com/magland/mountainlab_pytools) - Python Tools  
