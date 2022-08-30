/* eslint-disable no-restricted-syntax */
// const { Pull, Push } = require('zeromq');
const fs = require('fs');
const { execSync } = require('child_process');
const crypto = require('crypto');
const Bugout = require('bugout');
const events = require('events');
const path = require('path');
const { install } = require('lmify');
const { Logger } = require('./Logger');
const Crypt = require('./Crypt');
const { Helper } = require('./Helper');
require('dotenv').config();

class Worker {
  constructor({
    token,
    name = 'no_name',
    loglevel,
    transferEncryptToken = null,
  } = {}) {
    this.token = token || process.env.token || new Error('token not defined, pass it in constructor or with env variable "token" , or generate new one.');
    this.name = name;
    this.peer = Bugout(this.token);
    this.execAssets = {
      dependencies: [],
      files: [],
    };

    this.event = new events.EventEmitter();
    this.log = new Logger({ level: loglevel || process.env.LOG_LEVEL });
    this.working = false;
    this.taskQueue = [];
    this.taskClass = null;
    this.crypt = null; // instatiate in init method
    this.MasterAdress = null;
    this.outQueue = null;

    this.taskFile = 'null';
    this.jobsDone = 0;
    this.jobsToDo = []; // push here jobs assigned due working..
    this.init = this.init.bind(this);
    this.onSeen = this.onSeen.bind(this);
    this.requestWork = this.requestWork.bind(this);
    this.shareResults = this.shareResults.bind(this);
    this.checkCurrentAssets = this.checkCurrentAssets.bind(this);

    this.peer.on('rpc', this.onRpcCall);
    this.peer.on('seen', this.onSeen);
    this.peer.on('message', this.onMessage);

    this.event.addListener('init', this.init);
    this.event.emit('init', transferEncryptToken);
  }

  async init(transferEncryptToken) {
    // this.event.addListener('worker_joined',  );
    this.log.info('Address:', this.peer.address());
    this.log.info('Seed:', this.peer.seed);
    this.log.info('Announcing to trackers...');
    this.event.addListener('requestWork', this.requestWork);
    this.event.addListener('shareResults', this.shareResults);
    setInterval(this.requestWork, 10000);
    this.registerRPC();
    this.crypt = new Crypt(transferEncryptToken || process.env.transferEncryptToken);
    if (this.crypt.key instanceof Error) {
      this.log.fatal('Crypt: ', this.crypt);
    }
  }

  registerRPC() {
    // respond to ping calls by sending back "pong"
    this.peer.register('ping', (pk, args, cb) => {
      args.pong = true;
      this.log.fatal('ping');
      cb(args);
    }, "Respond to ping with 'pong'.");
  }

  async requestWork() {
    if (!this.MasterAdress) {
      this.log.warn('Cant requestWork from Master if his address not discovered yet');
      return;
    }
    if (this.working) {
      this.log.warn('requestWork called while working');
      return;
    }
    if (this.jobsToDo.length > 0) {
      const job = this.jobsToDo.shift(); // pushed jobs are decrypted
      this.log.debug(`working on queued internal jobs , processing job id :${job.id} remaining: ${this.jobsToDo.length}`);
      await this.doJobs(job).then((results) => {
        this.event.emit('shareResults', results);
      }).catch((e) => {
        this.log.warn(e.message);
      });
      this.event.emit('requestWork');
      return;
    }
    this.peer.rpc(this.MasterAdress, 'requestWork', {}, async (masterAns) => {
      if (masterAns.task) { // null if no jobs available
        const job = this.crypt.decrypt(JSON.parse(masterAns.task));// decrypt once incoming job data
        await this.doJobs(JSON.parse(job)).then((results) => {
          this.event.emit('shareResults', results);
        }).catch((e) => {
          this.log.warn(e.message);
        });
        this.event.emit('requestWork'); // keep worker in a loop as long Master has jobs :D
      }
    });
  }

  shareResults(results) {
    if (!this.MasterAdress) throw new Error('cant request work if Master address not discovered yet');
    this.peer.rpc(this.MasterAdress, 'shareResults', results);
  }

  /** Called when some of connected peers send us a message */
  onMessage(address, message) {
    this.log.debug(`message from ${address} :`, message);
  }

  /** Called when a peer */
  onRpcCall(pk, call) {
    this.log.debug(`RPC: ${call}`);
  }

