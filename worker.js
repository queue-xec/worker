/* eslint-disable no-console */
const envfile = require('envfile');
const fs = require('fs');
const prompts = require('prompts');
const { program } = require('commander');
const Worker = require('./src');
const { version } = require('./package.json');

program.version(version);

async function setup() {
  const questions = [
    {
      type: 'text',
      name: 'transferEncryptToken',
      message: 'Enter Transfer Encrypt Token:',
      validate: (transferEncryptToken) => (transferEncryptToken.length < 32 ? 'Minimum length is 32' : true),
    },
    {
      type: 'text',
      name: 'token',
      message: 'Enter Master token :',
      validate: (token) => (token.length < 20 ? 'Minimum length for token is 20 characters!' : true),
    },
  ];
  const ans = await prompts(questions);
  fs.writeFileSync('./.env', envfile.stringify(ans));
  console.log('Settings stored in .env');
}

(async function init() {
  program.option('-s, --setup', 'Setup/Register this worker');

  program.parse(process.argv);
  const options = program.opts();
  if (options.setup) {
    await setup();
    return;
  }

  const worker = new Worker();
  worker.requestWork();
})();
