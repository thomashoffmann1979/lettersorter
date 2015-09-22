(function() {
  var Clapperboard, EventEmitter, PIN,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  PIN = require('./pin');

  module.exports = Clapperboard = (function(superClass) {
    extend(Clapperboard, superClass);

    function Clapperboard(pin, timeout) {
      this.pin = pin || 2;
      this.timeout = timeout || 500;
      this.active = false;
      this.timer = null;
      this.openindex = 0;
    }

    Clapperboard.prototype.state = function() {
      return debug('clapperboard', 'PIN ' + this.pin + ' INDEX' + this.openindex + ' ');
    };

    Clapperboard.prototype.setUp = function() {
      this.board = new PIN(this.pin);
      this.board.on('started', (function(_this) {
        return function() {
          return _this.onBoardStarted();
        };
      })(this));
      this.board.on('set out', (function(_this) {
        return function() {
          return _this.onBoardSetOut();
        };
      })(this));
      return this.board.start();
    };

    Clapperboard.prototype.onBoardStarted = function() {
      return this.board.out();
    };

    Clapperboard.prototype.onBoardSetOut = function() {
      this.active = true;
      console.log('PIN ON', this.pin, this.openindex);
      return this.open();
    };

    Clapperboard.prototype.setTimeout = function() {
      return this.timer = setTimeout(this.close.bind(this), this.timeout);
    };

    Clapperboard.prototype.clear = function() {
      if (this.timer != null) {
        clearTimeout(this.timer);
        return this.timer = null;
      }
    };

    Clapperboard.prototype.close = function() {
      this.openindex--;
      if (this.openindex < 0) {
        this.openindex = 0;
      }
      if (this.openindex === 0) {
        this.board.set(false);
        debug('clapperboard', 'close');
        return this.emit('close', true);
      }
    };

    Clapperboard.prototype.open = function() {
      if (this.active === true) {
        this.openindex++;
        this.board.set(true);
        debug('clapperboard', 'open');
        this.emit('open', true);
        this.clear();
        return this.setTimeout();
      }
    };

    return Clapperboard;

  })(EventEmitter);

}).call(this);
