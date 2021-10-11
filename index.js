/* eslint-disable no-restricted-syntax */
const { Pull, Push } = require('zeromq');
const fs = require('fs');
const { execSync } = require('child_process');
const crypto = require('crypto');
const Hash = require('./hash');
const Queue = require('./queue');

require('dotenv').config();

class Worker {
  constructor(name = 'no_name') {
    this.name = name;
    this.working = false;
    this.taskQueue = [];
    this.taskClass = null;
    this.hash = new Hash(process.env.token || 'unknown');
    this.outQueue = null;
    this.receiver = null;
    this.taskFile = 'null';
    this.id = Worker.getDeviceID();
    this.jobsDone = 0;
    this.init();
  }

  static getDeviceID() {
    try {
      const response = execSync('lscpu -J');
      const parsed = JSON.parse(response);
      const [flags] = parsed.lscpu.filter(((item) => item.field === 'Flags:'));
      return crypto.createHash('sha1').update(flags.data).digest('hex');
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  async init() {
    const receiver = new Pull();
    this.outQueueSocket = new Push();
    this.outQueueSocket.sendHighWaterMark = 1000;
    this.outQueueSocket.sendTimeout = 0;
    const ip = process.env.ip === '' || !process.env.ip ? '127.0.0.1' : process.env.ip;
    const port = Number(process.env.port) || 8080;
    console.log(`Connecting to ${ip}:${port}`);
    receiver.connect(`tcp://${ip}:${port}`);
    console.log(`Connecting to ${ip}:${(port + 1)}`);
    this.outQueueSocket.connect(`tcp://${ip}:${port + 1}`);

    this.outQueue = new Queue(this.outQueueSocket, 10000);
    this.receiver = receiver;
    this.onNewWork();
  }

  async onNewWork() {
    const self = this;
    for await (const [msg] of this.receiver) { //
      if (msg.length === 0) {
        this.receiver.close();
        console.log('received: <empty message>');
        process.exit(1);
      } else {
        const message_ = this.hash.decrypt(JSON.parse(msg));
        if (message_ === 'Decryption failed.' || !message_) {
          console.error('[Error] Failed to decrypt job data!\n[Hint] Check your token!');
          return;
        }

        const job = JSON.parse(JSON.parse(message_));
        if (this.working) {
          this.taskQueue.push(job);
          continue;
        }
        try {
          this.working = true;
          if (this.taskFile !== job.exec.file || !this.taskClass) { // exec file has changed
            await Worker.writeFile(job.exec.name, job.exec.file, 'base64');
            delete require.cache[require.resolve(`./${job.exec.name}`)]; // delete Task [cahced]
            await require(`./${job.exec.name}`).checkInstallDeps(job.exec.dependencies);
            this.taskFile = job.exec.file;
            const Task = require(`./${job.exec.name}`);
            this.taskClass = new Task();
          }

          // const result = await task.run();
          this.doJobs(job);
        } catch (e) {
          console.log(e);
        }
      }
    }
  }

  doJobs(job) {
    this.taskClass.run(job).then(async (result) => {
      const answer = {
        worker: {
          id: this.id,
          name: this.name,
        },
        data: result,
      };
      const encrypted = this.hash.encrypt(JSON.stringify(answer));
      this.outQueue.send(JSON.stringify(encrypted));
      // self.receiver.send();
      this.jobsDone += 1;
      console.log(`Jobs Completed : ${this.jobsDone} jobQueue: ${this.taskQueue.length}`);
      this.working = false;
      this.takeJobsFromQueue();
    });
  }

  takeJobsFromQueue() {
    for (let i = 0; i < this.taskQueue.length; i += 1) {
      this.doJobs(this.taskQueue.shift());
    }
  }

  static async writeFile(file, data, encoding) {
    return new Promise((resolve, reject) => {
      fs.writeFile(file, data, encoding, (err) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  static genRandomID(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random()
    * charactersLength));
    }
    return result;
  }
}
module.exports = Worker;
