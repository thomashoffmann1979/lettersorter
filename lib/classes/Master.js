var util = require("util");
var events = require("events");
var os = require('os');
var ERPConnection = require("./ERPConnection").ERPConnection;
var DBClient = require("./DBClient").DBClient;

var Master = function(){
  this._url = "";
  this._client = "";
  this._login = "";
  this._password = "";

  this.dbclient;

  this._dbHost = 'localhost';
  this._dbUser = 'root';
  this._dbPassword = '';
  this._dbName = 'sorter';

  this._port = 3000;


  this._clients = {};
  this._clientsByFilter = {};
  this._clientsCount = 0;

  this._sendingsBySGSF = {};
  this._sendingsBySG = {};
  this._sendingsByPLZ = {};

  events.EventEmitter.call(this);
}
util.inherits(Master, events.EventEmitter);

Object.defineProperty(Master.prototype, 'port', {
    get: function() {
        return this._port;
    },
    set: function(port) {
      this._port = 3000;
    }
});
Object.defineProperty(Master.prototype, 'login', {
    get: function() {
        return this._login;
    },
    set: function(value) {
        this._login = value;
    }
});
Object.defineProperty(Master.prototype, 'password', {
    get: function() {
        return this._password;
    },
    set: function(value) {
        this._password = value;
    }
});
Object.defineProperty(Master.prototype, 'url', {
    get: function() {
        return this._url;
    },
    set: function(value) {
        this._url = value;
    }
});


Object.defineProperty(Master.prototype, 'dbUser', {
    get: function() {
        return this._dbUser;
    },
    set: function(value) {
        this._dbUser = value;
    }
});


Object.defineProperty(Master.prototype, 'dbPassword', {
    get: function() {
        return this._dbPassword;
    },
    set: function(value) {
        this._dbPassword = value;
    }
});

Object.defineProperty(Master.prototype, 'dbHost', {
    get: function() {
        return this._dbHost;
    },
    set: function(value) {
        this._dbHost = value;
    }
});

Object.defineProperty(Master.prototype, 'dbName', {
    get: function() {
        return this._dbName;
    },
    set: function(value) {
        this._dbName = value;
    }
});

Object.defineProperty(Master.prototype, 'client', {
    get: function() {
        return this._client;
    },
    set: function(value) {
        this._client = value;
    }
});


Object.defineProperty(Master.prototype, 'clients', {
    get: function() {
        return this._clients;
    }
});
Object.defineProperty(Master.prototype, 'clientsCount', {
    get: function() {
        return this._clientsCount;
    }
});



// adding a new client
// the socket id is used to identify
// the client. every client object in
// this.clients keeps the socket and
// the filter information of that client.
//
Master.prototype.add = function(socket){
  var me = this;
  me._clients[socket.id] = {
    socket: socket,
    filter: ''
  }
  me._clientsCount++;
  me.initSocketEvents(socket);
  log('debug','master','added client '+socket.id);
}

Master.prototype.remove = function(socket){
  delete this._clients[socket.id];
  log('debug','master','removed client '+socket.id);
}

Master.prototype.filter = function(socket,v){
  var me = this,
      i,
      m,
      r,
      client = me._clients[socket.id],
      tag = v.tag,
      filter= v.filter;

  if ( (typeof me._clientsByFilter[ filter ] === 'object') ){

    var item = me._clientsByFilter[ filter ];
    item.client.socket.emit('filter removed',{
      tag: item.tag,
      filter: item.filter
    });
    delete me._clientsByFilter[ filter ];
    log('debug','master','remove filter *'+filter+'*');
  }


  if (client){
    me._clientsByFilter[filter] = {
      tag: tag,
      filter: filter,
      client: client
    };

    r = [];
    if (filter.substring(0,5) === 'SGSF-'){
      if (typeof me._sendingsBySGSF[filter]==='object'){

        for(i in me._sendingsBySGSF[filter]){
          if (me._sendingsBySGSF[filter].hasOwnProperty(i)){
            r.push(i);
          }
        }
      }
    }
    if (filter.substring(0,3) === 'SG-'){
      if (typeof me._sendingsBySG[filter]==='object'){

        for(i in me._sendingsBySG[filter]){
          if (me._sendingsBySG[filter].hasOwnProperty(i)){
            r.push(i);
          }
        }
      }
    }
    if (filter.substring(0,4) === 'PLZ-'){
      if (typeof me._sendingsByPLZ[filter]==='object'){

        for(i in me._sendingsByPLZ[filter]){
          if (me._sendingsByPLZ[filter].hasOwnProperty(i)){
            r.push(i);
          }
        }
      }
    }
    socket.emit( 'add id', {
      tag: tag,
      data: r
    });
    log('debug','master','added filter *'+filter+'* for '+socket.id);
  }//client
}

