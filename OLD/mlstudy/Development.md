The (easiest?) way to get a development version of MLstudy on your local machine is using Docker. I like to run each container in a seperate pane using tmux but you can open a few seperate terminal windows instead if you like.

Whether you choose to build your own Images or pull the ones on dockerhub is up to you too.

### Window 1
To pull from dockerhub:
`docker pull alexmorley/mlstudy2`

To build yourself:
```
git clone git@github.com:magland/mlstudy2.git
pushd mlstudy2
docker build -t mlstudy2 .
```

Then:
`docker run --net="host" mlstudy2`

### Windows N+1
*TODO* Flesh this out into the actual commnds.
Do exactly the same for the other components. The only things that are different are their names.

NB: the two lari images are kept at `alexmorley/parent_lari` and `alexmorley/proc_and_lari` respectively.
To build a specific dockerfile you need to do `docker build -t tag_name . -f $specific_dockerfile`

### Post set-up
Visit localhost:5081 in your browser! (NB Google AUTH won't work)
