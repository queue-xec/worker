# Worker
[![Publish to NPM](https://github.com/queue-xec/worker/actions/workflows/publish_npm.yml/badge.svg)](https://github.com/queue-xec/worker/actions/workflows/publish_npm.yml)

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
    }); // work1 instance is ready for incoming new tasks
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

## API Documentation

### Public API

The package exports a single class, `Worker`:

```javascript
const Worker = require('queue-xec-worker');

const worker = new Worker({ token, name = 'no_name', loglevel, transferEncryptToken = null });
```

- `token` (String): Required. Token generated from the Master, used for the peer connection. Falls back to the `token` environment variable.
- `name` (String): Optional. Name of this worker instance. Defaults to `'no_name'`.
- `loglevel` (String): Optional. One of `'off'`, `'info'`, `'warn'`, `'error'`, `'debug'`. Falls back to the `LOG_LEVEL` environment variable, then `'off'`.
- `transferEncryptToken` (String): Required. Token generated from the Master to encrypt data exchanged with it (32 characters, used as an AES-256 key). Falls back to the `transferEncryptToken` environment variable; the worker exits if neither is set.

The worker starts itself on construction: it connects to the network, waits until it discovers the Master, fetches task assets and dependencies, then keeps requesting and processing jobs for as long as the Master has work. There are no methods you need to call.

Optional environment variables:

- `getBatch`: when set, ask the Master for jobs in batches instead of one at a time.
- `batchSize`: number of jobs per batch request. Defaults to `5`.

### Internals (for contributors)

The classes and methods below are not exported and may change without notice.

**`Worker` (src/index.js)**

- `init(transferEncryptToken)`: called from the constructor. Logs the peer address, wires the internal `requestWork` / `shareResults` events, starts a 30 s timer that polls for work, registers RPC handlers and creates the `Crypt` instance.
- `registerRPC()`: registers the `ping` RPC, which answers with `{ ...args, pong: true }`.
- `requestWork()`: processes internally queued jobs first, otherwise asks the Master for new work (rate limited). Does nothing while busy or before the Master is discovered.
- `shareResults(results)`: sends job results to the Master and requests more work.
- `onSeen(address)`, `onMessage(address, message)`, `onRpcCall(pk, call)`: peer event callbacks. `onSeen` checks whether the new peer is the Master and, if so, requests the execution assets.
- `saveAssets(files)`: decrypts received asset files and writes them under the worker's working directory.
- `static installDependencies(deps)`: installs any announced dependency that cannot already be resolved.
- `doJobs(job)`: instantiates the task class received from the Master and runs it with the job data. Returns a Promise of the results.
- `checkCurrentAssets()`: recomputes the SHA-256 of every known asset file and returns all the hashes concatenated into one string (empty string if there are no assets yet).
- `deleteExecAssets()`: deletes the currently known asset files and their directories, used when the Master's assets have changed.

**`Crypt` (src/Crypt.js)**: AES-256-CBC with the `transferEncryptToken` as key.

- `encrypt(text)`: returns `{ iv, encryptedData }` (both hex strings), or `null` on failure (for example a key that is not 32 bytes).
- `decrypt({ iv, encryptedData })`: takes the object produced by `encrypt` and returns the plaintext string, or `null` on failure.

**`Logger` (src/Logger.js)**: console logger with levels `off` < `info` < `warn` < `error` < `debug`. Provides `info`, `warn`, `error`, `debug`, and `fatal`, which logs and then exits the process.

**`Helper` (src/Helper.js)**: static utilities: `LocalTime`, `sleep`, `getTimestamp`, `mesurePerf`, `getSha256(file)`, `populateSha256OnAssets(assets)`.
