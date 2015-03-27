var cv = require('opencv');

var window = new cv.NamedWindow('PIC LINE', 0);


cv.readImage(__dirname+'/files/i22.jpg', function(err, im) {
  if (err) throw err;
  console.log(im.size());
  if (im.size()[0] > 0 && im.size()[1] > 0){
    window.show(im);
  }
});

setInterval(function(){
  window.blockingWaitKey(0, 50);
},100);
