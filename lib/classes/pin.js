(function() {
  var EventEmitter, PIN, PIN_MAP, fs, gpioExportFile, gpioPath, path,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  path = require('path');

  fs = require('fs');

  PIN_MAP = [-1, -1, -1, 2, -1, 3, -1, 4, 14, -1, 15, 17, 18, 27, -1, 22, 23, -1, 24, 10, -1, 9, 25, 11, 8, -1, 7, -1, -1, 5, -1, 6, 12, 13, -1, 19, 16, 26, 20, -1, 21];

  gpioPath = path.join(path.sep, 'sys', 'class', 'gpio');

  gpioExportFile = path.join(gpioPath, 'export');

  module.exports = PIN = (function(superClass) {
    extend(PIN, superClass);

    function PIN(pinNumber) {
      if (typeof PIN_MAP[pinNumber] === 'undefined') {
        throw new Error('This pin number is not supported *' + pinNumber + '*');
      }
      if (PIN_MAP[pinNumber] === -1) {
        throw new Error('This pin number is not allowed *' + pinNumber + '*');
      }
      this.pin = PIN_MAP[pinNumber];
      this.currentPath = path.join(gpioPath, "gpio" + this.pin);
      this.currentDirection = path.join(gpioPath, "gpio" + this.pin, 'direction');
      this.currentValue = path.join(gpioPath, "gpio" + this.pin, 'value');
      this.canUseGPIO = false;
    }

    PIN.prototype.start = function() {
      return fs.exists(gpioPath, (function(_this) {
        return function(exists) {
          return _this.onGPIOExists(exists);
        };
      })(this));
    };

    PIN.prototype.ready = function() {
      return this.emit('started', true);
    };

    PIN.prototype.error = function(error) {
      return this.emit('error', error);
    };

    PIN.prototype.onGPIOExists = function(exists) {
      if (exists) {
        this.canUseGPIO = true;
        return fs.exists(this.currentPath, (function(_this) {
          return function(exists) {
            return _this.onCurrentGPIOExists(exists);
          };
        })(this));
      } else {
        return this.emit('error', new Error('No access to GPIO'));
      }
    };

    PIN.prototype.onCurrentGPIOExists = function(exists) {
      if (exists) {
        return this.ready();
      } else {
        return fs.writeFile(gpioExportFile, this.pin, (function(_this) {
          return function(error) {
            return _this.onCurrentGPIOExported(error);
          };
        })(this));
      }
    };

    PIN.prototype.onCurrentGPIOExported = function(error) {
      if (error) {
        return this.error(error);
      } else {
        return setTimeout(this.ready.bind(this), 1500);
      }
    };

    PIN.prototype.out = function() {
      if (this.canUseGPIO === true) {
        return fs.writeFile(this.currentDirection, 'out', (function(_this) {
          return function(error) {
            return _this.onOut(error);
          };
        })(this));
      }
    };

    PIN.prototype.onOut = function(error) {
      if (error) {
        return this.error(error);
      } else {
        return this.emit('set out', true);
      }
    };

    PIN.prototype["in"] = function() {
      if (this.canUseGPIO === true) {
        return fs.writeFile(this.currentDirection, 'in', (function(_this) {
          return function(error) {
            return _this.onIn(error);
          };
        })(this));
      }
    };

    PIN.prototype.onIn = function(error) {
      if (error) {
        return this.error(error);
      } else {
        setTimeout(this.check, 5);
        return this.emit('set in', true);
      }
    };

    PIN.prototype.check = function() {
      var c;
      if (typeof this.lastState === 'undefined') {
        this.lastState = false;
      }
      c = this.get();
      setTimeout(this.check, 5);
      if (c === true) {
        if (lastState === false) {
          this.lastState = true;
          this.emit('LoHi', true);
          true;
        }
      } else {
        if (lastState === true) {
          this.emit('HiLo', true);
        }
        this.lastState = false;
      }
      return false;
    };

    PIN.prototype.set = function(v) {
      if (v === true) {
        v = '1';
      }
      if (v === false) {
        v = '0';
      }
      if (this.canUseGPIO === true) {
        return fs.writeFile(this.currentValue, v, (function(_this) {
          return function(error) {
            return _this.onValue(error);
          };
        })(this));
      }
    };

    PIN.prototype.onValue = function(error) {
      if (error) {
        return this.error(error);
      } else {

      }
    };

    PIN.prototype.get = function() {
      var res;
      if (this.canUseGPIO === true) {
        res = fs.readFileSync(this.currentValue).toString().trim();
        if (res === '0') {
          return false;
        } else {
          return true;
        }
      }
    };

    return PIN;

  })(EventEmitter);

}).call(this);
