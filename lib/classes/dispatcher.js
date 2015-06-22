(function() {
  var Dispatcher, EventEmitter, freeport, socketio, udpfindme, variables,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  socketio = require('socket.io');

  udpfindme = require('udpfindme');

  freeport = require('freeport');

  variables = require('../variables');

  module.exports = Dispatcher = (function(superClass) {
    extend(Dispatcher, superClass);

    function Dispatcher() {
      this.url = '';
      this.port = 3000;
      this.client = '';
      this.login = '';
      this.password = '';
      this.containers = ['PLZ', 'SG', 'SGSF'];
      this.tags = {};
      this.box_clients = {};
      this.ui_clients = {};
      this.ocr_clients = {};
      this.erp_clients = {};
      this.clientsCount = 0;
      this.sendings = {};
      this.box_containers = {};
    }

    Dispatcher.prototype.freeport = function(err, port) {
      if (err) {
        return this.emit('error', err);
      } else {
        this.port = port;
        return setTimeout(this.deferedStart.bind(this), 1000);
      }
    };

    Dispatcher.prototype.deferedStart = function() {
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

    Dispatcher.prototype.start = function() {
      return freeport((function(_this) {
        return function(err, port) {
          return _this.freeport(err, port);
        };
      })(this));
    };

    Dispatcher.prototype.onStdInput = function(data) {
      var input;
      input = data.toString().replace(/\n/g, '');
      if (input === 'refresh') {
        return this.sendERP('sendings');
      }
    };

    Dispatcher.prototype.onIncommingConnection = function(socket) {
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
      socket.on('erp', (function(_this) {
        return function(data) {
          return _this.onERP(socket, data);
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

    Dispatcher.prototype.onDisconnect = function(socket) {
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

    Dispatcher.prototype.onNew = function(socket, data) {
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

    Dispatcher.prototype.onUI = function(socket, data) {
      return this.ui_clients[socket.id] = socket;
    };

    Dispatcher.prototype.sendUI = function(event, data) {
      var id, results;
      results = [];
      for (id in this.ui_clients) {
        if (this.ui_clients[id].connected === true) {
          results.push(this.ui_clients[id].emit(event, data));
        }
      }
      return results;
    };

    Dispatcher.prototype.onERP = function(socket, data) {
      var msg;
      this.erp_clients[socket.id] = socket;
      debug('erp', socket.id);
      socket.on('error', (function(_this) {
        return function(msg) {
          return _this.onERPError(msg);
        };
      })(this));
      socket.on('sendings', (function(_this) {
        return function(list) {
          return _this.onSendings(list);
        };
      })(this));
      socket.on('loginSuccess', (function(_this) {
        return function(data) {
          return _this.onLoginSuccess(socket, data);
        };
      })(this));
      socket.on('loginError', (function(_this) {
        return function(data) {
          return _this.onLoginError(socket, data);
        };
      })(this));
      msg = {
        client: variables.ERP_CLIENT,
        login: variables.ERP_LOGIN,
        password: variables.ERP_PASSWORD
      };
      return socket.emit('login', msg);
    };

    Dispatcher.prototype.onERPError = function(socket, data) {
      return error('dispatcher erp error', data);
    };

    Dispatcher.prototype.onLoginSuccess = function(socket, data) {
      debug('login', data);
      return this.sendERP('sendings', {});
    };

    Dispatcher.prototype.onLoginError = function(socket, data) {
      return error('login error', data);
    };

    Dispatcher.prototype.onSendings = function(list) {
      var i, item, len, results;
      results = [];
      for (i = 0, len = list.length; i < len; i++) {
        item = list[i];
        results.push(this.addSending(item));
      }
      return results;
    };

    Dispatcher.prototype.sendERP = function(event, data) {
      var id, results;
      results = [];
      for (id in this.erp_clients) {
        if (this.erp_clients[id].connected === true) {
          results.push(this.erp_clients[id].emit(event, data));
        }
      }
      return results;
    };

    Dispatcher.prototype.onOCR = function(socket, data) {
      this.ocr_clients[socket.id] = socket;
      debug('send ocr', 'start');
      return socket.emit('start', true);
    };

    Dispatcher.prototype.sendOCR = function(event, data, socket) {
      var id, msg, results;
      msg = data;
      if (socket != null) {
        msg.id = socket.id;
      }
      msg.timestamp = new Date;
      results = [];
      for (id in this.ocr_clients) {
        if (this.ocr_clients[id].connected === true) {
          results.push(this.ocr_clients[id].emit(event, data));
        }
      }
      return results;
    };

    Dispatcher.prototype.onPing = function(socket, data) {
      this.addBoxClient(socket);
      return this.sendUI('ping', data, socket);
    };

    Dispatcher.prototype.addBoxClient = function(socket) {
      if (typeof this.box_clients[socket.id] === 'undefined') {
        debug('add box', socket.id);
        return this.box_clients[socket.id] = socket;
      }
    };

    Dispatcher.prototype.onFilter = function(socket, data) {
      var container, msg;
      this.addBoxClient(socket);
      container = data.filter;
      if (container.length > 0) {
        debug('on filter', JSON.stringify(data, null, 0));
        this.removeFilter(container, data.tag, socket.id);
        this.box_containers[container] = {
          tag: data.tag,
          id: socket.id
        };
        this.sendUI('filter', data, socket);
        if (typeof this.sendings[container] === 'undefined') {
          this.sendings[container] = [];
        }
        msg = {
          tag: data.tag,
          data: this.sendings[container]
        };
        return socket.emit('add id', msg);
      }
    };

    Dispatcher.prototype.removeFilter = function(container, tag, id) {
      var cont, data, msg, socket_id, socket_tag;
      for (cont in this.box_containers) {
        if (this.box_containers[cont].id === id && this.box_containers[cont].tag === tag && container !== cont) {
          this.deleteBoxContainter(cont);
        }
      }
      if (typeof this.box_containers[container] === 'object') {
        if (this.box_containers[container].id === id) {
          if (this.box_containers[container].tag === tag) {
            debug('master remove filter', 'on same tag');
            this.deleteBoxContainter(container);
          }
        } else {
          debug('master remove filter', 'on different socket ' + container);
        }
        if (typeof this.box_containers[container] === 'object') {
          socket_id = this.box_containers[container].id;
          socket_tag = this.box_containers[container].tag;
          this.deleteBoxContainter(container);
          if (this.box_clients[socket_id] != null) {
            msg = {
              tag: socket_tag,
              filter: container
            };
            this.box_clients[socket_id].emit('filter removed', msg);
            data = msg;
            data.id = socket_id;
            return this.sendUI('filter removed', data);
          }
        }
      }
    };

    Dispatcher.prototype.deleteBoxContainter = function(container) {
      debug('remove container', container);
      return delete this.box_containers[container];
    };

    Dispatcher.prototype.addSending = function(item) {
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

    Dispatcher.prototype.addSendingContainer = function(container, codes) {
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

    return Dispatcher;

  })(EventEmitter);

}).call(this);
