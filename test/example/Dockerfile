FROM ubuntu:16.04

MAINTAINER Jeremy Magland

# Install utils
# Install nodejs
# Install mongodb
# Install python and pip
RUN apt-get update \
  && apt-get install -y \
    curl htop git \
  && curl -sL https://deb.nodesource.com/setup_8.x -o nodesource_setup.sh \
  && bash nodesource_setup.sh \
  && mkdir -p /data/db \
  && apt-get install -y \
    nodejs \
    mongodb \
    python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*

COPY mongod-sh /bin/mongod-sh
ENTRYPOINT ["/bin/mongod-sh"]

