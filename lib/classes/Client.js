var util = require("util");
var events = require("events");
var socket = require('socket.io-client');
var PIN = require('./PIN').PIN;

var Client = function(){
  this._host = 'http://localhost:3000/';
  this._connected = false;
  this._io;
  this._isConnected = false;
  this._filter = '';
  this._pinNumber = 25;
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


Object.defineProperty(Client.prototype, 'pinNumber', {
    get: function() {
        return this._pinNumber;
    },
    set: function(pinNumber) {
        this._pinNumber = pinNumber;
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

  var stdin = process.openStdin();
  stdin.on('data', me.onSTDInput.bind(me) );
  me._io.on('connect', me.onConnect.bind(me));
  me._io.on('filter removed', me.onFilterRemoved.bind(me));
  me._io.on('add id',me.onID.bind(me));
  me._io.on('disconnect', me.onDisconnect.bind(me));
}

Client.prototype.onSTDInput = function(data){
  var me = this,
      input = data.toString().replace(/\n/g,'');
  log('debug','client','got std input '+input);

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
    }else{
      log('debug','client','the id '+input+' is not for me ');
    }
  }
}

Client.prototype.onConnect = function(data){
  var me = this;

  me._isConnected = true;
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

  //log('debug','client',data);
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
  this._isConnected = false;
  log('debug','client','disconnect');
}

exports.Client = Client;
