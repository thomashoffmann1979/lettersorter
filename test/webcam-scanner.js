var addon = require('../build/Release/ocr');
var ocr = new addon.OCR();
var util = require('util');

var cv = require('opencv');
var classes = require('../lib/main');

ocr.Init("eng")

try {
  var camera = new cv.VideoCapture(0);
  var window = new cv.NamedWindow('Video', 0);
  var index = 0;

  var scann = function() {
    camera.setExposure(1);

    camera.read(function(err, im) {
      if (err) throw err;

      ocr.SetMatrix(im);
      codes = ocr.GetBarcode();
      if(codes.length>0){
        console.log(codes);
      }

      window.show(im);
      process.nextTick(scann);
    });
  }

  scann();

} catch (e){
  console.log("Couldn't start camera:", e)
}
