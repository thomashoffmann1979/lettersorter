(function() {
  var classNames, colors, exp, fs, i, len, name;

  colors = require("colors");

  fs = require("fs");

  global.logDebug = process.env.log_debug !== "0";

  global.logInfo = process.env.log_info !== "0";

  global.logWarn = process.env.log_warn !== "0";

  global.logError = process.env.log_error !== "0";

  global.debug = function(tag, msg, data) {
    if (global.logDebug === true) {
      console.log(colors.blue('debug'), colors.gray(tag), msg);
      return fs.appendFile('debug.log', [tag, msg].join(' ') + "\n", function(err) {
        return null;
      });
    }
  };

  global.info = function(tag, msg) {
    if (global.logInfo === true) {
      console.log(colors.green('info'), colors.gray(tag), msg);
      return fs.appendFile('info.log', [tag, msg].join(' ') + "\n", function(err) {
        return null;
      });
    }
  };

  global.warn = function(tag, msg) {
    if (global.logWarn === true) {
      console.log(colors.yellow('warning'), colors.gray(tag), msg);
      return fs.appendFile('warn.log', [tag, msg].join(' ') + "\n", function(err) {
        return null;
      });
    }
  };

  global.error = function(tag, msg) {
    if (global.logError === true) {
      console.log(colors.red('error'), colors.gray(tag), msg);
      return fs.appendFile('error.log', [tag, msg].join(' ') + "\n", function(err) {
        return null;
      });
    }
  };

  classNames = ['Dispatcher', 'Client', 'PIN', 'LED', 'BAO', 'Clapperboard'];

  exp = function(name) {
    return exports[name] = require('./classes/' + name.toLowerCase());
  };

  for (i = 0, len = classNames.length; i < len; i++) {
    name = classNames[i];
    exp(name);
  }

}).call(this);
