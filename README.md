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

** file an issue if you think Worker should expose any other functionalities (for example, to have more control) .

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

### Task File Structure

The worker expects a `task.js` file to be provided by the Master. This file should export a class with a `run` method that accepts a `job` object as an argument and returns a Promise that resolves with the job's results.

Example `task.js`:

```javascript
class Task {
  async run(job) {
    // Process the job data
    console.log('Processing job:', job.id);
    // ... perform some work ...
    return {
      jobId: job.id,
      status: 'completed',
      result: 'some_result',
    };
  }
}

module.exports = Task;
```

[![MIT License](https://img.shields.io/apm/l/atomic-design-ui.svg?) ](https://github.com/tterb/atomic-design-ui/blob/master/LICENSEs)

## > Contributors <

<a  href="https://github.com/queue-xec/worker/graphs/contributors">
<img  src="https://contrib.rocks/image?repo=queue-xec/worker"  />
</a>

### ⚠️ Under development ⚠️

## API Documentation

### `Worker` Class (src/index.js)

The `Worker` class is the core component of the task processor node. It handles connections to the Master, requests and processes tasks, and manages task assets and dependencies.

**Constructor:**

```javascript
new Worker({ token, name = 'no_name', loglevel, transferEncryptToken = null })
```

- `token` (String): Required. Token generated from the Master for peer connection. Can be passed in the constructor or as an environment variable `token`.
- `name` (String): Optional. The name of the worker instance. Defaults to `'no_name'`.
- `loglevel` (String): Optional. The logging level for the worker. Accepted values: `'off'`, `'info'`, `'warn'`, `'error'`, `'debug'`.
- `transferEncryptToken` (String): Optional. Token generated from the Master to secure data communications.

**Methods:**

- `init(transferEncryptToken)`: Asynchronously initializes the worker, sets up event listeners, registers RPC calls, and instantiates the `Crypt` class.
- `registerRPC()`: Registers RPC (Remote Procedure Call) methods with the peer. Currently, it responds to 'ping' calls with 'pong'.
- `requestWork()`: Requests new tasks from the Master. If the worker is busy or the Master's address is not yet discovered, it will not make a request. It also handles processing of internally queued jobs.
- `shareResults(results)`: Shares the results of a completed job back to the Master.
- `onMessage(address, message)`: Callback function executed when a connected peer sends a message.
- `onRpcCall(pk, call)`: Callback function executed when an RPC call is received from a peer.
- `onSeen(newPeerAddress)`: Callback function executed when a new peer is discovered. It checks if the new peer is the Master and requests execution assets if so.
- `saveAssets(files)`: Saves the received task asset files to the local file system.
- `static installDependencies(deps)`: Asynchronously installs all announced dependencies from the Master.
- `doJobs(job)`: Processes a given job. It instantiates the task class received from the Master and runs the task with the provided job data. Returns a Promise that resolves with the job results.
- `checkCurrentAssets()`: Reads all execution asset files, calculates their SHA256 hashes, updates `this.execAssets.files`, and returns a unified hash of all known hashes.
- `deleteExecAssets()`: Deletes currently known assets and their corresponding directories in case assets have changed.

### `Logger` Class (src/Logger.js)

The `Logger` class provides logging functionalities with different levels.

**Constructor:**

```javascript
new Logger({ level = 'off', writeStream = false } = {})
```

- `level` (String): Optional. The logging level. Accepted values: `'off'`, `'info'`, `'warn'`, `'error'`, `'debug'`. Defaults to `'off'`.
- `writeStream` (WritableStream): Optional. A writable stream to which log messages will be written. Defaults to `false`.

**Methods:**

- `translateToCode(level)`: Converts a human-readable log level string to its corresponding numerical code.
- `info(msg, extra)`: Prints messages for the 'info' log level.
- `warn(msg, extra)`: Prints messages for the 'warn' log level.
- `error(msg, extra)`: Prints messages for the 'error' log level.
- `fatal(msg, extra)`: Prints messages for the 'fatal' log level and exits the process.
- `debug(msg, extra)`: Prints messages for the 'debug' log level.
- `writeToFile(msg, extra = '')`: Writes log messages to the configured `writeStream` if available.

### `Helper` Class (src/Helper.js)

The `Helper` class provides utility functions.

**Static Methods:**

- `static LocalTime(timestamp)`: Formats a given timestamp into 'DD-MM HH:mm:ss' local time.
- `static sleep(ms)`: Returns a Promise that resolves after a specified number of milliseconds.
- `static getTimestamp()`: Returns the current timestamp.
- `static mesurePerf(started)`: Calculates the performance difference from a given start timestamp.
- `static getSha256(file)`: Calculates the SHA256 hash of a given file.
- `static populateSha256OnAssets(arr)`: Populates the SHA256 hash for each asset in an array of asset objects.

### `Crypt` Class (src/Crypt.js)

The `Crypt` class provides encryption and decryption functionalities using AES-256-cbc.

**Constructor:**

```javascript
new Crypt(key)
```

- `key` (String): Required. The encryption key (must be 32 characters long).

**Methods:**

- `encrypt(text)`: Encrypts the given text using AES-256-cbc. Returns an object containing the initialization vector (iv) and the encrypted data.
- `decrypt(text)`: Decrypts the given text using AES-256-cbc.
- `getKey()`: Returns the encryption key.
- `getIv()`: Returns the initialization vector.
