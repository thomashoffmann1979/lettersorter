(function() {
  var Command, Dispatcher, DispatcherCMD, fs, path,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('tualo-commander').Command;

  path = require('path');

  fs = require('fs');

  Dispatcher = require('../main').Dispatcher;

  module.exports = DispatcherCMD = (function(superClass) {
    extend(DispatcherCMD, superClass);

    function DispatcherCMD() {
      return DispatcherCMD.__super__.constructor.apply(this, arguments);
    }

    DispatcherCMD.commandName = 'dispatcher';

    DispatcherCMD.commandArgs = [];

    DispatcherCMD.commandShortDescription = 'run the dispatcher service';

    DispatcherCMD.help = function() {
      return "";
    };

    DispatcherCMD.prototype.action = function(options, args) {
      this.dispatcher = new Dispatcher;
      return this.dispatcher.start();
    };

    return DispatcherCMD;

  })(Command);

}).call(this);
