Here are some notes/hints for getting MountainLab to work on OS X. (Thanks to L. Frank for testing)

You should first install homebrew, if not already on your system. 

Following install of nodeJS, do the following:

```
sudo ln -s /usr/local/bin/node /usr/local/bin/nodejs
```

This will create a link between node (as it seems to be called on OS X systems) and nodejs, which is what mountainlab expects.

For MongoDB, go to https://treehouse.github.io/installation-guides/mac/mongo-mac.html
and follow the instructions there for the homebrew installation.
Note that the mongo daemon will need to be running if you want to use mountainlab, so you might want to put that startup command in your .bashrc or
your .tcshrc:

```
brew services start mongodb
```

When installing the plugin processor libraries, you will need to replace the 'pip3' command with 'pip',

It is possible that you will be missing the olefile package. In that case, do:

```
pip install olefile
```

If you run into problems, contact Jeremy.
