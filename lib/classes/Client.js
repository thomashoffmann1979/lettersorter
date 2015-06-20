(function() {
  var Client, EventEmitter, Magellan, PIN, colors, osenv, socket, util,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  Magellan = require('magellan-scanners').Magellan;

  socket = require('socket.io-client');

  colors = require('colors');

  osenv = require('osenv');

  util = require('util');

  PIN = require('./pin');

  module.exports = Client = (function(superClass) {
    extend(Client, superClass);

    function Client() {
      this.state = 'none';
      this.baos = {};
      this.baosIndex = 0;
      this.connected = false;
      this.host = 'http://localost:3000/';
      this.alivePinNumber = 26;
      this.useSTDIN = false;
      this.lastSetupFile = path.join(osenv.home(), '.sorter_last_setup.json');
      this.containers = ['PLZ', 'SG', 'SGSF'];
    }

    Client.prototype.setUpBAO = function(tag, delay, timeout, boardPin, optoPin) {
      this.baos[tag] = new BAO(tag, delay, timeout, boardPin, optoPin);
      return this.baosIndex++;
    };

    Client.prototype.ping = function() {
      var data, list, tag;
      list = [];
      for (tag in this.baos) {
        list.push({
          tag: tag,
          filter: this.baos[tag].filter
        });
      }
      if (this.io != null) {
        data = {
          index: this.baosIndex,
          list: list
        };
        return this.sendIO('ping', data);
      }
    };

    Client.prototype.start = function() {
      var error, magellan, stdin, tag;
      this.io = socket(this.host);
      this.io.on('connect', (function(_this) {
        return function() {
          return _this.onConnect();
        };
      })(this));
      this.io.on('disconnect', (function(_this) {
        return function() {
          return _this.onDisconnect();
        };
      })(this));
      this.io.on('filter removed', (function(_this) {
        return function(data) {
          return _this.onFilterRemoved(data);
        };
      })(this));
      this.io.on('containers', (function(_this) {
        return function(data) {
          return _this.onContainers(data);
        };
      })(this));
      this.io.on('add id', (function(_this) {
        return function(data) {
          return _this.onID(data);
        };
      })(this));
      setInterval(this.ping.bind(this), 5000);
      if (this.useSTDIN === false) {
        try {
          magellan = new Magellan;
          magellan.read((function(_this) {
            return function(input) {
              return _this.onMagellanInput(input);
            };
          })(this));
        } catch (_error) {
          error = _error;
          console.log('missing magellan scanner, now using stdin');
          this.useSTDIN = true;
        }
      }
      this.alive = new LED;
      this.alive.pin = this.alivePinNumber;
      this.alive.set();
      this.alive.run();
      for (tag in this.baos) {
        this.baos[tag].setUp();
      }
      if (this.useSTDIN === true) {
        stdin = process.openStdin();
        stdin.on('data', (function(_this) {
          return function(input) {
            return _this.onStdInput(input);
          };
        })(this));
      }
      return setTimeout(this.lastSetup.bind(this), 1000);
    };

    Client.prototype.onStdInput = function(input) {
      return this.onInput(input.toString());
    };

    Client.prototype.onMagellanInput = function(input) {
      input = input.replace(/^\*/, '');
      input = input.replace(/^i/, '');
      return this.onInput(input);
    };

    Client.prototype.onInput = function(input) {
      var key, msg, parts, tag;
      input = input.replace(/\n/g, '');
      parts = input.split('-');
      key = parts[0];
      if (key === 'K') {
        this.state = 'proc';
        this.filterFor = input;
        this.sendIO('proc', input);
        return this.setResetTimer();
      } else if (this.checkIfProc(key)) {
        if (this.baosIndex === 1) {
          this.filterFor = 'K-1';
        }
        return this.setFilter(this.filterFor, input);
      } else {
        this.sendIO('code', input);
        if (typeof this.waitfor[input] === 'string') {
          tag = this.waitfor[input];
          if (typeof this.baos[tag] === 'object') {
            msg = {
              id: input,
              tag: tag
            };
            this.io.emit('open', msg);
            return this.baos[tag].open();
          } else {
            return this.sendIO('error', new Error('waiting for tag, but have no board for' + tag));
          }
        } else {
          return this.sendIO('notforme', input);
        }
      }
    };

    Client.prototype.onConnect = function() {
      this.connected = true;
      this.alive.connected = true;
      return this.ping();
    };

    Client.prototype.onDisconnect = function() {
      this.connected = true;
      return this.alive.connected = false;
    };

    Client.prototype.onFilterRemoved = function(filter) {
      var ftag, msg, tag;
      ftag = null;
      for (tag in this.baos) {
        if (this.baos[tag].filter === filter) {
          ftag = tag;
        }
      }
      if (ftag != null) {
        this.baos[ftag].filter = '';
        msg = {
          tag: ftag,
          filter: filter
        };
        this.sendIO('filter', msg);
        return this.freeWaitFor(ftag);
      }
    };

    Client.prototype.freeWaitFor = function(tag) {
      var id, j, len, ref, results;
      ref = this.waitfor;
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        id = ref[j];
        if (this.waitfor[id] === tag) {
          results.push(this.deleteID(id));
        }
      }
      return results;
    };

    Client.prototype.deleteID = function(id) {
      return delete this.waitfor[id];
    };

    Client.prototype.addID = function(tag, id) {
      return this.waitfor[id] = tag;
    };

    Client.prototype.onContainers = function(data) {
      return this.containers = data;
    };

    Client.prototype.onID = function(msg) {
      var id, j, len, list, results;
      if ((msg.tag != null) && (msg.data != null)) {
        if (util.isArray(msg.data)) {
          freeWaitFor(msg.tag);
          list = msg.data;
        } else {
          list = [msg.data];
        }
        results = [];
        for (j = 0, len = list.length; j < len; j++) {
          id = list[j];
          results.push(this.addID(id));
        }
        return results;
      }
    };

    Client.prototype.sendIO = function(tag, data) {
      if (this.connected === true) {
        return this.io.emit(tag, data);
      }
    };

    Client.prototype.checkIfProc = function(key) {
      if (this.containers.indexOf(key) > -1) {
        if (this.baosIndex === 1) {
          return true;
        } else if (this.baosIndex > 1 && this.state === 'proc') {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    };

    Client.prototype.setFilter = function(tag, filter) {
      var msg;
      this.baos[tag].filter = input;
      msg = {
        tag: tag,
        filter: filter
      };
      this.sendIO('filter', msg);
      this.baos[tag].open();
      return this.setSaveTimer();
    };

    Client.prototype.setResetTimer = function() {
      if (typeof this.resetTimer !== 'undefined') {
        clearTimeout(this.resetTimer);
      }
      return this.resetTimer = setTimeout(this.resetState.bind(this), 5000);
    };

    Client.prototype.resetState = function() {
      this.state = 'none';
      return this.sendIO('none');
    };

    Client.prototype.lastSetup = function() {
      return fs.exists(this.lastSetupFile, (function(_this) {
        return function(exists) {
          return _this.onLastSetupExists(exists);
        };
      })(this));
    };

    Client.prototype.onLastSetupExists = function(exists) {
      var error, item, j, len, list, results;
      if (exists) {
        try {
          list = require(this.lastSetupFile);
          results = [];
          for (j = 0, len = list.length; j < len; j++) {
            item = list[j];
            if (typeof item.tag === 'string' && typeof item.filter === 'string' && typeof this.baos[item.tag] === 'object') {
              results.push(this.setFilter(item.tag, item.filter));
            }
          }
          return results;
        } catch (_error) {
          error = _error;
          return this.emit('error', error);
        }
      }
    };

    Client.prototype.setSaveTimer = function() {
      if (typeof this.saveTimer !== 'undefined') {
        clearTimeout(this.saveTimer);
      }
      return this.saveTimer = setTimeout(this.save.bind(this), 5000);
    };

    Client.prototype.save = function() {
      var list, tag;
      list = [];
      for (tag in this.baos) {
        list.push({
          tag: tag,
          filter: this.baos[tag].filter
        });
      }
      return fs.writeFile(this.lastSetupFile, (function(_this) {
        return function(err) {
          return _this.onSave(err);
        };
      })(this));
    };

    Client.prototype.onSave = function(err) {
      if (err) {
        return this.emit('error', err);
      }
    };

    Client.prototype.padR = function(str, length) {
      while (str.length < length) {
        str += ' ';
      }
      return str.substring(0, length);
    };

    Client.prototype.displayPinSetup = function() {
      var cl, endL, i, j, k, l, m, notes, pn, tag, x, y;
      cl = [];
      notes = [];
      for (i = j = 1; j <= 42; i = ++j) {
        cl[i - 1] = 'black';
        notes[i - 1] = '---';
      }
      for (tag in this.baos) {
        notes[this.baos[tag].boardPin - 1] = tag + ' B';
        cl[this.baos[tag].boardPin - 1] = 'blue';
        notes[this.baos[tag].optoPin - 1] = tag + ' O';
        cl[this.baos[tag].optoPin - 1] = 'magenta';
      }
      notes[1 - 1] = me.padR('3.3V+', 8);
      cl[1 - 1] = 'yellow';
      notes[2 - 1] = me.padR('5V', 8);
      cl[2 - 1] = 'red';
      notes[4 - 1] = me.padR('5V+', 8);
      cl[4 - 1] = 'red';
      notes[6 - 1] = me.padR('GND', 8);
      cl[6 - 1] = 'grey';
      notes[9 - 1] = me.padR('GND', 8);
      cl[9 - 1] = 'grey';
      notes[14 - 1] = me.padR('GND', 8);
      cl[14 - 1] = 'grey';
      notes[17 - 1] = me.padR('GND', 8);
      cl[17 - 1] = 'grey';
      notes[20 - 1] = me.padR('GND', 8);
      cl[20 - 1] = 'grey';
      notes[25 - 1] = me.padR('GND', 8);
      cl[25 - 1] = 'grey';
      notes[me.alivePinNumber - 1] = me.padR('LED', 6);
      cl[me.alivePinNumber - 1] = 'green';
      endL = "\n";
      l = '';
      l += endL;
      l += '|-------------------||-------------------|';
      l += endL;
      i = 1;
      for (y = k = 0; k <= 20; y = ++k) {
        for (x = m = 0; m <= 2; x = ++m) {
          pn = colors[cl[i - 1]](this.padR('#' + i + '', 4));
          l += '| ' + pn + ' | ' + colors[cl[i - 1]](this.padR(notes[i - 1], 10)) + ' |';
          i++;
        }
        l += endL;
        l += '|-------------------||-------------------|';
        l += endL;
      }
      return console.log(l);
    };

    return Client;

  })(EventEmitter);

}).call(this);
