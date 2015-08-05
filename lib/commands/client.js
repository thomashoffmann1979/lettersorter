(function() {
  var Client, ClientCMD, Command, fs, i, j, params, path,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Command = require('tualo-commander').Command;

  path = require('path');

  fs = require('fs');

  Client = require('../main').Client;

  params = [
    {
      parameter: "-m, --magellan",
      description: "use usb-com scanner"
    }, {
      parameter: "-l, --lohi",
      description: "close clapperboard on lohi event, default hilo"
    }, {
      parameter: "-n, --nodiscover",
      description: "do not check if there is allread on service running"
    }, {
      parameter: "-b, --boards [boards]",
      description: "the number of boards to be used"
    }, {
      parameter: "-d, --global_delay [global_delay]",
      description: "global delay for open a box, defaults to 500ms"
    }, {
      parameter: "-t, --global_timeout [global_timeout]",
      description: "global timeout for close a box, defaults to 1000ms"
    }
  ];

  for (i = j = 1; j <= 12; i = ++j) {
    params.push({
      parameter: "-p" + i + ", --boardPin" + i + " [boardPin" + i + "]",
      description: "pin number of boards #" + i + ""
    });
    params.push({
      parameter: "-o" + i + ", --optoPin" + i + " [optoPin" + i + "]",
      description: "pin number of optical switch #" + i + ""
    });
    params.push({
      parameter: "-d" + i + ", --delay" + i + " [delay" + i + "]",
      description: "delay for opening the board #" + i + ""
    });
    params.push({
      parameter: "-t" + i + ", --timeout" + i + " [timeout" + i + "]",
      description: "timeout for closing the board #" + i + ""
    });
  }

  module.exports = ClientCMD = (function(superClass) {
    extend(ClientCMD, superClass);

    function ClientCMD() {
      return ClientCMD.__super__.constructor.apply(this, arguments);
    }

    ClientCMD.commandName = 'client';

    ClientCMD.commandArgs = [];

    ClientCMD.commandShortDescription = 'run the client service';

    ClientCMD.options = params;

    ClientCMD.help = function() {
      return "";
    };

    ClientCMD.prototype.action = function(options, args) {
      var boardPin, boards, closeOnHiLO, delay, gd, gt, k, optoPin, ref, tag, timeout;
      this.client = new Client(typeof options.nodiscover === 'undefiend');
      gd = parseInt(options.global_delay || 500);
      gt = parseInt(options.global_timeout || 1000);
      if (options.magellan) {
        debug('options.magellan', '*');
        this.client.useSTDIN = false;
      }
      if (options.boards) {
        boards = parseInt(options.boards);
        if (boards > 12) {
          boards = 12;
        }
        closeOnHiLO = true;
        if (options.lohi) {
          closeOnHiLO = false;
        }
        for (i = k = 1, ref = boards; 1 <= ref ? k <= ref : k >= ref; i = 1 <= ref ? ++k : --k) {
          optoPin = options['optoPin' + i];
          boardPin = options['boardPin' + i];
          delay = options['delay' + i] || (i * gd);
          tag = 'K-' + i;
          timeout = options['timeout' + i] || gt;
          this.client.setUpBAO(tag, delay, timeout, boardPin, optoPin, closeOnHiLO);
        }
        return this.client.start();
      } else {
        this.client.displayPinSetup();
        return error('client', 'you have to set the number of boards');
      }
    };

    return ClientCMD;

  })(Command);

}).call(this);
