# MountainLab (JavaScript implementation)

## Installation instructions

Note: If you have a prior version of MountainLab installed, then you should uninstall it (either via apt-get remove or by removing mountainlab/bin from your path)

### Installation outline:
Step 1. Install prerequisites

Step 2. Clone the repo and build via npm

Step 3. Configure

### Prerequisites:
nodejs (recent version), npm (node package manager), mongodb

For example, on Ubuntu 16.04
```
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install nodejs
sudo apt-get install npm
sudo apt-get install mongodb
```
### Clone the source repo and build

```
git clone https://github.com/flatironinstitute/mountainlab-js
cd mountainlab-js
npm install
```
Then, add "mountainlab-js/bin" to your PATH variable.
For example, you might add the following line at the end of your .bashrc file (and then open a new terminal)
```
export PATH=[your/path/to]/mountainlab-js/bin:$PATH
```

### Configuration
If the above PATH was set up properly then you should get configuration information by running
```
ml-config
```

MountainLab-js is configured by setting environment variables which ideally should be specified in the ~/.mountainlab/mountainlab.env file
The following are some of the configuration variables (they each have a default value if left empty):
* `ML_TEMPORARY_DIRECTORY` -- the location where temporary data files are stored (default: /tmp/mountainlab-tmp)
* `ML_PACKAGE_SEARCH_DIRECTORY` -- the primary location for ML processing packages (default: ~/.mountainlab/packages)
* `ML_ADDITIONAL_PACKAGE_SEARCH_DIRECTORIES` -- optional additional directories to search for packages (colon separated list)
* `ML_ADDITIONAL_PRV_SEARCH_DIRECTORIES` -- optional additional directories to search for files pointed to by .prv objects

### Command reference

The following commands are available from any terminal. Use the `--help` flag on any of these commands to get more detailed information.
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

## Installing processor packages

By default, only a few system processors are registered. Those can be found in mountainlab-js/system-packages. To install additional processor packages, clone package repositories into the ~/.mountainlab/packages directory (or other configured directories). MountainLab-js will recursively search in these locations to find `.mp` files with executable permissions. Each such file corresponds to a processor package and responds to the `spec` argument with JSON text output defining the list of processors associated with the package.

## Running processor jobs from the command-line
Processors can either be run directly on the command-line, or indirectly through a processing script on MLStudy.
The command-line syntax (slightly different from the previous version of mountainlab) is:
```
ml-run-process <processors-name> --inputs [key:value input files] --outputs [key:value output files] --parameters [key:value parameters]
```
For example, to run a bandpass filter:
```
ml-run-process ms3.bandpass_filter --inputs timeseries:raw.mda --outputs timeseries_out:filt.mda --parameters samplerate:30000 --freq_min:300 --freq_max:6000
```
Note that .prv files can be substituted for both inputs or outputs. In the case where an input file has a .prv extension, MountainLab will search the local machine for the corresponding data file and substitute that in before running the processor (see the `ml-prv-locate` command). In the case that one of the output files has a .prv extension, MountainLab will store the output in a temporary file (in `ML_TEMPORARY_DIRECTORY`) and then  create a corresponding .prv file in the output location specified in the command (see the `ml-prv-create` command).

Thus one can do command-line processing purely using .prv files, as in the following example of creating a synthetic electrophysiology dataset:
```
ml-run-process pyms.synthesize_random_waveforms --outputs waveforms_out:waveforms.mda.prv
ml-run-process pyms.synthesize_random_firings --outputs firings_out:firings.mda.prv --parameters duration:60
pyms.synthesize_timeseries --inputs firings:firings.mda.prv waveforms:waveforms.mda.prv --outputs timeseries_out:raw_synth.mda.prv --parameters duration:60
```
All files will be stored in a temporary locations, which can be retrieved using the `prv-locate` command as follows:
```
> ml-prv-locate raw_synth.mda.prv 
/tmp/mountainlab-tmp/output_184a04c2877517f8996fd992b6f923bee8c6bbd2_timeseries_out
```

