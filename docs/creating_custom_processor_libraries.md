# Creating custom processor libraries

Below is a description of how to create a processor library.
You may also want to work by editing the "hello world"
processor examples
here: [`ml_identity`](https://github.com/alexmorley/ml_identity).

Each MountainLab processor library is defined by an executable .mp file located somewhere within the (recursive) set of processor library search paths. The file must (a) have executable permissions and (b) have a .mp extension. If those two conditions are met, the MountainLab framework will make a system call of the file with a single "spec" argument, and will expect a JSON string to be printed to stdout. For example, the ```kbucket_upload.mp``` file is one of the built-in processor libraries distributed with mountainlab. If you run this file with the ```spec``` argument

```
> ./kbucket_upload.mp spec
```

then you get the following JSON output:

```
{
    "processors": [
        {
            "name": "kbucket.upload",
            "exe_command": "/home/magland/src/mountainlab-js/system-packages/kbucket_upload/kbucket_upload.mp upload $(arguments)",
            "version": 0.1,
            "description":"Upload a file to kbucket (authorization must be set in environment variables)",
            "inputs": [
                {"name": "file","optional": false}
            ],
            "outputs": [],
            "parameters": [
                {"name": "sha1","optional": true}
            ],
            "opts": {
                "force_run": true
            }
        },
        {
            "name": "kbucket.download",
            "exe_command": "/home/magland/src/mountainlab-js/system-packages/kbucket_upload/kbucket_upload.mp download $(arguments)",
            "version": 0.1,
            "description":"Download a file from kbucket",
            "inputs": [],
            "outputs": [
            	{"name": "file","optional": false}
            ],
            "parameters": [
                {"name": "sha1","optional": false}
            ],
            "opts": {}
        }
    ]
}
```

Since this file is located in one of the (recursive) search paths, the two processors defined here are listed in a call to ```ml-list-processors```:

```
> ml-list-processors
kbucket.upload
kbucket.download
...
```

Furthermore, since these processors are now registered on the local machine, we can also retrieve the spec for them individually using the ```ml-spec``` command:

```
> ml-spec kbucket.download
{
    "name": "kbucket.download",
    "exe_command": "/home/magland/src/mountainlab-js/system-packages/kbucket_upload/kbucket_upload.mp download $(arguments)",
    "version": 0.1,
    "description":"Download a file from kbucket",
    "inputs": [],
    "outputs": [
        {"name": "file","optional": false}
    ],
    "parameters": [
        {"name": "sha1","optional": false}
    ],
    "opts": {}
}
```

Note that the exe_command string, in this case, is dynamically generated, and contains the system command that MountainLab should run when a processor job of this type is executed using one of the ```ml-exec-process```, ```ml-run-process``` or ```ml-queue-process``` commands. This command can be an arbitrary system call. For example, it could launch matlab, python, octave, or any other program installed on the local machine. In this case the input, output, and parameter arguments are passed to the program via the ```$(arguments)``` systax. When MountainLab runs the system command, it replaces ```$(arguments)``` by ```--file=/path/to/output/file.dat --sha1=[hash]```, or whatever values were passed in to the call to ```ml-*-process```. More details about formatting the ```exe_command``` string are given below.

## The processor spec object

As described above, a processor library is defined by an executable .mp file that returns a JSON specification in response to the ```spec``` argument. As shown in the above examples, that JSON object contains a list of processors, each of which should have the following fields:

* ```name``` The universally unique name of the processor.
* ```version``` A version string for this processor, which should change (or increment) whenever the behavior or implementation of the processor changes.
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
* ```opts``` A JSON object containing some additional options determining the behavior of the processor, including
	- ```force_run``` (Boolean) Determines whether the processor should always run (regardless of caching of processor jobs on the local machine)



## Formatting the exe_command

[[TODO: finish]]

