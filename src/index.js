/* eslint-disable no-restricted-syntax */
// const { Pull, Push } = require('zeromq');
const fs = require('fs');
const { execSync } = require('child_process');
const crypto = require('crypto');
const Bugout = require('bugout');
const events = require('events');
const path = require('path');
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
    setInterval(this.requestWork, 1000);
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

  requestWork() {
    if (!this.MasterAdress) throw new Error('cant request work if Master address not discovered yet');
    if (this.working) {
      this.log.warn('requestWork called while working');
      return;
    }

    this.peer.rpc(this.MasterAdress, 'requestWork', {}, async (masterAns) => {
      // console.dir(masterAns);
      if (masterAns.task) { // null if no jobs available
        await this.doJobs(masterAns.task).then((results) => {
          this.event.emit('shareResults', results);
        }).catch((e) => {
          this.log.warn(e.message);
        });

        this.requestWork(); // keep worker in a loop as long Master has jobs :D
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
    // if (!this.MasterAdress) { // this.MasterAdress  is null not known yet
    this.peer.rpc(newPeerAddress, 'isMaster', {}, (ans) => {
      if (ans?.isMaster === 'yes') {
        this.MasterAdress = newPeerAddress;
        this.log.debug('Master discovered with address:', this.MasterAdress);
        const currentHash = this.checkCurrentAssets();
        this.peer.rpc(this.MasterAdress, 'requestExecAssets', { currentHash }, async (answer) => {
          if (answer.status === 'changed') {
            // this.installDependencies(answer.dependencies);
            this.saveAssets(answer.files);
            this.execAssets = {
              dependencies: answer.dependencies,
              files: answer.files,
            };
            this.checkCurrentAssets();
          }
          this.event.emit('requestWork');
          this.log.debug('requestExecAssets answer:', answer);
          this.log.debug('requestExecAssets this.execAssets:', this.execAssets);
        });
      }
      // console.dir(ans);
    });
    // }
    // this.event.emit('worker_joined', newPeerAddress)
  }

  saveAssets(files) {
    this.log.debug('files', files);
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

      // this.log.debug();
      fs.writeFileSync(`${process.cwd()}${asset.workerPath}`, fileContent, { encoding: 'utf8' });
      // this.log.debug(fileContent);
    }
  }

  installDependencies(deps) {

  }

  // const message_ = this.hash.decrypt(JSON.parse(msg));
  //  const job = JSON.parse(JSON.parse(message_));
  /**
   *
   *         if (message_ === 'Decryption failed.' || !message_) {
          console.error('[Error] Failed to decrypt job data!\n[Hint] Check your token!');
          return;
        }
   *
   */

  doJobs(job) {
    return new Promise((resolve, reject) => { // TODO push jobs to  internal queue
      if (this.working) reject(new Error(`busy jobID:${job.id}`)); // for jobs arrived when we are busy

      this.working = true;
      setTimeout(() => {
        const data = {
          jobID: job.id,
          results: [],
        };
        this.working = false;
        resolve(data);
      }, 50);// Math.floor(Math.random() * (1500 - 50 + 1)) + 50);
    });
    // this.taskClass.run(job).then(async (result) => {
    //   const answer = {
    //     worker: {
    //       id: this.id,
    //       name: this.name,
    //     },
    //     data: result,
    //   };
    //   const encrypted = this.hash.encrypt(JSON.stringify(answer));
    //   this.outQueue.send(JSON.stringify(encrypted));
    //   // self.receiver.send();
    //   this.jobsDone += 1;
    //   console.log(`Jobs Completed : ${this.jobsDone} jobQueue: ${this.taskQueue.length}`);
    //   this.working = false;
    //   this.takeJobsFromQueue();
    // });
  }

  static async writeFile(file, data, encoding) {
    return new Promise((resolve, reject) => {
      fs.writeFile(file, data, encoding, (err) => {
        if (err) reject(err);
        else resolve(data);
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
    this.log.warn('before:', this.execAssets);
    this.execAssets.files = Helper.populateSha256OnAssets(this.execAssets.files);
    this.log.warn('after:', this.execAssets);
    let unifiedHash = '';
    for (let i = 0; i < this.execAssets.files.length; i++) {
      const file = this.execAssets.files[i];
      unifiedHash += file.sha256;
    }
    this.log.debug('checkCurrentAssets >  this.execAssets info :', this.execAssets);
    return unifiedHash;
  }

  /**
   * Description: In case assets  has changed , this method called to delete currently known
   */
  deleteExecAssets(){+
    const knwonAssets = this.execAssets.files
    for (let i = 0; i < knwonAssets.length; i++) {
      const file = knwonAssets[i];
      fs.unlinkSync()
      
    }

  }
}
module.exports = Worker;
