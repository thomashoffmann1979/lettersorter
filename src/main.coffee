colors = require "colors"
global.logDebug = process.env.log_debug != "0"
global.logInfo = process.env.log_info != "0"
global.logWarn = process.env.log_warn != "0"
global.logError = process.env.log_error != "0"


global.debug = (tag,msg,data) ->
  if global.logDebug == true
    console.log colors.blue('debug'),colors.gray(tag),msg
    fs.appendFile 'debug.log', [tag,msg].join(' ')+"\n", (err)->
      null

global.info = (tag,msg) ->
  if global.logInfo == true
    console.log colors.green('info'),colors.gray(tag),msg
    fs.appendFile 'info.log', [tag,msg].join(' ')+"\n", (err)->
      null
global.warn = (tag,msg) ->
  if global.logWarn == true
    console.log colors.yellow('warning'),colors.gray(tag),msg
    fs.appendFile 'warn.log', [tag,msg].join(' ')+"\n", (err)->
      null
global.error = (tag,msg) ->
  if global.logError == true
    console.log colors.red('error'),colors.gray(tag),msg
    fs.appendFile 'error.log', [tag,msg].join(' ')+"\n", (err)->
      null


classNames = [

  'Dispatcher',
  'Client',
  #'ERP',

  'PIN',
  'LED',
  'BAO'
  'Clapperboard'

]

exp = (name) ->
  exports[name] = require './classes/'+name.toLowerCase()
( exp(name) for name in classNames)
