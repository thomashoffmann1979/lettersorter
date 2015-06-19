{EventEmitter} = require 'events'
path = require 'path'
fs = require 'fs'

PIN_MAP = [
  -1,
  -1,-1,
  2,-1,
  3,-1,
  4,14,
  -1,15,
  17,18,
  27,-1,
  22,23,
  -1,24,
  10,-1,
  9,25,
  11,8,
  -1,7,

  -1,-1,
  5,-1,
  6,12,
  13,-1,
  19,16,
  26,20,
  -1,21

]
gpioPath = path.join path.sep,'sys','class','gpio'
gpioExportFile = path.join gpioPath,'export'

module.exports =
class PIN extends EventEmitter
  constructor: (pinNumber) ->

    if typeof PIN_MAP[pinNumber]=='undefined'
      throw new Error 'This pin number is not supported'
    if PIN_MAP[pinNumber]==-1
      throw new Error 'This pin number is not allowed'
    @pin = PIN_MAP[pinNumber]
    @currentPath = path.join gpioPath,"gpio" + @pin
    @currentDirection = path.join gpioPath,"gpio" + @pin,'direction'
    @currentValue = path.join gpioPath,"gpio" + @pin,'value'

  start: () ->
    fs.exists gpioPath, (exists) => @onGPIOExists(exists)
  ready: () ->
    @emit 'started', true
  error: (error) ->
    @emit 'error', error
  onGPIOExists: (exists) ->
    if exists
      fs.exists @currentPath, (exists) => @onCurrentGPIOExists(exists)
    else
      throw new Error 'No access to GPIO'
  onCurrentGPIOExists: (exists) ->
    if exists
      @ready()
    else
      fs.writeFile gpioExportFile, @pin, (error) => @onCurrentGPIOExported(error)
  onCurrentGPIOExported: (error) ->
    if error
      @error error
    else
      setTimeout @ready.bind(@), 500
  out: () ->
    fs.writeFile @currentDirection, 'out', (error) => @onOut(error)
  onOut: (error) ->
    if error
      @error error
    else
      @emit 'set out', true
  in: () ->
    fs.writeFile @currentDirection, 'in', (error) => @onIn(error)
  onIn: (error) ->
    if error
      @error error
    else
      @emit 'set out', true
  check: () ->
    if typeof @lastState == 'undefined'
      @lastState = false
    c = @get()
    if c==true
      if lastState==false
        @lastState = true
        @emit 'LoHi', true
        true
    else
      if lastState==true
        @emit 'HiLo', true
      @lastState = false
    false
  set: (v) ->
    if v==true
      v='1'
    if v==false
      v='0'
    fs.writeFile @currentValue, v, (error) => @onValue(error)
  onValue: (error) ->
    if error
      @error error
    else
  get: () ->
    res = fs.readFileSync(@currentValue).toString().trim()
    if res=='0'
      false
    else
      true
