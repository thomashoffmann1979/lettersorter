var util = require("util");
var events = require("events");
var jade = require('jade');
var path = require('path');
var fs = require('fs');
var osenv = require('osenv');
var spawn = require('child_process').spawn;
var Barcode = require('tualo-barcode').Barcode;

var CodePages = function() {
  events.EventEmitter.call(this);
}
util.inherits(CodePages, events.EventEmitter);


Object.defineProperty(CodePages.prototype, 'master', {
  get: function() {
    return this._master;
  },
  set: function(master) {
    this._master = master;
  }
});

CodePages.prototype.k = function(cb){
  var i,codes=[];
  for(i=0;i<10;i++){
    codes.push('K-'+(i+1));
  }
  cb(null,codes);
}
CodePages.prototype.sg = function(cb){
  var me = this;
  me._master.dbclient.singleSG(cb);
}
CodePages.prototype.sgsf = function(cb){
  var me = this;
  me._master.dbclient.singleSGSF(cb);
}

CodePages.prototype.create = function(tag) {

  var me = this,
      options = { codes: [

      ] },
      output = path.join(osenv.tmpdir(),'codepage.html'),
      input = path.join(__dirname,'template','codepage.jade'),
      html,
      fn = 'sg';

      if (typeof tag==='undefined'){
        tag='sg';
      }

      if (tag==='sgsf'){
        fn = 'sgsf';
      }

      if (tag==='k'){
        fn = 'k';
      }

      me[fn](function(err,list){
        if (err){
          log('error','CodePages',err.toString());
        }else{
          for(var i=0;i<list.length;i++){
            try{
              var code_39_svg = (new Barcode({
                  type: 'Code39',
                  width: 100
              })).getSVG(list[i],true);
              options.codes.push({
                svg: code_39_svg,
                text: list[i]
              });
            }catch(e){
              log('error','CodePages',e.toString()+" "+list[i]);
            }
          }

          html = jade.renderFile(input, options);
          fs.writeFile(output,html,function(err){
            if (err){
              log('error','CodePages',err.toString());
            }else{
              spawn('open', ['file://' + output]);
            }
          });
        }
      });

}

exports.CodePages = CodePages;
