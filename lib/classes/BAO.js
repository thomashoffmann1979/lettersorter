var util = require("util");
var events = require("events");
var PIN = require('./PIN').PIN;
var Clapperboard = require('./Clapperboard').Clapperboard;

/*
*/
var BAO = function(tag,delay,timeout,boardPin,optoPin){
  if (typeof tag==='undefined'){ tag='none'; }
  if (typeof boardPin==='undefined'){ boardPin=2; }
  if (typeof timeout==='undefined'){ timeout=1000; }
  if (typeof delay==='undefined'){ delay=1; }

  this._tag = tag;
  this._delay = delay;
  this._boardPin = boardPin;
  this._optoPin  = optoPin;
  this._timeout  = timeout;
  events.EventEmitter.call(this);
}
util.inherits(BAO, events.EventEmitter);

Object.defineProperty(BAO.prototype, 'boardPin', {
    get: function() {
        return this._boardPin;
    },
    set: function(pin) {
        this._boardPin = pin;
    }
});

Object.defineProperty(BAO.prototype, 'optoPin', {
    get: function() {
        return this._optoPin;
    },
    set: function(pin) {
        this._optoPin = pin;
    }
});



Object.defineProperty(BAO.prototype, 'timeout', {
    get: function() {
        return this._timeout;
    },
    set: function(timeout) {
        this._timeout = timeout;
    }
});

BAO.prototype.setUp = function(){

  var me = this;
  log('debug','BAO','setting up board for '+me._tag+' pin-number '+me._boardPin);
  me.board = new Clapperboard(me._boardPin,me._timeout);
  me.board.on('open',function(){
    log('debug','BAO','open PIN '+me._boardPin);
    me.emit('open');
  });
  me.board.on('close',function(){
    log('debug','BAO','closing PIN '+me._boardPin);
    me.emit('close');
  });
  me.board.setUp();

  if (typeof me._optoPin!=='undefined'){
    log('debug','BAO','setting up opto for '+me._tag+' pin-number '+me._optoPin);
    me.opto = new PIN(me._optoPin);
    me.opto.on('started',function(){
      me.opto.in(true);
    });
    me.opto.on('set in',function(){

    });
    me.opto.on('HiLo',function(){
      log('debug','BAO','hilo');
      me.board.close();
    });
    me.opto.start();
  }
}
// 156074151275 15607424275
BAO.prototype.close = function(){
  var me = this;
  if ( (typeof me.board==='object') ){
    log('debug','BAO','closing pin-number '+me._boardPin);
    me.board.close();
  }
}

BAO.prototype.open = function(){
  var me = this;
  if ( (typeof me.board==='object')   ){
    log('debug','BAO','opening pin-number '+me._boardPin+' in '+me._delay+'ms');
    if (me._delay===0){
      me.board.open();
    }else{
      setTimeout(function(){
        me.board.open();
      },me._delay);
    }
  }
}

exports.BAO = BAO;
