var fs = require('fs');
var path = require('path');
var util = require("util");
var events = require("events");

var gpioPath = path.join( path.sep,'sys','class','gpio' );
var exportFile = path.join( gpioPath,'export' );

var interval = 10; // in milliseconds

var PIN = function(pinNumber){
  this._pin = pinNumber;
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
  fs.exists(me._current,function(exists){
    if (exists){
      me.emit('started',true);
      log('debug','pin','exists '+me._current);
    }else{
      fs.writeFile(path.join(gpioPath,'export'),me.pin,function(err){
        if (err){
          me.emit('error',err);
          log('error','pin','export '+err);
        }else{
          me.emit('started',true);
          log('debug','pin','export '+me._current);
        }
      });
    }
  });
}

PIN.prototype.out = function(){
  var me = this;
  fs.writeFile(path.join(me._current,'direction'),"out",function(err){
    if (err){
      me.emit('error',err);
      log('error','pin','out direction '+err);
    }else{
      me.emit('set out',true);
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
      me.emit('set in',true);
      if (controll===true){
        setInterval(function(){
          if (me.check()){
            me.emit('on',true);
          }
        }.bind(me),interval);
      }
      log('debug','pin','in direction successful');
    }
  });
}

PIN.prototype.check = function(){
  if (typeof this.lastState === 'undefined'){
    this.lastState = false;
  }
  var c = this.get();
  if (c){
    if (this.lastState === false){
      this.lastState = true;
      return true;
    }
  }else{
    this.lastState = false;
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
