# MountainLab (JavaScript implementation)

MountainLab is data processing, sharing and visualization software for scientists. It is built around MountainSort, spike sorting software, but is designed to be much more generally applicable.

# Credits and acknowledgements

The framework was conceived by and primarily implemented by Jeremy Magland at the Flatiron Institute and is released under the Apache license v2.

The web infrastructure is currently under development by Jeremy Magland and Alex Morley.

Other key collaborators include members of the numerical algorithms group at Flatiron Institute, including Alex Barnett (group leader), Leslie Greengard, Joakim Anden, Witold Wysota, and James Jun. Dylan Simon has contributed to the web infrastructure.

Jason Chung, Loren Frank, Leslie Greengard and Alex Barnett are direct collaborators in our spike sorting efforts and have therefore contributed to MountainLab, which has a broader scope. Other MountainSort users have contributed invaluable feedback, particularly investigators at UCSF (Mari Sosa has contributed code to the project).

MountainLab will also play a central role in the implementation of a website for comparing spike sorting algorithms on a standard set of ground-truth datasets. Alex Barnett, Jeremy Magland, and James Jun are leading this effort, but it is a community project, and we hope to have a lot of involvement from other players in the field of electrophysiology and spike sorting.

Alex Morley has a project and vision for applying continuous integration principles to research which will most likely use MountainLab as a core part of its implementation.

(If I have neglected to acknowledge your contribution, please remind me.)

## Installation

Using Linux is highly recommended. We expect this to work on Mac OSX as well, but have not yet tested it. At some point, this may run on windows.

Note: If you have a prior version of MountainLab installed, then you may want to uninstall it for sanity's sake (either via apt-get remove or by removing mountainlab/bin from your path), although it is possible for them to co-exist since the command-line utilities have different names. Note that the processor plugin libraries work equally well and simultaneously with both (we have *not* changed the .mp spec system, see below).


### Step 1: Install the prerequisites

* NodeJS -- you must use a recent version. [Details.](./docs/prerequisites.md)
* MongoDB -- [Details.](./docs/prerequisites.md)
* Python 3 with pip -- optional but required for most plugin packages. [Details.](./docs/prerequisites.md)

### Step 2: Clone this repository and install using npm (node package manager)


Open a terminal, ```cd``` to an installation folder, and then run:

```
git clone https://github.com/flatironinstitute/mountainlab-js
cd mountainlab-js
npm install
```
Then, add "mountainlab-js/bin" to your PATH variable. This can be done by adding the following line to your ~/.bashrc file and then opening a new terminal:

```
export PATH=[your/path/to]/mountainlab-js/bin:$PATH
```

Test the installation by running
```
ml-config
```

The output of this command will explain how to configure MountainLab on your system (it simply involves setting environment variables by editing a .env file). Further information is provided below.

Further test the installation by running
```
ml-list-processors
```

This should list the names of the system processors that are distributed with MountainLab-js


### Step 3: Install plugin processor libraries

Note: the following plugin processor libraries require python 3 and pip to be installed (see above).

Create the following folder:

```
mkdir -p ~/.mountainlab/packages
```

This is the default location for plugin processor libraries (see the output of the ml-config command).

It is recommend that you use a python virtualenv for what follows. [Details.](./docs/prerequisites.md).

To get started with the examples, clone and install the following two packages. The first is for generic utilities for working with electrophysiology datasets. The second is our spike sorting algorithm, MountainSort v4.

```
cd ~/.mountainlab/packages
git clone https://github.com/magland/ml_ephys
cd ml_ephys
pip3 install --upgrade -r requirements.txt
```

```
cd ~/.mountainlab/packages
git clone https://github.com/magland/ml_ms4alg
cd ml_ms4alg
pip3 install --upgrade -r requirements.txt
```

Now test that the new processors have been installed:

```
ml-list-processors
```

### Step 4: Configuration

As you will learn from running the ```ml-config``` command, MountainLab can be configured by setting environment variables. Ideally these should should be specified in the ~/.mountainlab/mountainlab.env file, but those values can also be overridden by setting the variables by command-line in the terminal.

The following are some of the configuration variables (they each have a default value if left empty):
* `ML_TEMPORARY_DIRECTORY` -- the location where temporary data files are stored (default: /tmp/mountainlab-tmp)
* `ML_PACKAGE_SEARCH_DIRECTORY` -- the primary location for ML processing packages (default: ~/.mountainlab/packages)
* `ML_ADDITIONAL_PACKAGE_SEARCH_DIRECTORIES` -- optional additional directories to search for packages (colon separated list)
* `ML_ADDITIONAL_PRV_SEARCH_DIRECTORIES` -- optional additional directories to search for files pointed to by .prv objects

## Command reference

