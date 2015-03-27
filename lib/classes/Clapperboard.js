var util = require("util");
var events = require("events");
var PIN = require('./PIN').PIN;


var frequencyConnected0 = 50;
var frequencyConnected1 = 500;
var frequencyConnected = frequencyConnected0;
var frequencyNotConnected = 500;



var Clapperboard = function(){
  this._pin = 2;
  this._pinActive=false;
  this._timeout = 1000;
  events.EventEmitter.call(this);
}
util.inherits(Clapperboard, events.EventEmitter);

Object.defineProperty(Clapperboard.prototype, 'pin', {
    get: function() {
        return this._pin;
    },
    set: function(pin) {
        this._pin = pin;
    }
});



Object.defineProperty(Clapperboard.prototype, 'timeout', {
    get: function() {
        return this._timeout;
    },
    set: function(timeout) {
        this._timeout = timeout;
    }
});

Clapperboard.prototype.set = function(){
  var me = this;
  me.board = new PIN(me._pin);
  me.board.on('started',function(){
    me._pinActive=true;

    me.open();
    setTimeout(me.open.bind(me),me._timeout*2);
    setTimeout(me.open.bind(me),me._timeout*4);

  });
  me.board.start();
}

Clapperboard.prototype.close = function(){
  var me = this;
  log('debug','Clapperboard','closing ' + (typeof me.board==='object') +'.'+ (me._pinActive))
  if ( (typeof me.board==='object') && (me._pinActive) ){

    me.board.set(false);
    me.emit('close');
  }
}

Clapperboard.prototype.open = function(){
  var me = this;
  if ( (typeof me.board==='object') && (me._pinActive) ){
    me.board.set(true);
    me.emit('open');
    log('debug','Clapperboard','open for '+me._timeout+'ms')
    setTimeout(me.close.bind(me),me._timeout);
  }
}

exports.Clapperboard = Clapperboard;
