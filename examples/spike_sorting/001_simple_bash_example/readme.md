This example shows how to run mountainlab processors from a bash script. It synthesizes ephys data and then runs spike sorting. All input and output files are stored in the data/ subdirectory.

Instructions:

Run ./simple_bash_example.sh to create a synthetic timeseries and run spike sorting.

Then visualize the results with ./view_results.py

Results are stored in the data/ directory. Here we use all .prv files. You can use ml-prv-locate to find the location of those files in the temporary directory. But you can also remove the .prv extensions in the scripts to get the actual data files.
