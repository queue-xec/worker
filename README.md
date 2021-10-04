
# Worker

Worker after registration with server ,listens fors jobs with webosket connection.
Using  [ZeroMQ](https://github.com/zeromq/zeromq.js) , all data exchanging with server are ancrypted with sha-256.

Receives Jon data , job code , and a list of its dependencies.If job changes (or is first time)
before run its job installs live , job's dependencies.
Then returns job results to [master](https://github.com/queue-xec/master)


## Installation

Install my-project with npm

```bash
  git clone https://github.com/queue-xec/worker
  cd worker
  npm install 
  node index.js --setup
```


```bash 
 node index.js --setup
 ```
Will prompt user to enter following info:
- IP of  [master](https://github.com/queue-xec/master)
- PORT listening  [master](https://github.com/queue-xec/master)
- TOKEN  [master](https://github.com/queue-xec/master) uses

These info will saved and loaded in .env file at root workers folder.

[![MIT License](https://img.shields.io/apm/l/atomic-design-ui.svg?)](https://github.com/tterb/atomic-design-ui/blob/master/LICENSEs)

  