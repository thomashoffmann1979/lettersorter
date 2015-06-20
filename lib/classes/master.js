(function() {
  var EventEmitter, Master, socketio, udpfindme,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  socketio = require('socket.io');

  udpfindme = require('udpfindme');

  module.exports = Master = (function(superClass) {
    extend(Master, superClass);

    function Master() {
      this.url = '';
      this.port = 3000;
      this.client = '';
      this.login = '';
      this.password = '';
      this.containers = ['PLZ', 'SG', 'SGSF'];
      this.box_clients = {};
      this.ui_clients = {};
      this.ocr_clients = {};
      this.clientsCount = 0;
      this.sendings = {};
      this.box_containers = {};
    }

    Master.prototype.start = function() {
      var discoverMessage, discoverServer, stdin;
      discoverServer = new udpfindme.Server(31111, '0.0.0.0');
      discoverMessage = {
        port: this.port,
        type: 'sorter'
      };
      discoverServer.setMessage(discoverMessage);
      this.io = socketio();
      this.io.on('connection', (function(_this) {
        return function(socket) {
          return _this.onIncommingConnection(socket);
        };
      })(this));
      this.io.listen(this.port);
      debug('master start', 'listen on ' + this.port);
      this.emit('listen', this.port);
      stdin = process.openStdin();
      return stdin.on('data', (function(_this) {
        return function(data) {
          return _this.onStdInput(data);
        };
      })(this));
    };

    Master.prototype.onStdInput = function(data) {
      var input;
      input = data.toString().replace(/\n/g, '');
      if (input === 'refresh') {
        return this.erp.sendings();
      }
    };

    Master.prototype.onIncommingConnection = function(socket) {
      debug('master connection', socket.id);
      socket.on('disconnect', (function(_this) {
        return function(data) {
          return _this.onDisconnect(socket, data);
        };
      })(this));
      socket.on('filter', (function(_this) {
        return function(data) {
          return _this.onFilter(socket, data);
        };
      })(this));
      socket.on('ping', (function(_this) {
        return function(data) {
          return _this.onPing(socket, data);
        };
      })(this));
      socket.on('ui', (function(_this) {
        return function(data) {
          return _this.onUI(socket, data);
        };
      })(this));
      socket.on('ocrservice', (function(_this) {
        return function(data) {
          return _this.onOCR(socket, data);
        };
      })(this));
      return socket.on('new', (function(_this) {
        return function(data) {
          return _this.onNew(socket, data);
        };
      })(this));
    };

    Master.prototype.onDisconnect = function(socket) {
      debug('master disconnect', socket.id);
      if (typeof this.ui_clients[socket.id] === 'object') {
        delete this.ui_clients[socket.id];
      }
      if (typeof this.ocr_clients[socket.id] === 'object') {
        delete this.ocr_clients[socket.id];
      }
      if (typeof this.box_clients[socket.id] === 'object') {
        return delete this.box_clients[socket.id];
      }
    };

    Master.prototype.onNew = function(socket, data) {
      if (typeof data.codes !== 'undefined') {
        if (data.codes.length > 0) {
          if (typeof data.containers !== 'undefined') {
            if (data.containers.length > 0) {
              return this.addSending(data);
            }
          }
        }
      }
    };

    Master.prototype.onUI = function(socket, data) {
      return this.ui_clients[socket.id] = socket;
    };

    Master.prototype.onOCR = function(socket, data) {
      return this.ocr_clients[socket.id] = socket;
    };

    Master.prototype.onPing = function(socket, data) {
      var i, item, j, len, len1, results;
      if (typeof this.box_clients[socket.id] === 'undefined') {
        for (i = 0, len = data.length; i < len; i++) {
          item = data[i];
          this.removeFilter(item.filter);
        }
        this.box_clients[socket.id] = socket;
        results = [];
        for (j = 0, len1 = data.length; j < len1; j++) {
          item = data[j];
          results.push(this.onFilter(item));
        }
        return results;
      }
    };

    Master.prototype.onFilter = function(socket, data) {
      var container;
      if (typeof this.box_clients[socket.id] !== 'undefined') {
        this.removeFilter(data.filter);
        container = data.filter;
        this.box_containers[container] = socket.id;
        if (typeof this.sendings[container] !== 'undefined') {
          return socket.emit('add id', id);
        }
      }
    };

    Master.prototype.removeFilter = function(container) {
      var socketid;
      socketid = this.box_containers[container];
      if (typeof socketid === 'string') {
        if (typeof this.box_clients[socketid] !== 'undefined') {
          return this.box_clients[socketid].emit('filter removed', container);
        }
      }
    };

    Master.prototype.addSending = function(item) {
      var container, i, len, ref, results;
      ref = item.containers;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        container = ref[i];
        if (typeof this.container[container] === 'string') {
          results.push(this.addSendingContainer(container, item.codes));
        }
      }
      return results;
    };

    Master.prototype.addSendingContainer = function(container, codes) {
      var code;
      code = codes[0];
      if (typeof this.sendings[container] === 'undefined') {
        this.sendings[container] = [];
      }
      this.sendings[container].push(code);
      if (typeof this.box_containers[container] === 'string') {
        if (typeof this.box_clients[this.box_containers[container]] === 'object') {
          return this.box_clients[this.box_containers[container]].emit('add id', id);
        }
      }
    };

    return Master;

  })(EventEmitter);

}).call(this);