Master.prototype.start = function(){
  var me = this;
  var io = require('socket.io')();
  io.on('connection', me.onIncommingConnection.bind(me));
  io.listen(me.port);
  me.emit('listen');



  var ifaces = os.networkInterfaces();

  Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0;
    ifaces[ifname].forEach(function (iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        return;
      }
      if (alias >= 1) {
        // this single interface has multiple ipv4 addresses
        // console.log(ifname + ':' + alias, iface.address);
        log('info','master','your clients should point to host http://'+iface.address+':'+me.port+'/');
      } else {
        // this interface has only one ipv4 adress
        //console.log(ifname, iface.address);
        log('info','master','your clients should point to host http://'+iface.address+':'+me.port+'/');

      }
    });
  });


  // only for debugging
  var stdin = process.openStdin();
  stdin.on('data', function(data){
    var me = this,
        input = data.toString().replace(/\n/g,'');

    log('debug','master','got std input '+input);
    if(input==='refresh'){
      me._erp.getSendings();
    }
  });




  log('debug','master','listen on '+me.port);



  me.dbclient = new DBClient();
  me.dbclient.start(me._dbName,me._dbUser,me._dbPassword,me._dbHost);
  me.dbclient.update();

}


Master.prototype.erp = function(){
  var me = this;
  log('debug','master','erp try connection');
  me._erp = new ERPConnection({
    url: me.url,
    client: me.client,
    login: me.login,
    password: me.password
  });
  me._erp.on('logged in',function(sid){
    log('debug','master','erp connected '+sid);
    me.emit('logged in',sid);
    me._erp.getSendings();
  });
  me._erp.on('error',function(msg){
    log('debug','master','erp error '+msg);
    me.emit('error',msg);
  });

  me._erp.on('sendings',function(data){
    //console.log(me._clientsByFilter);
    var i=0,m=data.length;
    for(i=0;i<m;i++){
      me.addSending(data[i]);
    }
  });
  me._erp.login();
}

Master.prototype.addSending = function(sending){

  var me = this,
      filter = '';
  //log('debug','master','add sending '+sending.id+' SGSF-'+sending.sg+'-'+sending.sf+' PLZ-'+sending.plz + ' SG-'+sending.sg );
  if (typeof me._sendingsBySG['SG-'+sending.sg]==='undefined'){
    me._sendingsBySG['SG-'+sending.sg]={};
  }

  if (typeof me._sendingsBySGSF['SGSF-'+sending.sg+'-'+sending.sf]==='undefined'){
    me._sendingsBySGSF['SGSF-'+sending.sg+'-'+sending.sf]={};
  }

  if (typeof me._sendingsByPLZ['PLZ-'+sending.plz]==='undefined'){
    me._sendingsByPLZ['PLZ-'+sending.plz]={};
  }

  me._sendingsBySGSF['SGSF-'+sending.sg+'-'+sending.sf] = sending;
  me._sendingsBySG['SG-'+sending.sg][sending.id]=0;
  me._sendingsByPLZ['PLZ-'+sending.plz][sending.id]=0;

  filter = 'PLZ-'+sending.plz;
  if (typeof me._clientsByFilter[filter]==='object'){
    me._clientsByFilter[filter].client.socket.emit('add id',{
      data: sending.id,
      box: me._clientsByFilter[filter].box
    });
  }
  filter = 'SG-'+sending.sg;
  if (typeof me._clientsByFilter[filter]==='object'){
    me._clientsByFilter[filter].client.socket.emit('add id',{
      data: sending.id,
      box: me._clientsByFilter[filter].box
    });
  }
  filter = 'SGSF-'+sending.sg+'-'+sending.sf;
  if (typeof me._clientsByFilter[filter]==='object'){
    me._clientsByFilter[filter].client.socket.emit('add id',{
      data: sending.id,
      box: me._clientsByFilter[filter].box
    });
  }

}

Master.prototype.onIncommingConnection = function(socket){
  var me = this;
  log('debug','master','incomming connection ');
  me.add(socket);
  socket.on('disconnect', function(){
    me.remove(socket);
  });

}

Master.prototype.initSocketEvents = function(socket){
  var me = this;
  socket.on('filter', me.onFilter(socket).bind(me));
}

Master.prototype.onFilter = function(socket){
  return function(data){
    var me = this;
    log('debug','master','filter event '+data);
    me.filter(socket,data);
  }
}

exports.Master = Master;
