var request = require('request');
var util = require("util");
var events = require("events");

var ERPConnection = function(options){
  this.options = options;
  this.sid = '';
  events.EventEmitter.call(this);
}
util.inherits(ERPConnection, events.EventEmitter);

ERPConnection.prototype.login = function(){
  if (this.sid!==''){
    this.logout();
  }
  request.post({
    url: this.options.url,
    formData: {
      TEMPLATE: 'NO',
      return: 'json',
      mandant: this.options.client,
      username: this.options.login,
      password: this.options.password
    }
  },
  function optionalCallback(err, httpResponse, body) {
    if (err) {
      this.emit('error',err);
    }else{
      var json = JSON.parse(body);
      if (json.success){
        this.sid = json.sid;
        this.emit('logged in',json.sid);
      }else{
        this.emit('error',body);
      }
    }
  }.bind(this)
  );
}

ERPConnection.prototype.logout = function(){
  request
  .get(this.options.url+'?TEMPLATE=NO&sid='+this.sid+'&cmp=cmp_logout')
  .on('response', function(response) {  });
  this.sid = '';
  this.emit('logged out');
}



ERPConnection.prototype.getFastAccessTour = function(){
  if (this.sid!==''){
    request.post({
      url: this.options.url,
      formData: {
        sid: this.sid,
        TEMPLATE: 'NO',
        //return: 'json',
        reconfigure: "true",
        cmp: 'cmp_db',
        connection: 1,
        page: "ajax/sqlcommander/dataload",
        limit: 10000,
        start: 0,
        sql: "select * from fast_access_tour "
      }
    },
    function optionalCallback(err, httpResponse, body) {
      if (err) {
        this.emit('error',err);
      }else{
        try{
          var json = JSON.parse(body);
          if (json.success){
            this.emit('fastaccesstour',json.results);
          }else{
            this.emit('error',body);
          }
        }catch(e){
          this.emit('error',e,body);
        }
      }
    }.bind(this)
    );
  }

}



ERPConnection.prototype.getSendings = function(){

  if (this.sid!==''){
    var today= new Date();

    today.setHours(today.getHours() - 48);
    var sql = "select id,sortierfach sf,sortiergang sg,plz from sv_daten where datum >= '"+ today.toISOString().substring(0,10)+"'";
    console.log(sql);

    request.post({
      url: this.options.url,
      formData: {
        sid: this.sid,
        TEMPLATE: 'NO',
        //return: 'json',
        reconfigure: "true",
        cmp: 'cmp_db',
        connection: 1,
        page: "ajax/sqlcommander/dataload",
        limit: 100000,
        start: 0,
        sql: sql
      }
    },
    function optionalCallback(err, httpResponse, body) {
      if (err) {
        this.emit('error',err);
      }else{
        try{
          var json = JSON.parse(body);
          if (json.success){
            this.emit('sendings',json.results);
          }else{
            this.emit('error',body);
          }
        }catch(e){
          this.emit('error',e);
        }
      }
    }.bind(this)
    );
  }

}




ERPConnection.prototype.put = function(sending,item){

  if (this.sid!==''){
    var today= new Date();
    today.setHours(today.getHours() - 48);

    var data = [];
    data.push({name: "Barcode",wert: sending.id});
    data.push({name: "Strasse",wert: item.street});
    data.push({name: "HN",wert: item.houseNumber});
    data.push({name: "PLZ",wert: item.zipCode});
    data.push({name: "Ort",wert: item.town});
    data.push({name: "Name",wert: item.name});

    var options = {
      url: this.options.url,
      formData: {
        sid: this.sid,
        TEMPLATE: 'NO',
        cmp: 'cmp_sv_web_erfassung',
        page: "ajax/save",
        limit: 100000,
        start: 0,
        regiogruppe: 'Zustellung',
        modell: 'Standardbriefsendungen',
        sortiergang: sending.sg,
        data: JSON.stringify( data,null,0 )
      }
    };
    //return;

    request.post( options,
    function optionalCallback(err, httpResponse, body) {
      /*
      if (err) {
        this.emit('error',err);
      }else{
        try{
          var json = JSON.parse(body);
          if (json.success){
            this.emit('put',json.results);
          }else{
            this.emit('error',body);
          }
        }catch(e){
          this.emit('error',e);
        }
      }
      */
    }.bind(this)
    );
  }

}


exports.ERPConnection = ERPConnection;
