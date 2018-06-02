## Collaborative, browser-based visualization of electrophysiology datasets

Before processing an electrophysiology timeseries it is a good idea to look at it. This can be done using ephys-viz by running, for example,

```
ev-view-timeseries raw.mda --samplerate 30000
```

I often get emails from MountainSort users who want to know if they are using the right sorting parameters or if their input has been prepared correctly. Of course, the first thing I want to do is to look at the raw timeseries data. This is a problem since the data is not on my computer.

As of today, we have a new straightforwarward procedure for uploading a timeseries dataset such that one can view a portion of the raw data online without actually downloading the dataset. Here are the steps to follow:

* Log in to MLStudy using your google id (or gmail address): https://mlstudy.herokuapp.com

* Click on "My Studies" and click to "Create new study" -- give it a reasonable name

* Open the study, and then click on "Datasets" and add a new dataset -- give it a reasonable name (could be the same as the name of the study)

* Set a description for the dataset and/or the study... and set some dataset parameters (using the parameters section of the dataset window), including "samplerate" and "spike_sign".

* Upload your timeseries file in .mda format and rename to raw.mda once uploaded

Note: depending on the file size, you may need to email Jeremy with your google id and ask for permission for uploading files. In general please keep the files to less than 100GB. The purpose is for troubleshooting and simple demonstrations.

* Click the icon in the "Labels" column to add the label "timeseries".

If everything worked, you should get a new viewing icon next to the uploaded file that will open a new browser tab with the ev-view-timeseries view.

* Share the study with me by entering my flatironinstitute email address in the share dialog (see the "Study->Share" menu option)

You can check out this existing example (if it hasn't been removed susequent to this post): [Neuron synth](https://mlstudy.herokuapp.com/?source=docstor&owner=jmagland@flatironinstitute.org&title=neuron_synth.mls)
