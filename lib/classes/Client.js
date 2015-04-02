var util = require("util");
var events = require("events");
var socket = require('socket.io-client');
var Magellan = require('magellan').Magellan;
var PIN = require('./PIN').PIN;
var LED = require('./LED').LED;
var BAO = require('./BAO').BAO;


var Client = function(){
  this._host = 'http://localhost:3000/';
  this._connected = false;
  this._io;
  this._isConnected = false;

  this.state = 'none';
  this._filterFor = '';
  this._baos = {};
  this._aliveNumber = 26;

  this._timing = 2000;
  this._waitfor = {}; // hash of id's this client is waiting for

  events.EventEmitter.call(this);
}


util.inherits(Client, events.EventEmitter);
Object.defineProperty(Client.prototype, 'connected', {
    get: function() {
      return this._connected;
    }
});

Object.defineProperty(Client.prototype, 'host', {
    get: function() {
        return this._host;
    },
    set: function(host) {
        this._host = host;
    }
});


Object.defineProperty(Client.prototype, 'timing', {
    get: function() {
        return this._timing;
    },
    set: function(timing) {
        this._timing = timing;
    }
});



Object.defineProperty(Client.prototype, 'alivePinNumber', {
    get: function() {
        return this._aliveNumber;
    },
    set: function(pinNumber) {
        this._aliveNumber = pinNumber;
    }
});

Object.defineProperty(Client.prototype, 'io', {
    get: function() {
        return this._io;
    }
});

Object.defineProperty(Client.prototype, 'isConnected', {
    get: function() {
        return this._isConnected;
    }
});
//process.env.ENV_VARIABLE

Client.prototype.setUpBAO = function(tag,delay,timeout,boardPin,optoPin){
  var me = this;
  me._baos[tag] = new BAO(tag,delay,timeout,boardPin,optoPin);
}

Client.prototype.start = function(){
  var me = this,tag;
  me._io = socket(me.host);

  try{
    var magellan = new Magellan();
    magellan.read(me.onInput.bind(me));
  }catch(e){
    log('info','There is no Magellan Scanner');
  }

  me.alive = new LED();
  me.alive.pin=me.alivePinNumber;
  me.alive.set();
  me.alive.run();

  for(tag in me._baos){
    if (me._baos.hasOwnProperty(tag)){
      log('debug','Client',tag);
      me._baos[tag].setUp();
    }
  }

  var stdin = process.openStdin();
  stdin.on('data', function(data){
    me.onInput(data.toString());
  }.bind(me) );

  me._io.on('connect', me.onConnect.bind(me));
  me._io.on('filter removed', me.onFilterRemoved.bind(me));
  me._io.on('add id',me.onID.bind(me));
  me._io.on('disconnect', me.onDisconnect.bind(me));

}

Client.prototype.onInput = function(data){
  var me = this,
      filterTag,
      input = data.replace(/\n/g,'');

  log('debug','client','input '+input+' '+me.state);

  if ( ( input.substring( 0,2 ) === 'K-' ) ){
    me.state='proc';
    me._filterFor = input;
    log('info','client','wait for box-card for '+me._filterFor);
    setTimeout(function(){
      me.state=='none';
      log('info','client','reset proc state');
    },5000);
  }else if (
    (me.state=='proc')
    && (
      ( input.substring( 0,5 ) === 'SGSF-' ) ||
      ( input.substring(0,3) === 'SG-' ) ||
      ( input.substring(0,4) === 'PLZ-' )
    )
  ){
    log('debug','client','filter '+input+' on '+me._filterFor);
    me._baos[me._filterFor].filter = input;
    me.io.emit('filter',{
      tag: me._filterFor,
      filter: input
    });
  }else{
    //this.io.emit('filter',data);
    if (typeof me._waitfor[input] === 'string'){
      filterTag = me._waitfor[input];
      log('debug','Client','i should open the box for '+filterTag+' #'+input);
      if (typeof me._baos[filterTag] === 'object'){
        me._baos[filterTag].open();
      }
    }else{
      log('debug','client','the id '+input+' is not for me ');
    }
  }
}

Client.prototype.onConnect = function(data){
  var me = this;

  me._isConnected = true;
  me.alive.connected = true;
  log('debug','client','connect');

  // send the master how i am
  for(tag in me._baos){
    if (me._baos.hasOwnProperty(tag)){
      if ( (typeof  me._baos[tag].filter==='string') && (me._baos[tag].filter!='') ){
        me.io.emit('filter',{
          tag: tag,
          filter: me._baos[tag].filter
        });
      }
    }
  }

}

Client.prototype.onFilterRemoved = function(tag){
  log('debug','client','filter removed by server '+tag);
  var me = this;

  me._baos[tag].filter = '';
  for(id in me._waitfor){
    if (me._waitfor.hasOwnProperty(id)){
      if (me._waitfor[id]==tag){
        delete me._waitfor[id];
      }
    }
  }

}


Client.prototype.onID = function(v){
  var me = this,
      list = [],
      i,
      m,
      data=v.data,
      tag = v.tag;

  if (util.isArray(data)){
    list = data;
    me.onFilterRemoved(tag);
    log('debug','Client','got an list of new ids by the server '+list.length);
  }else{
    list = [data];
    log('debug','Client','got an new id by the server '+data);
  }
  m=list.length;
  console.log(list);
  for(i=0;i<m;i++){
    me._waitfor[list[i]]=tag;
  }
}

Client.prototype.onDisconnect = function(data){
  var me = this;
  me._isConnected = false;
  me.alive.connected = false;
  log('debug','client','disconnect');
}




Client.prototype.padR = function (str,length){
  while(str.length<length){
    str+=' ';
  }
  return str.substring(0,length);
}

Client.prototype.displayPinSetup = function(data){
  var i,y,x,l='',me=this,notes = [];

  for(i=1;i<27;i++){
    notes[i-1] = me.padR( '---' );
  }
  notes[0] = me.padR( '3.3V+',8 );
  notes[13] = me.padR( '5V+',8 );
  notes[15] = me.padR( 'GND',8 );

  for(tag in me._baos){
    if (me._baos.hasOwnProperty(tag)){
      notes[ me._baos[tag].boardPin - 1]  = tag+' B';
      notes[ me._baos[tag].optoPin - 1]   = tag+' O';
    }
  }
  notes[me.alivePinNumber-1] = me.padR( 'LED' ,6 );


  l+="\n";
  l+='|-------------------||-------------------|';
  l+="\n";

  for(y=0;y<13;y++){
    for(x=0;x<2;x++){
      pn = me.padR( '#'+(1+y+x*13)+'', 4);
      l+='| '+pn+' | ' + me.padR(notes[y+x*13],10)+' |';
    }
    l+="\n";
    l+='|-------------------||-------------------|';
    l+="\n";
  }
  console.log(l);
}


exports.Client = Client;
