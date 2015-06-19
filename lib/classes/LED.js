(function() {
  var EventEmitter, LED, PIN, pulse,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  PIN = require('./pin');

  pulse = {
    connected: [100, 500],
    notConnected: [900]
  };

  module.exports = LED = (function(superClass) {
    extend(LED, superClass);

    function LED(pin) {
      this.pulse = pulse;
      this.pin = pin || 27;
      this.active = false;
      this.connected = false;
      this.alive = true;
      this.timer = null;
      this.openindex = 0;
    }

    LED.prototype.setUp = function() {
      this.led = new PIN(this.pin);
      this.led.on('started', (function(_this) {
        return function() {
          return _this.onLEDStarted();
        };
      })(this));
      this.led.on('set out', (function(_this) {
        return function() {
          return _this.onLEDSetOut();
        };
      })(this));
      return this.led.start;
    };

    LED.prototype.onLEDStarted = function() {
      return this.led.out();
    };

    LED.prototype.onLEDSetOut = function() {
      return this.active = true;
    };

    LED.prototype.run = function() {
      var frequencies, index;
      frequencies = this.connected ? this.pulse.connected : this.pulse.notconnected;
      index = frequencies.indexOf(this.timeout);
      index++;
      if (index > frequencies.length) {
        index = 0;
      }
      this.timeout = frequencies[index];
      return setTimeout(this.onTimeout.bind(this), this.timeout);
    };

    LED.prototype.onTimeout = function() {
      if (this.alive) {
        this.alive = false;
      } else {
        this.alive = true;
      }
      this.led.set(this.alive);
      return this.run();
    };

    return LED;

  })(EventEmitter);

}).call(this);
