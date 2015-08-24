(function() {
  var EventEmitter, PI, PIFace, e,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  try {
    PI = require('node-pifacedigital');
  } catch (_error) {
    e = _error;
  }

  module.exports = PIFace = (function(superClass) {
    extend(PIFace, superClass);

    function PIFace(tag, delay, timeout, boardPin, optoPin, closeOnHiLO, motorPin) {
      if (typeof closeOnHiLO === 'undefined') {
        closeOnHiLO = true;
      }
      this.tag = tag || 'node';
      this.delay = delay || 1;
      this.timeout = timeout || 1000;
      this.boardPin = boardPin || 0;
      this.optoPin = optoPin;
      this.motorPin = motorPin;
      this.closeOnHiLO = closeOnHiLO;
      this.boardOpenCounter = 0;
    }

    PIFace.prototype.setUp = function() {
      this.PI = new PI.PIFaceDigital(0, true);
      if (this.optoPin != null) {
        this.PI.watch(this.optoPin, this.onWatch.bind(this));
      }
      if (this.motorPin != null) {
        return this.PI.set(this.motorPin, 1);
      }
    };

    PIFace.prototype.onWatch = function(pin, type) {
      if (pin === this.optoPin) {
        if (this.closeOnHiLO && type === 'hilo') {
          return this.close();
        } else if (!this.closeOnHiLO && type === 'lohi') {
          return this.close();
        }
      }
    };

    PIFace.prototype.open = function() {
      setTimeout(this._open.bind(this), this.delay);
      return this._closeTimer = setTimeout(this.close.bind(this), this.timeout);
    };

    PIFace.prototype._open = function() {
      this.boardOpenCounter++;
      return this.PI.set(this.boardPin, 1);
    };

    PIFace.prototype.close = function() {
      debug('piface boardOpenCounter', this.boardOpenCounter);
      this.boardOpenCounter--;
      if (this.boardOpenCounter < 0) {
        this.boardOpenCounter = 0;
      }
      if (this.boardOpenCounter === 0) {
        return this.PI.set(this.boardPin, 0);
      }
    };

    return PIFace;

  })(EventEmitter);

}).call(this);
