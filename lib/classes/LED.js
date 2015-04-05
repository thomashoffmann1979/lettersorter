var util = require("util");
var events = require("events");
var PIN = require('./PIN').PIN;


var frequencyConnected0 = 100;
var frequencyConnected1 = 500;
var frequencyConnected = frequencyConnected0;
var frequencyNotConnected = 500;



var LED = function(){
  this._pin = 2;
  this._aliveFlag = true;
  this._pinActive=false;
  this._isConnected = false;
  events.EventEmitter.call(this);
}
util.inherits(LED, events.EventEmitter);

Object.defineProperty(LED.prototype, 'pin', {
    get: function() {
        return this._pin;
    },
    set: function(pin) {
        this._pin = pin;
    }
});


Object.defineProperty(LED.prototype, 'connected', {
    get: function() {
        return this._isConnected;
    },
    set: function(connected) {
        this._isConnected = connected;
    }
});

LED.prototype.set = function(){
  var me = this;
  me.led = new PIN(me._pin);
  log('debug','LED','set');
  me.led.on('started',function(){
    me.led.out();
  });
  me.led.on('set out',function(){
    log('debug','LED','active');
    me._pinActive=true;
  });
  me.led.start();
}

LED.prototype.run = function(){
  var me = this;
  setTimeout(function(){
    if (me.aliveFlag){
      me.aliveFlag = false;
    }else{
      me.aliveFlag = true;
    }
    if ( (typeof me.led==='object') && (me._pinActive) ){
      me.led.set(me.aliveFlag);
    }
    me.run();

    if (frequencyConnected===frequencyConnected0){
      frequencyConnected=frequencyConnected1;
    }else{
      frequencyConnected=frequencyConnected0;
    }
  }.bind(me),me._isConnected?frequencyConnected:frequencyNotConnected);
}

exports.LED = LED;
