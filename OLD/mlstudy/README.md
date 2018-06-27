# MLStudy

## A full-stack infrastructure/ecosystem for organising reproducible analytical pipelines in the cloud 

![Network Overview](img/MLStudy.svg.png)

## Intro
Mountainlab is an environment for building reproducible & customisable analytical pipelines. Ultimately it could allow researchers to use a pre-specified pipeline to go directly from their raw data to formatted figures/results with very little (human effort). An extension of Mountainlab, Mountainlab Study (MLStudy), will allow seamless sharing and re-use of mountainlab pipelines, as well as the data that accompany them.

## Overview
MLStudy is cloud-based and is entirely built on "web-native" technologies - mainly javascript & node.js. It also includes a processing-framework, where users can run any pipeline they have access to in a state-of-the-art cluster without having to install anything!

## Components
### MountainLab - Piplelines

Tech: javascript, python


### ML-Study - User interface

Tech: nodejs, javascript, webpack


### Docstor - Database
Docstor is a database with all the meta-information about the whole service. User information (via GAuth), access controls and dataset lists are all stored on here. All documents are JSON format.

Tech: MongoDB on mlab, hosted on heroku

### KBucket
KBucket is a file storage server where files are referred to simply by there checksum. [info on lookup speeds]. Metadata in Docstor points to these files.

Tech: nodejs

### Lari - Client-Server Communication


### Stream - Cluster/Cloud-Compute
Stream is a kubernetes cluster running on azure. The cluster itselft is distributed across several nodes (VMs) each of which contain several pods. Each of these pods contains (at least) one container running "Lari Client" which takes API calls from a central Lari Server and either executes the requests itself or forwards them onto Mountainlab (running in the same container). Because each of these pods has its own unique ID (and some persistent storage) they can be used as if they were full machines from the user's perspective. Pods can be refreshed at an arbitrary time period to create new storage space, and can be updated (e.g. with a new version of MountainLab) without any visible downtime. Pod IDs are availiable from the kubernetes controller and usage (CPU, memory etc.) statistics can be accessed using the Lari API.

Tech: kubernetes, docker, azure

## References

## Acknowledgements
Mountainlab and Mountainlab Study were primarily concieved and designed by Jeremy Magland, a Senior Data Scientist an the Flatiron Institute (supported by the Simons Foundation). Alex Morley is helping to design and implement the cloud-computing/processing infrustructure (supported by the Microsoft/RSE Cloud Computing Fellowship).
