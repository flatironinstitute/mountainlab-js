# ephys -- Example MountainLab package

How to use:

1. Install MountainLab from https://github.com/flatironinstitute/mountainlab-js

2. Install mltools:

```
cd mountainlab-js/utilities/python
pip3 install --upgrade .
```

3. Either copy this package into ~/.mountainlab/packages, or create a symbolic link

```
cd ~/.mountainlab/packages
ln -s [/path/to]/mountainlab-js/example-packges/ephys ephys
```

Now check that the ephys processors have been registered by typing:

```
ml-list-processors
```

and, for example,

```
ml-spec ephys.whiten -p
```

