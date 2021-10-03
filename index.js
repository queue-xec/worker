const  {Dealer} = require("zeromq")
const Hash = require('./hash')
const fs = require("fs")
const envfile = require('envfile')
const sourcePath = '.env'
const prompts = require('prompts');
const { program } = require('commander');
const version = require('./package.json').version

require('dotenv').config()
program.version(version);

function makeid(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * 
charactersLength));
 }
 return result;
}
async function setup(){
  const questions = [
    {
      type: 'text',
      name: 'ip',
      message: 'Enter server ip?'
    },
    {
      type: 'number',
      name: 'port',
      message: 'Enter port:',
      validate: port => port < 80 ? `Enter a valid port above 80` : true
    },
    {
      type: 'text',
      name: 'token',
      message: 'Servers token [32 length string]',
      validate: token => token.length < 32 ? 'Minimum length is 32' : true
    }
  ];
  const portQ = await prompts(questions);
  fs.writeFileSync('./.env', envfile.stringify(portQ)) 
  console.log('Settings stored in .env')
}
async function witeFile(file ,data, encoding){
  return new Promise(function(resolve, reject) {
    fs.writeFile(file, data, encoding, function(err) {
        if (err) reject(err);
        else resolve(data);
    });
});
}

class Worker {
    constructor(name = 'no_name'){
        this.name = name;
        this.receiver = null
        this.hash = new Hash(process.env.token|| 'unknown')
        this.taskFile = 'null_'
        this.jobsDone = 0
        this.init()
    }
    
    async  init(){
      const receiver = new Dealer({
        routingId: makeid(10)
      })
      const ip = process.env.ip === '' || !process.env.ip  ? '127.0.0.1' : process.env.ip
      const port = process.env.port || 8080
      console.log(`Connecting to ${ip}:${port}`)
      receiver.connect(`tcp://${ip}:${port}`)
      this.receiver  =receiver;
      this.onNewWork()
    }

    async onNewWork(){
      const self = this
      for await (const [msg] of  this.receiver ) { //
        if (msg.length === 0) {
          this.receiver.close()
          console.log("received: <empty message>")
          process.exit(1)
        } else {
          let message_ =  this.hash.decrypt(JSON.parse(msg))
          if (message_ === 'Decryption failed.' || !message_) {
            console.error('[Error] Failed to decrypt job data!\n[Hint] Check your token!')
            return;
            }

          let job = JSON.parse(message_)
          try{
            if (this.taskFile !== job.exec.file){ // exec file has changed
              await witeFile(job.exec.name ,job.exec.file, 'base64')
            
              delete require.cache[require.resolve(`./${job.exec.name}`)]     // delete Task [cahced]
              await require(`./${job.exec.name}`).checkInstallDeps(job.exec.dependencies)
              this.taskFile =  job.exec.file
            }
            let Task = require(`./${job.exec.name}`)
            let task = new Task(job)
            let result = await task.run()
            let encrypted = this.hash.encrypt(JSON.stringify(result))
            self.receiver.send(JSON.stringify(encrypted))
            this.jobsDone+= 1
            console.log(`Jobs Completed : ${this.jobsDone}`)
           }catch(e){
            console.log(e)
          }
        }
      }
        }

}
module.exports = Worker;

( async function () {
  program
  .option('-s, --setup', 'Setup/Register this worker')
  
  program.parse(process.argv);
  const options = program.opts();  
  switch (true) {
    case (options.setup):
      await setup()
      break;
    default:
      const work1 = new Worker('worker 1')
  }
}());
