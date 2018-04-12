# MountainLab (JavaScript implementation)

MountainLab is data processing, sharing and visualization software for scientists. It is built around MountainSort, spike sorting software, but is designed to be much more generally applicable.

# Credits and acknowledgements

The framework was conceived by and primarily implemented by Jeremy Magland at the Flatiron Institute and is released under the Apache license v2.

The web infrastructure is currently under development by Jeremy Magland and Alex Morley.

Other key collaborators include members of the numerical algorithms group at Flatiron Institute, including Alex Barnett (group leader), Leslie Greengard, Joakim Anden, Witold Wysota, and James Jun. Dylan Simon has contributed to the web infrastructure.

Jason Chung, Loren Frank, Leslie Greengard and Alex Barnett are direct collaborators in our spike sorting efforts and have therefore contributed to MountainLab, which has a broader scope. Other MountainSort users have contributed invaluable feedback, particularly investigators at UCSF (Mari Sosa has contributed code to the project).

MountainLab will also play a central role in the implementation of a website for comparing spike sorting algorithms on a standard set of ground-truth datasets. Alex Barnett, Jeremy Magland, and James Jun are leading this effort, but it is a community project, and we hope to have a lot of involvement from other players in the field of electrophysiology and spike sorting.

Alex Morley has a project and vision for continuous integration science which will most likely use MountainLab as a core part of its implementation.

(If I have neglected to acknowledge your contribution, please remind me.)

## Quick installation for the impatient or adventurous

Use linux and install NodeJS (recent version), npm (node package manager), and MongoDB

```
git clone https://github.com/flatironinstitute/mountainlab-js
cd mountainlab-js
npm install
```
Then, add "mountainlab-js/bin" to your PATH variable.

Test the installation by running
```
ml-config
```

The output of this command will explain how to configure MountainLab on your system (it simply involves setting environment variables by editing a .env file).

If everything is good, skip down to start learning about how to use MountainLab. It is primarily a command-line tool.


## Detailed installation instructions

Note: If you have a prior version of MountainLab installed, then you may want to uninstall it for sanity's sake (either via apt-get remove or by removing mountainlab/bin from your path), although it is possible for them to co-exist since the command-line utilities have different names. Note that the processor plugin libraries work equally well and simultaneously with both (we have not changed the .mp spec system, see below).

### Installation outline

Step 1. Install the prerequisites

Step 2. Clone the repo and build via npm

Step 3. Configure


### Step 1: Install prerequisites
NodeJS (recent version), npm (node package manager), mongodb

For example, on Ubuntu 16.04
```
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install nodejs
sudo apt-get install npm
sudo apt-get install mongodb
```

Note that the curl command is important to get you a recent version of NodeJS (that's a fast moving project, and IMO really good).

When you install MongoDB, you will get a database daemon running on the default port of 27017. You might want to make sure that port is not exposed to the outside world (usually it wouldn't be I think).

MountainLab uses the MongoDB database for caching processor jobs that have already run, keeping track of file hashes, and managing processor job queues.


### Steps 2 and 3: Clone, install and configure

Read the quick installation instructions above to clone the mountainlab-js repo and install it using npm. You will also learn how to test and configure MountainLab.

To add "mountainlab-js/bin" to your PATH variable, you might add the following line at the end of your .bashrc file (and then open a new terminal)
```
export PATH=[your/path/to]/mountainlab-js/bin:$PATH
```
As you will learn from running the ```ml-config``` command, MountainLab should be configured by setting environment variables. Ideally these should should be specified in the ~/.mountainlab/mountainlab.env file.
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

MountainLab only ships with a few system processors, found in mountainlab-js/system-packages. To install additional processor packages, clone package repositories into the ~/.mountainlab/packages directory (or other configured directories). MountainLab will recursively search in these locations to find `.mp` files with executable permissions. Each such file provides the spec information for a list of registered processors (see section on creating custom processor packages).

To use the MountainSort processor package, either install it from source within the `~/.mountainlab/packages` directory, or install it using the Ubuntu package and then add the following line to `~/.mountainlab/mountainlab.env`:
```
ML_ADDITIONAL_PACKAGE_SEARCH_DIRECTORIES=/opt/mountainlab/packages
```
As suggested by the name, this tells MountainLab to also search in the `/opt/mountainlab/packages` for installed processing packages. This is the system location used in the Ubuntu package of MountainSort.

To create your own processor packages, see the section on that topic below.

## Running processor jobs from the command-line

Processors can either be run directly on the command-line, or indirectly through a processing script on MLStudy.
The command-line syntax (slightly different from the previous version of mountainlab) is:
```
ml-run-process <processors-name> --inputs [key:value input files] --outputs [key:value output files] --parameters [key:value parameters]
```
The options --inputs, --outputs, and --parameters may be abbreviates -i, -o, and -p, respectively. For example, to run a bandpass filter:
```
ml-run-process ms3.bandpass_filter --inputs timeseries:raw.mda --outputs timeseries_out:filt.mda --parameters samplerate:30000 --freq_min:300 --freq_max:6000
```
Note that .prv files can be substituted for both inputs or outputs. In such a case, where an input file has a .prv extension, MountainLab will search the local machine for the corresponding data file and substitute that in before running the processor (see the `ml-prv-locate` command). In the case that one of the *output* files has a .prv extension, MountainLab will store the output in a temporary file (in `ML_TEMPORARY_DIRECTORY`) and then  create a corresponding .prv file in the output location specified in the command (see the `ml-prv-create` command).

Thus one can do command-line processing purely using .prv files, as in the following example of creating a synthetic electrophysiology dataset:
```
ml-run-process pyms.synthesize_random_waveforms --outputs waveforms_out:waveforms.mda.prv
ml-run-process pyms.synthesize_random_firings --outputs firings_out:firings.mda.prv --parameters duration:60
pyms.synthesize_timeseries --inputs firings:firings.mda.prv waveforms:waveforms.mda.prv --outputs timeseries_out:raw_synth.mda.prv --parameters duration:60
```

All files will be stored in temporary locations, which can be retrieved using the `prv-locate` command as follows:
```
> ml-prv-locate raw_synth.mda.prv 
/tmp/mountainlab-tmp/output_184a04c2877517f8996fd992b6f923bee8c6bbd2_timeseries_out
```

In place of `ml-run-process`, you may substitute `ml-exec-process` to bypass the process caching system, or `ml-queue-process` to have MountainLab wait for resources to be available before execution.

## Creating custom processor libraries

As mentioned above, you can create your own MountainLab processor libraries using any language (python, C/C++, matlab, etc). Processor libraries are simply represented by executable .mp files that provide the specifications (spec) for a collection of processors together with command strings telling MountainLab how to execute those processors using system calls. For details, see [creating custom processor libraries](docs/creating_custom_processor_libraries.md)

## Using processing scripts (.ml files)

Since processors can be run individually using system calls, processing pipelines may be formed in many different ways, including bash scripts. However, the preferred way is to use the JavaScript system built in to MountainLab. This allows scripts to be portable and more secure. MountainLab processing scripts can either be run from the command-line or from within a web browser, and can execute jobs on the local machine or on a remote server. Detailed documentation can be found in [processing scripts](docs/processing_scripts.md).
