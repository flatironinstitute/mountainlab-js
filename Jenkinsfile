pipeline {
  agent none
  options {
    disableConcurrentBuilds()
    timeout(time: 1, unit: 'HOURS')
  }
  stages {
    stage('example') {
      agent {
	dockerfile {
	  dir "test/example"
	  args '-v /etc/passwd:/etc/passwd -v /etc/group:/etc/group'
	}
      }
      environment {
	HOME = "/tmp"
      }
      steps {
	sh 'npm install'
	dir('ml_ephys') {
	  git(url: "https://github.com/magland/ml_ephys", branch: "master")
	}
	sh 'cd ml_ephys && pip3 install --upgrade -r requirements.txt'
	dir('ml_ms4alg') {
	  git(url: "https://github.com/magland/ml_ms4alg", branch: "master")
	}
	sh 'cd ml_ms4alg && pip3 install --upgrade -r requirements.txt'
	sh 'PATH=$PWD/bin:$PATH test/docker_test_spike_sorting/test_in_container.sh'
      }
    }
  }
}
