(function() {
  var BAO, Client, EventEmitter, LED, Magellan, PIN, colors, fs, os, osenv, path, socket, udpfindme, util,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  Magellan = require('magellan-scanners').Magellan;

  socket = require('socket.io-client');

  colors = require('colors');

  path = require('path');

  fs = require('fs');

  os = require('os');

  osenv = require('osenv');

  udpfindme = require('udpfindme');

  util = require('util');

  PIN = require('./pin');

  LED = require('./led');

  BAO = require('./bao');

  module.exports = Client = (function(superClass) {
    extend(Client, superClass);

    function Client(startdiscoverserver) {
      var discoverMessage, discoverServer, name;
      if (typeof startdiscoverserver === 'undefined') {
        startdiscoverserver = false;
      }
      this.state = 'none';
      this.baos = {};
      this.baosIndex = 0;
      this.connected = false;
      this.discoverd = false;
      this.alivePinNumber = 26;
      this.useSTDIN = true;
      this.lastSetupFile = path.join(osenv.home(), '.sorter_last_setup.json');
      this.containers = ['PLZ', 'SG', 'SGSF'];
      this.waitfor = {};
      this.inputDevice = "";
      if (startdiscoverserver === true) {
        discoverServer = new udpfindme.Server(31111, '0.0.0.0');
        discoverMessage = {
          port: this.port,
          type: 'sorter-client'
        };
        discoverServer.setMessage(discoverMessage);
      }
      this.interfaces = [];
      this.nInterfaces = os.networkInterfaces();
      for (name in this.nInterfaces) {
        this.setIFace(this.nInterfaces[name]);
      }
    }

    Client.prototype.setIFace = function(entries) {
      var item, j, len, results;
      results = [];
      for (j = 0, len = entries.length; j < len; j++) {
        item = entries[j];
        if (item.family === 'IPv4') {
          results.push(this.interfaces.push(item.address));
        }
      }
      return results;
    };

    Client.prototype.setUpBAO = function(tag, delay, timeout, boardPin, optoPin, closeOnHiLO) {
      this.baos[tag] = new BAO(tag, delay, timeout, boardPin, optoPin, closeOnHiLO);
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

    Client.prototype.onDiscoveryFound = function(data, remote) {
      var ref;
      if (typeof data.type === 'string') {
        if (data.type === 'sorter') {
          this.url = 'http://' + remote.address + ':' + data.port + '/';
          if (!((ref = this.io) != null ? ref.connected : void 0)) {
            this.setIoConnectTimer();
          }
        }
        if (data.type === 'sorter-client') {
          if (this.interfaces.indexOf(remote.address) >= 0) {
            return error('client', 'there is on service running');
          }
        }
      }
    };

    Client.prototype.setIoConnectTimer = function() {
      if (typeof this.ioConnectTimer !== 'undefined') {
        clearTimeout(this.ioConnectTimer);
      }
      return this.ioConnectTimer = setTimeout(this.setIO.bind(this), 1000);
    };

    Client.prototype.setIO = function() {
      var opt;
      opt = {
        autoConnect: false
      };
      this.io = socket(this.url, opt);
      debug('client start', 'set up io ' + this.url);
      this.io.on('connect_error', (function(_this) {
        return function(err) {
          return _this.onConnectError(err);
        };
      })(this));
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
      return this.io.connect();
    };

    Client.prototype.onDiscoveryTimout = function() {
      return this.discovery.discover();
    };

    Client.prototype.start = function() {
      var error, magellan, stdin, tag;
      this.discovery = new udpfindme.Discovery(31111);
      this.discovery.on('found', (function(_this) {
        return function(data, remote) {
          return _this.onDiscoveryFound(data, remote);
        };
      })(this));
      this.discovery.on('timeout', (function(_this) {
        return function() {
          return _this.onDiscoveryTimout();
        };
      })(this));
      this.discovery.discover();
      setInterval(this.ping.bind(this), 10000);
      if (this.useSTDIN === false) {
        try {
          magellan = new Magellan;
          magellan.read((function(_this) {
            return function(input) {
              return _this.onMagellanInput(input);
            };
          })(this));
          debug('client magellan', 'using magellan scanner');
        } catch (_error) {
          error = _error;
          warn('client magellan', 'missing magellan scanner, now using stdin');
          this.useSTDIN = true;
        }
      }
      this.alive = new LED;
      this.alive.pin = this.alivePinNumber;
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
      setTimeout(this.lastSetup.bind(this), 1000);
      return this.displayPinSetup();
    };

    Client.prototype.onStdInput = function(input) {
      debug('stdin', input.toString());
      this.onInput(input.toString().substring(0, input.toString().length - 2));
      return this.onInput(input.toString());
    };

    Client.prototype.onMagellanInput = function(input) {
      input = input.replace(/^\*/, '');
      input = input.replace(/^i/, '');
      return this.onInput(input);
    };

    Client.prototype.onInput = function(input) {
      var checkCode, key, msg, parts, ref, tag;
      if (((ref = this.io) != null ? ref.connected : void 0) === true) {
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
          checkCode = "";
          if (typeof this.waitfor[input] === 'string') {
            checkCode = input;
          } else if (typeof this.waitfor[input.substring(0, input.length - 2)] === 'string') {
            checkCode = input.substring(0, input.length - 2);
          }
          if (typeof this.waitfor[checkCode] === 'string') {
            tag = this.waitfor[checkCode];
            if (typeof this.baos[tag] === 'object') {
              msg = {
                id: checkCode,
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
      } else {
        return error('onInput', 'not connected');
      }
    };

    Client.prototype.onConnectError = function(err) {
      debug('connect_error');
      return this.io.disconnect();
    };

    Client.prototype.onConnect = function() {
      debug('client connected', 'ok');
      this.alive.connected = true;
      return setTimeout(this.setAllFilter.bind(this), 2000);
    };

    Client.prototype.setAllFilter = function() {
      var item, j, len, list, results;
      list = this.list();
      results = [];
      for (j = 0, len = list.length; j < len; j++) {
        item = list[j];
        if (typeof item.tag === 'string' && typeof item.filter === 'string' && typeof this.baos[item.tag] === 'object') {
          results.push(this.setFilter(item.tag, item.filter));
        }
      }
      return results;
    };

    Client.prototype.onDisconnect = function() {
      debug('client disconnected', '-');
      return this.alive.connected = false;
    };

    Client.prototype.onFilterRemoved = function(data) {
      debug('client on removed filter', data);
      if (this.baos[data.tag] != null) {
        if (this.baos[data.tag].filter === data.filter) {
          this.baos[data.tag].filter = '';
          return this.freeWaitFor(data.tag);
        }
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
      var id, j, len, list;
      if ((msg.tag != null) && (msg.data != null)) {
        if (util.isArray(msg.data)) {
          this.freeWaitFor(msg.tag);
          list = msg.data;
          debug('client got list', list.length);
        } else {
          list = [msg.data];
        }
        for (j = 0, len = list.length; j < len; j++) {
          id = list[j];
          this.addID(msg.tag, id);
        }
      }
      return true;
    };

    Client.prototype.sendIO = function(tag, data) {
      var fn, me;
      if (this.io != null) {
        debug(tag, this.io.id + JSON.stringify(data, null, 0));
        return this.io.emit(tag, data);
      } else {
        debug('sendio', 'defered');
        me = this;
        fn = function(tag, data) {
          return me.sendIO(tag, data);
        };
        return setTimeout(fn, 2000);
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
      debug('client set filter', tag + ' ' + filter);
      this.baos[tag].filter = filter;
      msg = {
        tag: tag,
        filter: filter
      };
      this.sendIO('filter', msg);
      debug('client baos open', tag);
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
          return console.log(error);
        }
      }
    };

    Client.prototype.setSaveTimer = function() {
      if (typeof this.saveTimer !== 'undefined') {
        clearTimeout(this.saveTimer);
      }
      return this.saveTimer = setTimeout(this.save.bind(this), 5000);
    };

    Client.prototype.list = function() {
      var list, tag;
      list = [];
      for (tag in this.baos) {
        list.push({
          tag: tag,
          filter: this.baos[tag].filter
        });
      }
      return list;
    };

    Client.prototype.save = function() {
      return fs.writeFile(this.lastSetupFile, JSON.stringify(this.list(), null, 2), (function(_this) {
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
      notes[1 - 1] = this.padR('3.3V+', 8);
      cl[1 - 1] = 'yellow';
      notes[2 - 1] = this.padR('5V', 8);
      cl[2 - 1] = 'red';
      notes[4 - 1] = this.padR('5V+', 8);
      cl[4 - 1] = 'red';
      notes[6 - 1] = this.padR('GND', 8);
      cl[6 - 1] = 'grey';
      notes[9 - 1] = this.padR('GND', 8);
      cl[9 - 1] = 'grey';
      notes[14 - 1] = this.padR('GND', 8);
      cl[14 - 1] = 'grey';
      notes[17 - 1] = this.padR('GND', 8);
      cl[17 - 1] = 'grey';
      notes[20 - 1] = this.padR('GND', 8);
      cl[20 - 1] = 'grey';
      notes[25 - 1] = this.padR('GND', 8);
      cl[25 - 1] = 'grey';
      notes[this.alivePinNumber - 1] = this.padR('LED', 6);
      cl[this.alivePinNumber - 1] = 'green';
      endL = "\n";
      l = '';
      l += endL;
      l += '|-------------------||-------------------|';
      l += endL;
      i = 1;
      for (y = k = 1; k <= 20; y = ++k) {
        for (x = m = 1; m <= 2; x = ++m) {
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
