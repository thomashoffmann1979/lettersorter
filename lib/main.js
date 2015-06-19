(function() {
  var classNames, exp, j, len, name;

  classNames = ['Master', 'Client', 'ERP', 'PIN', 'LED', 'BAO', 'Clapperboard'];

  exp = function(name) {
    return exports[name] = require('./classes/' + classNames[i].toLowerCase());
  };

  for (j = 0, len = classNames.length; j < len; j++) {
    name = classNames[j];
    exp(name);
  }

}).call(this);
