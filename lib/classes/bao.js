(function() {
  var BAO, Clapperboard, EventEmitter, PIN,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  PIN = require('./pin');

  Clapperboard = require('./clapperboard');

  module.exports = BAO = (function(superClass) {
    extend(BAO, superClass);

    function BAO(tag, delay, timeout, boardPin, optoPin) {
      this.tag = tag || 'node';
      this.delay = delay || 1;
      this.timeout = timeout || 1000;
      this.boardPin = boardPin || 3;
      this.optoPin = optoPin;
    }

    BAO.prototype.setUp = function() {
      var me;
      me = this;
      me.board = new Clapperboard(me.boardPin, me.timeout);
      me.board.on('open', function() {
        return me.emit('open');
      });
      me.board.on('close', function() {
        return me.emit('close');
      });
      me.board.setUp();
      if (typeof me.optoPin !== 'undefined') {
        me.opto = new PIN(me.optoPin);
        me.opto.on('started', function() {
          return me.opto["in"](true);
        });
        me.opto.on('HiLo', function() {
          debug('BAO', 'Hilo', 'emitted');
          return me.board.close();
        });
        me.opto.on('LoHi', function() {
          return debug('BAO', 'LoHi', 'emitted, do nothing');
        });
        return me.opto.start();
      }
    };

    BAO.prototype.close = function() {
      if (typeof this.board === 'object') {
        return this.board.close();
      }
    };

    BAO.prototype.open = function() {
      if (typeof this.board === 'object') {
        if (this.delay === 0) {
          return this.board.open();
        } else {
          return setTimeout(this.board.open.bind(this.board), this.delay);
        }
      }
    };

    return BAO;

  })(EventEmitter);

}).call(this);
