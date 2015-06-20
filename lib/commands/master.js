(function() {
  var Command, Master, MasterCMD, fs, path,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('tualo-commander').Command;

  path = require('path');

  fs = require('fs');

  Master = require('../main').Master;

  module.exports = MasterCMD = (function(superClass) {
    extend(MasterCMD, superClass);

    function MasterCMD() {
      return MasterCMD.__super__.constructor.apply(this, arguments);
    }

    MasterCMD.commandName = 'master';

    MasterCMD.commandArgs = [];

    MasterCMD.commandShortDescription = 'run the master service';

    MasterCMD.help = function() {
      return "";
    };

    MasterCMD.prototype.action = function(options, args) {
      this.master = new Master;
      return this.master.start();
    };

    return MasterCMD;

  })(Command);

}).call(this);
