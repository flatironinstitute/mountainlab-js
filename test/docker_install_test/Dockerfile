FROM ubuntu:16.04

MAINTAINER Jeremy Magland

# Install utils
RUN apt-get update && \
    apt-get install -y \
    curl htop git

# Install nodejs
RUN curl -sL https://deb.nodesource.com/setup_8.x -o nodesource_setup.sh && \
	bash nodesource_setup.sh
RUN apt-get update && \
    apt-get install -y \
    nodejs

# Install mongodb
RUN mkdir -p /data/db
RUN apt-get update && \
    apt-get install -y \
    mongodb

# Install python, pip, and pip packages
RUN apt-get update && \
    apt-get install -y \
    python3 python3-pip

COPY ./mountainlab-js-test /working/mountainlab-js
WORKDIR /working/mountainlab-js
RUN npm install --unsafe-perm # unsafe-perm is required here because we are root

WORKDIR /working/mountainlab-js/utilities/python
RUN pip3 install .

WORKDIR /working/mountainlab-js

CMD /bin/bash -c "mongod --fork --logpath /var/log/mongodb.log && sleep 1 && bin/ml-list-processors"