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

(async function () {
  program
    .option('-s, --setup', 'Setup/Register this worker')
    .option('-id', 'Get device unique id');

  program.parse(process.argv);
  const options = program.opts();
  switch (true) {
    case (options.setup):
      await setup();
      break;
    case (options.Id):
      Worker.getDeviceID();
      break;
    default:
      const work1 = new Worker();
      break;
  }
}());
