# MountainLab processing scripts reference

MountainLab processor scripts are used to assemble and execute pipelines of individual processor jobs. They can be run either from the command line or via web browser, and can queue jobs either to the local machine or to a remote server.

Processor script files should have a .ml extension and should be written in pure ECMAScript (JavaScript). They should not *use* any capabilities specific to web browsers or to NodeJS. For example, do not try to *require* a NodeJS modules, or access the *window* object of the browser. Just use pure JavaScript.

At the top of the script, you can optionally use the following two lines which allow this script to be run from the command line using ```mls-run``` and to be  probed using ```mls-spec```. 

```
exports.spec=spec;
exports.main=main;
```

Then you must create those two functions in the body of the script. The ```spec``` function should return a JSON object containing the input/output/parameter specification (spec) in the same style as for registered MountainLab processors. The object should have the following fields:

```
* ```description``` A brief description string for the processor.
* ```inputs``` A list of inputs for the processor (corresponding to input files), each with the following fields
	- ```name``` The name of the input
	- ```optional``` (Boolean) Whether or not this input is optional
* ```outputs``` A list of outputs for the processor (corresponding to output files), each with the following fields
	- ```name``` The name of the output
	- ```optional``` (Boolean) Whether or not this output is optional
* ```parameters``` A list of parameters for the processor, each with the following fields
	- ```name``` The name of the parameter
	- ```optional``` (Boolean) Whether or not this output is optional
	- ```default_value``` If the parameter is optional, a string representing the default value for the parameter.
```

An example of a ```spec``` function is [provided here](processing_scripts.md).