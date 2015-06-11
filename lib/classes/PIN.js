var fs = require('fs');
var path = require('path');
var util = require("util");
var events = require("events");

var gpioPath = path.join( path.sep,'sys','class','gpio' );
var exportFile = path.join( gpioPath,'export' );

var interval = 5; // in milliseconds

//revision 2
var PIN_MAP = [
  -1,
  -1,-1,
  2,-1,
  3,-1,
  4,14,
  -1,15,
  17,18,
  27,-1,
  22,23,
  -1,24,
  10,-1,
  9,25,
  11,8,
  -1,7,

  -1,-1,
  5,-1,
  6,12,
  13,-1,
  19,16,
  26,20,
  -1,21

];

var PIN = function(pinNumber){
  if (typeof PIN_MAP[pinNumber]==='undefined'){
    throw  'This PIN is not supported #'+pinNumber;
  }
  if (PIN_MAP[pinNumber]===-1){
    throw  'This PIN is not allowed #'+pinNumber;
  }
  this._pin = PIN_MAP[pinNumber];
  this._current = path.join(gpioPath,"gpio"+this._pin);
  log('debug','pin','gpio '+this._current);
  events.EventEmitter.call(this);
}


util.inherits(PIN, events.EventEmitter);


Object.defineProperty(PIN, "pin", {
    get: function() {
      return this._pin;
    }
});
Object.defineProperty(PIN, "currentPath", {
    get: function() {
      return this._current;
    }
});

PIN.prototype.start = function(){
  var me = this;
  fs.exists(gpioPath,function(exists){
    if (exists){
      fs.exists(me._current,function(exists){
        if (exists){
          me.emit('started',true);
          log('debug','pin','exists '+me._current);
        }else{

          fs.writeFile(path.join(gpioPath,'export'),me._pin,function(err){
            if (err){
              me.emit('error',err);
              log('error','pin','export '+err);
            }else{
              setTimeout(function(){
                me.emit('started',true);
              },500);
              log('debug','pin','export '+me._current);
            }
          });
        }
      });
    }else{
      log('error','pin','no access to gpio');
    }
  })

}

PIN.prototype.out = function(){
  var me = this;
  fs.writeFile(path.join(me._current,'direction'),"out",function(err){
    if (err){
      me.emit('error',err);
      log('error','pin','out direction '+err);
    }else{
      setTimeout(function(){
        me.emit('set out',true);
      },500);

      log('debug','pin','out direction successful');
    }
  });
}



PIN.prototype.in = function(controll){
  var me = this;
  fs.writeFile(path.join(me._current,'direction'),"in",function(err){
    if (err){
      me.emit('error',err);
      log('error','pin','in direction '+err);
    }else{
      setTimeout(function(){
        me.emit('set in',true);
      },500);
      setTimeout(function(){
        if (controll===true){
          setInterval(function(){
            if (me.check()){
              me.emit('on',true);
            }
          }.bind(me),interval);
        }
        log('debug','pin','in direction successful');
      },500);
    }
  });
}

PIN.prototype.check = function(){
  var me = this;
  if (typeof me.lastState === 'undefined'){
    me.lastState = false;
  }
  var c = me.get();
  if (c){
    if (me.lastState === false){
      me.lastState = true;
      me.emit('LoHi',true);
      return true;
    }
  }else{
    if (me.lastState === true){
      me.emit('HiLo',true);
    }
    me.lastState = false;
  }
  return false;
}

PIN.prototype.set = function(v){
  if (v===true){
    v="1";
  }else{
    v="0";
  }
try{
  fs.writeFileSync(path.join(this._current,'value'),v+'');
}catch(e){
  log('error','PIN',path.join(this._current,'value'));
  log('error','PIN',e);

}
}

PIN.prototype.get = function(v){

    return (fs.readFileSync(path.join(this._current,'value')).toString().trim() === '0')? false:true;

}

exports.PIN = PIN;
