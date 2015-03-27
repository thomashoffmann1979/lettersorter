var util = require("util");
var events = require("events");
var socket = require('socket.io-client');
var Magellan = require('magellan').Magellan;
var PIN = require('./PIN').PIN;
var LED = require('./LED').LED;
var Clapperboard = require('./Clapperboard').Clapperboard;


var Client = function(){
  this._host = 'http://localhost:3000/';
  this._connected = false;
  this._io;
  this._isConnected = false;
  this._filter = '';
  this._pinNumber = 4;
  this._aliveNumber = 2;
  this._timing = 3000;
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


Object.defineProperty(Client.prototype, 'pinNumber', {
    get: function() {
        return this._pinNumber;
    },
    set: function(pinNumber) {
        this._pinNumber = pinNumber;
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

Object.defineProperty(Client.prototype, 'filter', {
    get: function() {
        return this._filter;
    },
    set: function(value) {
      if (value!==''){
        this.io.emit('filter',value);
      }
      this._filter = value;
    }
});


Client.prototype.start = function(){
  var me = this;
  me._io = socket(me.host);

  try{
    var magellan = new Magellan();
    magellan.read(me.onInput.bind(me));
  }catch(e){
      log('error','There is no Magellan Scanner');
  }

  me.alive = new LED();
  me.alive.pin=me.alivePinNumber;
  me.alive.set();
  me.alive.run();

  me.clapperboard = new Clapperboard();
  me.clapperboard.pin=me.pinNumber;
  me.clapperboard.set();
  me.clapperboard.timeout = me._timing;
  me.clapperboard.on('close',function(){
    log('debug','client','clapperboard closed');
  });
  me.clapperboard.on('open',function(){
    log('debug','client','clapperboard opened');
  });

  var stdin = process.openStdin();
  stdin.on('data', function(data){
    me.onSTDInput(data.toString());
  } );

  me._io.on('connect', me.onConnect.bind(me));
  me._io.on('filter removed', me.onFilterRemoved.bind(me));
  me._io.on('add id',me.onID.bind(me));
  me._io.on('disconnect', me.onDisconnect.bind(me));

}

Client.prototype.onInput = function(data){
  var me = this,
      input = data.replace(/\n/g,'');
  log('debug','client','input '+input);

  if (
    ( input.substring( 0,5 ) === 'SGSF-' ) ||
    ( input.substring(0,3) === 'SG-' ) ||
    ( input.substring(0,4) === 'PLZ-' )
  ){
    me.filter = input;
  }else{
    //this.io.emit('filter',data);
    if (typeof me._waitfor[input]==='number'){
      log('debug','client','i should open the box for '+input);
      me.clapperboard.open();

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
  if (me.filter!==''){
    // send the master how i am
    me.io.emit('filter',me.filter);
  }

}

Client.prototype.onFilterRemoved = function(data){
  log('debug','client','filter removed by server '+data);
  var me = this;
  me.filter = '';
  me._waitfor = {}; // reset all id's
}


Client.prototype.onID = function(data){
  var me = this,
      list = [],
      i,
      m;
  if (util.isArray(data)){
    list = data;
    me._waitfor = {}; // reset if we got send an list of id's
    log('debug','client','got an list of new ids by the server '+list.length);
  }else{
    list = [data];
    log('debug','client','got an new id by the server '+data);
  }
  m=list.length;
  for(i=0;i<m;i++){
    me._waitfor[list[i]]=0;
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
  notes[0] = me.padR( '3.3V+',6 );
  notes[13] = me.padR( '5V+',6 );
  notes[15] = me.padR( 'GND',6 );
  notes[me.pinNumber-1] = me.padR( 'Klappe',6 );
  notes[me.alivePinNumber-1] = me.padR( 'LED',6 );

  l+="\n";
  l+='|---------||---------|';
  l+="\n";

  for(y=0;y<13;y++){
    for(x=0;x<2;x++){
      l+='| ' + me.padR(notes[y+x*13],7)+' |';
    }
    l+="\n";
    l+='|---------||---------|';
    l+="\n";
  }
  console.log(l);
}


exports.Client = Client;
