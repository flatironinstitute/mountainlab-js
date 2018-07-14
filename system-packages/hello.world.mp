#!/usr/bin/env node

let spec = {
	"name": "hello.world",
  "description": "Minimalist processor for testing",
  "version": "0.1.0",
  "exe_command": "echo hello, world from hello.world mountainlab processor",
  "inputs": [],
  "outputs": [],
  "parameters": [],
};

let X={
	processors:[spec]
};
console.info(JSON.stringify(X,null,4));