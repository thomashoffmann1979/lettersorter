var cv;
var util = require("util");
var events = require("events");

try{
  cv = require('opencv');
}catch(e){
  log('info','ocr','there is no opencv module');
}



var OCR = function(){
  events.EventEmitter.call(this);
}
util.inherits(OCR, events.EventEmitter);

OCR.prototype.start=function(cameraIndex){
  try {
    var camera = new cv.VideoCapture(0);
    var window = new cv.NamedWindow('Video', 0)
    setInterval(function(){
      camera.read(function(err, im) {
        if (err) throw err;
        console.log(im.size())
        if (im.size()[0] > 0 && im.size()[1] > 0){
          window.show(im);
        }
        window.blockingWaitKey(0, 50);
        log('debug','ocr','alive');
      });
    },100);
  } catch (e){
    log('error','ocr','Couldn\'t start camera ' + e)
  }

}

exports.OCR = OCR;
