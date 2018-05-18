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

# Install python and pip
RUN apt-get update && \
    apt-get install -y \
    python3 python3-pip

# Install mountainlab-js
WORKDIR /working
ADD https://api.github.com/repos/flatironinstitute/mountainlab-js/git/refs/heads/master version-mountainlab-js.json
RUN git clone https://github.com/flatironinstitute/mountainlab-js
WORKDIR /working/mountainlab-js
RUN npm install --unsafe-perm # unsafe-perm is required here because we are root
ENV PATH /working/mountainlab-js/bin:$PATH

# Install packages
RUN mkdir -p /working/.mountainlab/packages
WORKDIR /working/.mountainlab/packages
ENV ML_PACKAGE_SEARCH_DIRECTORY /working/.mountainlab/packages

ADD https://api.github.com/repos/magland/ml_ephys/git/refs/heads/master version-ml_ephys.json
RUN git clone https://github.com/magland/ml_ephys
RUN cd ml_ephys && pip3 install --upgrade -r requirements.txt

ADD https://api.github.com/repos/magland/ml_ms4alg/git/refs/heads/master version-ml_ms4alg.json
RUN git clone https://github.com/magland/ml_ms4alg
RUN cd ml_ms4alg && pip3 install --upgrade -r requirements.txt

WORKDIR /working
COPY test_in_container.sh /working/test_in_container.sh

CMD /bin/bash -c "mongod --fork --logpath /var/log/mongodb.log && sleep 1 && /working/test_in_container.sh"