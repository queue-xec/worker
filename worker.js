const envfile = require('envfile');
const fs = require('fs');
const prompts = require('prompts');
const { program } = require('commander');
const Worker = require('./index');
const { version } = require('./package.json');

program.version(version);

async function setup() {
  const questions = [
    {
      type: 'text',
      name: 'ip',
      message: 'Enter server ip?',
    },
    {
      type: 'number',
      name: 'port',
      message: 'Enter port:',
      validate: (port) => (port < 80 ? 'Enter a valid port above 80' : true),
    },
    {
      type: 'text',
      name: 'token',
      message: 'Servers token [32 length string]',
      validate: (token) => (token.length < 32 ? 'Minimum length is 32' : true),
    },
  ];
  const portQ = await prompts(questions);
  fs.writeFileSync('./.env', envfile.stringify(portQ));
  console.log('Settings stored in .env');
}

(async function () {
  program
    .option('-s, --setup', 'Setup/Register this worker');

  program.parse(process.argv);
  const options = program.opts();
  switch (true) {
    case (options.setup):
      await setup();
      break;
    default:
      const work1 = new Worker('worker 1');
  }
}());