The following commands are available from any terminal. Use the `--help` flag on any of these to get more detailed information.
* `ml-config`  Show the current configuration (i.e., environment variables)
* `ml-exec-process`  Run a processor job without involving the process cache for completed processes
* `ml-lari-start`  Start a lari server, making your local machine a processing server
* `ml-list-processors`  List all registered processors on the local machine
* `ml-prv-create`  Create a new .prv file based on an existing data file (computes the sha1sum, etc)
* `ml-prv-locate`  Locate a file on the local machine based on a .prv file
* `ml-prv-sha1sum`  Compute the sha1sum of a data file (uses a cache for efficiency)
* `ml-prv-stat`  Compute the prv object for a data file (uses a cache for efficiency)
* `ml-queue-process`  Queue a processor job for running when resources become available
* `ml-run-process`  Run a processor job
* `ml-spec`  Retrieve the spec object for a particular registered processor
* `mls-run` Run a processing script (.ml file)
* `mls-spec` Show the spec for a processing script (.ml file)

## Installing processor packages

MountainLab only ships with a few system processors, found in mountainlab-js/system-packages. To install additional processor packages, clone package repositories into the ~/.mountainlab/packages directory (or other configured directories). For example, see above for instructions on installing some packages recommended to get started.

MountainLab will recursively search in these locations to find `.mp` files with executable permissions. Each such file provides the spec information for a list of registered processors (see section on creating custom processor packages).

## A note about using previous versions of MountainSort with MountainLab-js

The previous version of MountainSort is compatible with this new implementation of MountainLab. That's because it has .mp files that conform to the same specification.

To use the MountainSort processor package, either install it from source within the `~/.mountainlab/packages` directory, or install it using the Ubuntu package. In the latter case you must add the following line to `~/.mountainlab/mountainlab.env`:
```
ML_ADDITIONAL_PACKAGE_SEARCH_DIRECTORIES=/opt/mountainlab/packages
```
As suggested by the name, this tells MountainLab to also search in the `/opt/mountainlab/packages` for installed processing packages. This is the system location used in the Ubuntu package of MountainSort.

To create your own processor packages, see the section on that topic below.

## Running processor jobs from the command-line

Processors can either be run directly on the command-line, or indirectly through a processing script on MLStudy.
The command-line syntax (slightly different from the previous version of MountainLab) is:
```
ml-run-process <processors-name> --inputs [key:value input files] --outputs [key:value output files] --parameters [key:value parameters]
```
The options --inputs, --outputs, and --parameters may be abbreviates -i, -o, and -p, respectively. For example, to run a bandpass filter:
```
ml-run-process ephys.bandpass_filter --inputs timeseries:raw.mda --outputs timeseries_out:filt.mda --parameters samplerate:30000 --freq_min:300 --freq_max:6000
```
Note that .prv files can be substituted for both inputs or outputs. In such a case, where an input file has a .prv extension, MountainLab will search the local machine for the corresponding data file and substitute that in before running the processor (see the `ml-prv-locate` command). In the case that one of the *output* files has a .prv extension, MountainLab will store the output in a temporary file (in `ML_TEMPORARY_DIRECTORY`) and then create a corresponding .prv file in the output location specified in the command (see the `ml-prv-create` command).

Thus one can do command-line processing purely using .prv files, as in the following example of creating a synthetic electrophysiology dataset:
```
ml-run-process ephys.synthesize_random_waveforms --outputs waveforms_out:waveforms.mda.prv
ml-run-process ephys.synthesize_random_firings --outputs firings_out:firings.mda.prv --parameters duration:60
ml-run-process ephys.synthesize_timeseries --inputs firings:firings.mda.prv waveforms:waveforms.mda.prv --outputs timeseries_out:raw_synth.mda.prv --parameters duration:60
```

All files will be stored in temporary locations, which can be retrieved using the `ml-prv-locate` command as follows:
```
ml-prv-locate raw_synth.mda.prv 
/tmp/mountainlab-tmp/output_184a04c2877517f8996fd992b6f923bee8c6bbd2_timeseries_out
```

In place of `ml-run-process`, you may substitute `ml-exec-process` to bypass the process caching system, or `ml-queue-process` to have MountainLab wait for resources to be available before execution.

## Creating custom processor libraries

As mentioned above, you can create your own MountainLab processor libraries using any language (python, C/C++, matlab, etc). Processor libraries are simply represented by executable .mp files that provide the specifications (spec) for a collection of processors together with command strings telling MountainLab how to execute those processors using system calls. For details, see [creating custom processor libraries](docs/creating_custom_processor_libraries.md)

## Using processing scripts (.ml files)

Since processors can be run individually using system calls, processing pipelines may be formed in many different ways, including bash scripts. However, the preferred way is to use the JavaScript system built in to MountainLab. This allows scripts to be portable and more secure. MountainLab processing scripts can either be run from the command-line or from within a web browser, and can execute jobs on the local machine or on a remote server. Detailed documentation can be found in [processing scripts](docs/processing_scripts.md).