  onSeen(newPeerAddress) {
    this.log.debug('New peer seen : ', newPeerAddress);
    this.peer.rpc(newPeerAddress, 'isMaster', {}, (ans) => {
      if (ans?.isMaster === 'yes') {
        this.MasterAdress = newPeerAddress;
        this.log.debug('Master discovered with address:', this.MasterAdress);
        const currentHash = this.checkCurrentAssets();
        this.peer.rpc(this.MasterAdress, 'requestExecAssets', { currentHash }, async (answer) => {
          if (answer.status === 'changed') {
            this.working = true;
            this.deleteExecAssets();
            await Worker.installDependencies(answer.dependencies);
            this.saveAssets(answer.files);
            this.execAssets = {
              dependencies: answer.dependencies,
              files: answer.files,
            };
            const taskFile = this.execAssets.files.filter((file) => file.name === 'task.js');
            if (taskFile.length === 1) {
              delete require.cache[require.resolve(`${process.cwd()}${taskFile[0].workerPath}`)]; // delete Task [cahced]
              const Task = require(`${process.cwd()}${taskFile[0].workerPath}`);
              this.taskClass = new Task();
            } else {
              this.log.warn('Not found task.js file in assets. Is required as its the entry point..');
            }
            this.checkCurrentAssets();
            this.working = false;
            this.event.emit('requestWork');
          }
          //
          this.log.debug('requestExecAssets answer:', answer);
        });
      }
    });
  }

  saveAssets(files) {
    this.log.debug('saveAssets', files);
    for (let i = 0; i < files.length; i++) {
      const asset = files[i];
      this.log.debug(`storing asset ${asset.name} in .${asset.workerPath}`);
      if (asset.content === '' || typeof asset.content === 'undefined') {
        this.log.warn(`${asset.name} dont has any content`);
        this.log.debug(asset);
        continue;
      }
      const fileContent = this.crypt.decrypt(asset.content);
      const fileDir = path.dirname(`${process.cwd()}${asset.workerPath}`);
      fs.mkdirSync(fileDir, { recursive: true }); // create dirs recursively
      fs.writeFileSync(`${process.cwd()}${asset.workerPath}`, fileContent, { encoding: 'utf8' });
    }
  }

  // maybe instead of deps pushing , push package.json in seperate fixed dir
  static async installDependencies(deps) {
    for (let i = 0; i < deps.length; i++) {
      const lib = deps[i];
      await install(lib);
    }
  }

  /**
   * Description: Promise , instatiate task class reveived from Master and run task with given
   * job data.
   * @param {Object} job data
   * @resolves job results
   */
  doJobs(job) {
    return new Promise((resolve, reject) => {
      if (this.working) {
        this.jobsToDo.push(job);
        this.jobsDone -= 1;
        reject(new Error(`busy job id:${job.id}`)); // for jobs arrived when we are busy
      }
      this.working = true;
      this.taskClass.run(job).then(async (result) => {
        const answer = {
          jobID: job.id,
          worker: {
            id: this.id,
            name: this.name,
          },
          data: result,
        };
        const encrypted = this.crypt.encrypt(JSON.stringify(answer));
        this.working = false;
        this.jobsDone += 1;
        this.log.debug(`jobs completed: ${this.jobsDone}`);
        resolve(JSON.stringify(encrypted));
      });
    });
  }

  /**
   * Description: Read all exec asset files , find their sha256
   * update global object this.execAssets.files and returns unified hash 256 of all knwon hashes
   * If not known returns empty hash , Master will detect we dont know anything about assets and \
   * will send all to this instance
   * @returns {String} unifiedHash
   */
  checkCurrentAssets() { // update global exec Assets
    if (this.execAssets.files.length === 0) {
      this.log.warn('execAssets not have any files yet');
      return '';
    }
    this.execAssets.files = Helper.populateSha256OnAssets(this.execAssets.files);
    let unifiedHash = '';
    for (let i = 0; i < this.execAssets.files.length; i++) {
      const file = this.execAssets.files[i];
      unifiedHash += file.sha256;
    }
    return unifiedHash;
  }

  /**
   * Description: In case assets  has changed , this method called to delete currently known
   * assets and correspondig dirs
   */
  deleteExecAssets() {
    const knwonAssets = this.execAssets.files;
    this.log.debug('deleteExecAssets knwonAssets', knwonAssets);
    for (let i = 0; i < knwonAssets.length; i++) {
      const file = knwonAssets[i].workerPath;
      try {
        const stats = fs.statSync(`${process.cwd()}${file}`);
        if (stats.isFile()) {
          const assetPaths = file.split('/');
          if (assetPaths.length > 2) { // file  is inside a dir locally
            this.log.warn('Deleting dir ', `${process.cwd()}/${assetPaths[1]}`);
            fs.rmSync(`${process.cwd()}/${assetPaths[1]}`, { recursive: true, force: true });
          } else if (assetPaths.length === 2) { // single file in root of workers dir
            this.log.warn('Deleting file ', `${process.cwd()}/${assetPaths[1]}`);
            fs.unlinkSync(`${process.cwd()}${file}`);
          }
        }
      } catch (e) {
        this.log.debug(e.message);
      }
    }
  }
}
module.exports = Worker;
