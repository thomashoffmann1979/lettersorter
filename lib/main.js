

var colors = require("colors");

global.log = function(type,tag,msg){
  switch(type){
    case 'debug':
      console.log( colors.blue(type),colors.gray(tag),msg );
    break;
    case 'info':
      console.log( colors.green(type),colors.gray(tag),msg );
    break;
    case 'warn':
      console.log( colors.yellow(type),colors.gray(tag),msg );
    break;
    case 'error':
      console.log( colors.red(type),colors.gray(tag),msg );
    break;
  }
}

var classNames = ['Master','Client','OCR','DBClient'];
for(var i=0;i<classNames.length;i++){
  exports[classNames[i]] = (require('./classes/'+classNames[i]))[classNames[i]];
}
/*



var readline = require('readline');
var clss = require('./classes');

exports.master = function(url,client,username,password,port){

}


var PIN = require("./pin");
var ERP = require("./erpconnection").ERPConnection;


var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});



var sortfolder = "UNBEKANNT";
var activity;
var close;
var sortfolderState = false;

var pin_2;
var pin_4;
var pin_6;
var erp;

exports.master = function(url,client,username,password,port){
  erp = new ERP({
    url: url,
    client: client,
    username: username,
    password: password
  });
  erp.login(function(){
    input();
  });
}

exports.client = function(port){

  try{
    pin_2 = PIN.create(2);
    pin_4 = PIN.create(4);
    pin_6 = PIN.create(25);
    pin_2.out();
    pin_6.out();
    pin_4.in(function(){
      log('debug','main','pressed');
      pin_6.set(false);
      sortfolderState = false;
      clearTimeout(close);
      log('debug','main','schliesse die klappe');
      drawWindow();
    });

    activity = setInterval(function(){
      var v = pin_2.get();
      pin_2.set(!v);
    },500);

  }catch(e){
    log('error','main','error while setting up gpio '+e);
  }


}


var alignText = function(align,text,width,placeholder){
  var i = 0;
  var r = '';
  var spacer = (placeholder)?placeholder:' ';
  if (text.length>width){
    text = text.substring(0,width);
  }
  if (align==='L'){
    r+=text;
    for(var i=0;i<width-text.length;i++){
      r+=spacer;
    }
  }else if (align==='R'){

    for(var i=0;i<width-text.length;i++){
      r+=spacer;
    }
    r+=text;
  }else if (align==='C'){

    for(var i=0;i<Math.floor( (width-text.length)/2 );i++){
      r+=spacer;
    }
    r+=text;
    for(var i=0;i<Math.ceil( (width-text.length)/2 );i++){
      r+=spacer;
    }
  }else{
    r = text;
  }

  return r;
}

var drawWindow = function(opt){
  var i,
      txt;

  var size = require('window-size');

  if (typeof opt==='undefined'){
    opt={};
  }

  if (typeof opt.title==='undefined'){
    opt.title = " "+sortfolder+" ";
  }
  var signalWidth = Math.ceil(size.width*0.1);
  for(i=0;i<size.height;i++){
    if (i===2){
      txt = alignText('C',opt.title,size.width,'-').yellow.bgBlue.bold;
    }else if (i>3){
      txt = alignText('R','',size.width - signalWidth,' ').gray.bgBlue;
      if (sortfolderState){
        txt += alignText('R',' ', signalWidth,' ').gray.bgRed;
      }else{
        if (typeof pin_2==='undefined'){
          txt += alignText('R',' ', signalWidth,' ').gray.bgYellow;
        }else{
          txt += alignText('R',' ', signalWidth,' ').gray.bgGreen;
        }
      }
    }else{
      txt = alignText('R','',size.width,'-').white.bgBlue;
    }
    console.log(txt);
  }

}



var input = function(){

  drawWindow();
  rl.question("> ", function(answer) {
    //log('info','main',"your input: " + answer);
    if (isNaN(answer)) {
      if (answer==='q'){
        clearInterval(activity);
        if (typeof pin_2==='object'){
          pin_2.set(false);
        }
        rl.close();
        process.exit();
      }else if (answer.substring(0,2)==='SF'){
        sortfolder = answer;
      }
    }else{
      if ( (answer*1)%2 ){
        pin_6.set(true);
        sortfolderState = true;
        log('debug','main','öffne die klappe');
        close = setTimeout(function(){
          pin_6.set(false);
          sortfolderState = false;
          log('warn','main','schliesse die klappe *timeout*');
          drawWindow();
        },500);
      }else{
        log('debug','main','not for me');
        drawWindow();
      }
    }

    input();

  });

}
*/
