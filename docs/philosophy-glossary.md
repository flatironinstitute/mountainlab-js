## High-Level Overview
** Here we try to descibe the philosophy **

MountainLab aims to be a flexible, robust tool for executing a series of steps forming a pipeline.

MountainLab itself manages queing processes, running pipelines, and making sure the processors have access to the files they need.

## Processor
A processor is simply a program, but in this context *all* of the side-effects (outputs) of the program must be made via reading from (if any) `inputs` files and writing to any `outputs` files. These inputs and outputs are defined in the `processor spec`.

### Processor Spec
A string describing which (if any) input files, output files, and paramaeters a particular processor supports/requires.

## Package
A package is a collection of processors. It is defined by a (or many) `.mp` files which are unix-executables that return the spec of one or more processors when called with the argument `--spec`.

## Pipeline
A pipeline is just a series of processors being run on a dataset. You can create your own pipelines in any language, but to take full advantage of MountainLab's features they should be specified in javascript.

### `.ml` pipeline
`.ml` is the extension used for pipelines written in javascript and that can be run using MLStudy, a server/web-based framework for mountain lab.

## Study (`.mls`)
A study is an associated collection of:
- Datasets
- Pipelines
- Results
- +some metadata/abtritary extra info

**A study is thus a fully defined mapping of a dataset (or set of datasets) to results.**
