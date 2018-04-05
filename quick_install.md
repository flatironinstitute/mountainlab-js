# Quick install instructions for MountainLab

Some abbreviated instructions

Install npm and then run

```
cd mountainlab-js
npm install
```

Add the bin directory to your path:

```
export PATH=[your/path/to]/mountainlab-js/bin:$PATH
```

To install the python integration, first install python3 and python3-pip.

Ideally you should be in a virtualenv to run the following

```
cd utilities/python
pip3 install .
```

This will install the mltools module.
