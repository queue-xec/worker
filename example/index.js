const Worker = require('../index');
// const Worker = require('queue-xec-worker')

// set here only for example , transferEncryptToken
process.env.transferEncryptToken = '00000000000000000000000000000000';
process.env.token = 'demoCHannel0';
process.env.LOG_LEVEL = 'debug';

async function run() {
  // eslint-disable-next-line no-unused-vars
  const work1 = new Worker({
    token: process.env.token, // token generated from Master
    name: 'worker_1',
    loglevel: process.env.LOG_LEVEL, // off -> info -> warn -> error -> debug
    transferEncryptToken: process.env.transferEncryptToken, // token generated from Master
  }); // work1 instance is ready for incoming new tasks
}
run();
