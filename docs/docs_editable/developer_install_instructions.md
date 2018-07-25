### Developer install instructions

Please refer to the [end-user install instructions](../../README.md) for information on the role of the various packages, and for configuration of the installed software.

MountainLab is developed as a modular suite of software components, which are written in a variety of languages: 
JavaScript (mountainlab-js, ephys-viz), Python (ml_ephys, ml_ms4alg, ...) and C++/Qt 
(qt-mountainview, ms3 processors). It is therefore necessary to work with a variety of tools to build a full
installation. (This mix of languages is part of the rationale for using Conda for end-user installs.)

### Step 1: Install the prerequisites

* NodeJS -- you must use a recent version. [Details.](./prerequisites.md)
* Python 3 with pip -- optional but required for most plugin packages. [Details.](./prerequisites.md)

### Step 2: Install using npm (node package manager)

Clone this repo, visit the top level directory (e.g. ~/Src/mountainlab-js), and run:

```
git clone https://github.com/flatironinstitute/mountainlab-js
cd mountainlab-js
npm install -g .
```

If it tries to install in your system directory and you are not an admin user, you should configure npm to put global installs in a different location.

This should download all dependencies to a new ./node_modules folder, and install the binaries onto your path.


Test the installation by running
```
ml-config
```

The output of this command will explain how to configure MountainLab on your system (it simply involves setting environment variables by editing a .env file). Further information is provided below.

Further test the installation by running
```
ml-list-processors
```

This should list the names of the very few system processors that are distributed with mountainlab-js.


### Step 3: Install plugin processor libraries

Note: the following plugin processor libraries require python 3 and pip to be installed (see above).

Create the following folder:

```
mkdir -p ~/.mountainlab/packages
```

This is the default location for plugin processor libraries (see the output of the ml-config command). You can also change this search location by setting an environment variable, as explained by the ml-config command.

It is recommend that you use a python virtualenv for what follows. [Details.](./prerequisites.md).

To get started with the examples, clone and install the following two packages. The first is for generic utilities for working with electrophysiology datasets. The second is our spike sorting algorithm, MountainSort v4.

For users following the recommended python installation (using apt-get)
```
git clone https://github.com/magland/ml_ephys
cd ml_ephys
pip3 install --upgrade .
cd ~/.mountainlab/packages
ml-link-python-module ml_ephys ml_ephys
```

```
git clone https://github.com/magland/ml_ms4alg
cd ml_ms4alg
pip3 install --upgrade .
cd ~/.mountainlab/packages
ml-link-python-module ml_ephys ml_ephys
```
Anaconda users should use `pip` instead of `pip3`.

Now test that the new processors have been installed:

```
ml-list-processors
```

### Step 4: Configuration

See the main README file for information on configuring your MountainLab install, using `ml-config` as a guide.

### Step 5: Install additional programs

If you are doing spike sorting, then you will also want to install the following for visualization:

[ephys-viz](https://github.com/flatironinstitute/ephys-viz) - Widgets for visualization of electrophysiology experiments and the results of spike sorting, written in JavaScript.

Clone this repo and install it just as with mountainlab-js, above:
```
git clone https://github.com/flatironinstitute/ephys-viz
cd mountainlab-js
npm install -g .
```
