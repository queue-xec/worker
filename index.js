const  {Dealer} = require("zeromq")
// const Queue = require("./queue.js")

const timer = (ms) => new Promise((res) => setTimeout(res, ms));
function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min);
}
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
class Worker {
    constructor(name = 'no_name'){
        this.name = name;
        this.receiver = null
        this.init()
    }
    
    async  init(){
      const receiver = new Dealer({
        routingId: makeid(10)
      })
      receiver.connect("tcp://127.0.0.1:5555")
      this.receiver  =receiver;
      console.dir(receiver )
      this.onNewWork()
    }

    async onNewWork(){
      for await (const [msg] of  this.receiver ) {
        if (msg.length === 0) {
          this.receiver.close()
          console.log("received: <empty message>")
          process.exit(1)
        } else {
          let data =  JSON.parse(msg).load
          console.log(`[${this.name} - ${this.receiver.routingId}]received: ${msg}`)
          require("fs").writeFile("out.js",data, 'base64', function(err) {
            console.log(err);
          });
          await timer(randomIntFromInterval(10,1000))
        }
      }
        }
    subscribe(){

        console.log(`[${this.name}] subed`);
    }

}
 
const work1 = new Worker('worker 1')
const work2 = new Worker('worker 2')
work1.subscribe()
work2.subscribe()
setInterval(()=>{
     
},4000)


