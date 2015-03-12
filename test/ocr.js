var addon = require('../build/Release/ocr');
var ocr = new addon.OCR();
var util = require('util');
console.log(addon,typeof ocr.End,ocr.Init("eng"));

var cv = require('opencv');
cv.readImage(__dirname+'/files/icon.png', function(err, im) {
  console.log(err,im);
  ocr.SetMatrix(im);
})
console.log(util.inspect(ocr, { showHidden: true, depth: null }));

setInterval(function(){
  console.log('.');
},5000);

//process.exit();
