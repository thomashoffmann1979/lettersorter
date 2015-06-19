classNames = [

  'Master',
  'Client',
  'ERP',

  'PIN',
  'LED',
  'BAO'
  'Clapperboard'

]

exp = (name) ->
  exports[name] = require './classes/'+classNames[i].toLowerCase()
( exp(name) for name in classNames)
