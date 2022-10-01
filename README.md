# Worker

As the name itself states it , Worker is the task processor node. After initial connection , Worker waiting for new tasks.

Info needs from Master :

- token
- transferEncryptToken

These 2 tokens are generated in [Master](https://github.com/queue-xec/master) due setup.Worker can operate in any network condition as long is online, can work behind NAT or home routers. Using webrtc and peer to peer trackers to connect and communicate with master.

Can receive task assets and their dependencies , while can track any changes made in files shared from [Master](https://github.com/queue-xec/master) ,if has outdated version of those files , will request again latest ones from Master.Dependencies automatically installed when a file change takes place.

Can receive job data , as part of job if [Master](https://github.com/queue-xec/master) passes them.And finally send back to Master job results , all data communication are encrypted.

## Get started

With [npm](https://www.npmjs.com/package/queue-xec-worker)

```bash
yarn add queue-xec-worker  #or# npm install queue-xec-worker
```

Including in existing project

```js
const Worker = require('queue-xec-worker')

const work1 = new Worker({
    token, // token generated from Master
    name = 'worker_1',
    loglevel, // off -> info -> warn -> error -> debug
    transferEncryptToken = null, // token generated from Master
    ); // work1 instance is ready for incoming new tasks
```

\*\* file an issue if you think Worker should expose any other functionalities (for example, to have more control) .

```bash
  git clone https://github.com/queue-xec/worker
  cd worker
  yarn #or# npm install
```

```bash
 node worker.js --setup
```

Will prompt user to enter following info:

- transferEncryptToken token from [master](https://github.com/queue-xec/master) to secure data communications
- token from [master](https://github.com/queue-xec/master) this used for peers connection through webrtc.

These info will saved and loaded (later) in .env file at root workers folder.

### Run and Wait for jobs :

- `node worker.js`

[![MIT License](https://img.shields.io/apm/l/atomic-design-ui.svg?) ](https://github.com/tterb/atomic-design-ui/blob/master/LICENSEs)

## > Contributors <

<a  href="https://github.com/queue-xec/worker/graphs/contributors">
<img  src="https://contrib.rocks/image?repo=queue-xec/worker"  />
</a>

### ⚠️ Under development ⚠️
