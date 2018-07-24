---
layout: page
title: Pre-requisites 
tagline: What you'll need to install first
permalink: docs/docs_editable/prerequisites/
---

# Installing prerequisites for MountainLab

## About Prerequisites:

### NodeJS/npm
NodeJS is a JavaScript runtime implementation. The JavaScript programming language (not to be confused with Java) is most well known for its use in web browsers. NodeJS makes it possible to also run JavaScript on servers and desktops. MountainLab-js is implemented in JavaScript and uses NodeJS as its runtime environment.

It is important that you install a recent version of NodeJS (it is a rapidly-evolving project). It is often not sufficient to simply use the default version installed by the operating system. Versions higher than 8 are generally working well.

[npm](npm.io) is node package management software (the `npm` command) and an online package repository (https://npm.io). npm is to nodejs as pip is to python.

### Python/Pip
While not required for the core program, most MountainLab processor packages use Python 3. Currently (July 2018) the end-user packages are built against Python 3.6, but Python 3.5 support would be easy to add if requested.

### C/C++ compilers, Qt
Some of the legacy plugins and GUI tools (in particular `qt-mountainview` and the `ml_ms3` processors from mountainsort 3) are written in C++, and rely on the [Qt](qt.io) cross-platform application framework. This code is no longer actively supported, but you may need or want to compile it under some circumstances.

_____
## Using system-level installs (Python, NodeJS, Qt, compilers,...), along with virtualenv

In a 'traditional' (non-Conda) install, nodejs and python are installed at the system level, and a virtualenv is used for isolation of the python environment during development.

### Installing NodeJS

On Ubuntu 16.04, use the following:
```
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install nodejs
```
For more information, visit [nodejs.org](https://nodejs.org).

### Installing Python 3 and pip

Install Python 3 and pip using your linux package manager. For example, on Ubuntu 16.04, use the following:

```
sudo apt-get install python3 python3-pip
```

We highly recommend using a virtualenv to manage your python packages (see below).

### Using a python virtualenv

Virtual environments (virtualenv) provide a tidy way to manage python packages, without messing with the system installation. To create a new virtualenv:

```
pip3 install virtualenv
```
Note: you may need to use a different method for installing virtualenv. For example, on Ubuntu it could be that you need instead something like `sudo apt install virtualenv`.

```
cd ~
virtualenv -p python3 ml-env
```
To activate this virtualenv, use:

```
source ~/ml-env/bin/activate
```

You will notice the command-line prompt of the terminal you run the command in displays the name of this virtualenv (e.g. `(ml-env) user@host:~$`)

Now, while the virtualenv is active, any package installed using pip3 will be specific to this virtualenv (you can explore ~/ml-env to see where pip3 is placing the packages).

To deactivate, simply run:

```
deactivate
```

I personally put the above ```source ...``` line in my .bashrc file so that every time I open a terminal, I am in the default virtualenv. However, if you use pip to install packages without sudo then it installs them in `~/.local/lib/python3.6/site-packages` or similar so it is not really necessary to do this.

### Legcay: Building Qt-based projects

Installing Qt and C/C++ compilers to build legacy components (qt-mountainview or ms3 processors) is beyond the scope of this document. You may review the install instructions given for building Mountainsort3 on Ubuntu 16.04 [here](http://mountainsort.readthedocs.io/en/latest/installation_advanced.html). (Or consider using Conda to install these prerequisites; see below).

_____
## Setting up a dev environment with Conda

It is possible to install the prerequisites for developing *all* components of MountainLab using Conda, including npm packages, python packages, compiled C/C++ processors, and Qt-based apps. Indeed, this is the approach we take to build the conda pacakges used for distribution to end-users in the [mountainlab conda recipes](https://github.com/flatironinstitute/mountainlab-conda). 

A Conda env containing the required development tools and libraries gives many of the same benefits as a python virtualenv, but is not just limited to Python and its packages. For instance, NodeJS npm packages installed 'globally' within a conda env are only available within that env. Conda can also provide isolated, versioned installs of Qt, C/C++ compilers, etc. As an added bonus, the build tools can be installed nearly identically on both Linux and MacOS.

Follow the [end-user install instructions](../../README.md) to install Miniconda. Ensure you are running conda >= 4.4 (`conda -V`; if not, run `conda update conda`). Then create a new conda env:
```
conda create -n ml-dev
conda activate ml-dev
```
Install Python, Pip, NodeJS+npm, NumPy, SciPy, Jupyter Notebook, and a couple dependencies that are only available from [conda-forge](https://conda-forge.org)
```
conda install 'python=3.6' pip nodejs numpy scipy notebook conda-forge::deepdish conda-forge::pybind11
```

Note that within your conda env, you can install packages from PyPI with a regular old `pip install --upgrade .` . Packages installed this way will be installed into the Python provided by your conda env. Conda is also aware of pip-installed packages, and they will show up in the list of installed packages generated by `conda list`. Similarly, you can install NodeJS pacakges (from [npm.io](npm.io)) with `npm install --global <packagename>`. (npm packages will also be isolated to the conda env, and listed with `npm list --global`, but won't show up with `conda list` since conda doesn't know from npm).

**Warning!**: use `pip` not `pip3` inside your conda envs.

### Building legacy Qt+C++ components

If you plan to develop against mountainsort (C++/Qt) or qt-mountainview, or want to build against the OpenMP libraries on Linux and Mac you may want to check out [the mountainlab conda recipes](https://github.com/flatironinstitute/mountainlab-conda) for working examples of the required conda dependencies. Briefly, for Qt apps, you will want to install Qt, a C/C++ compiler suite (NB: no need for XCode on Mac!), and the correct OpenMP package:
```
# On Linux:
conda install qt gcc-linux-64 g++-linux-64 intel-openmp

# On Mac:
conda install qt clang-linux-64 clangxx-linux-64 llvm-openmp
```
On linux, with your `ml-dev` env active, you should immediately be able to run a typical `qmake && make` command to build a Qt-based project. 

On Mac, there are a couple platform-specific quirks that need to be addressed: you need to point the compiler to a local copy of the MacOSX SDK, which Apple does not allow Conda to redistribute, and you need to use a special shim to stop qmake from using the XCode-provided compilers. See [this GitHub issue](https://github.com/ContinuumIO/anaconda-issues/issues/9745#issuecomment-404391318) for hints, or contact Tom Davidson (@tjd2002) to request additional documentation.

*[TODO: create a `mountainsort-dev` conda metapackage to specify these dependencies]*
