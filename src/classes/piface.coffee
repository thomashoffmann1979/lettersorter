{EventEmitter} = require 'events'
try
  PI = require 'node-pifacedigital'
catch e

module.exports =
class PIFace extends EventEmitter
  constructor: (tag,delay,timeout,boardPin,optoPin,closeOnHiLO,motorPin) ->
    if typeof closeOnHiLO=='undefined'
      closeOnHiLO=true
    @tag = tag || 'node'
    @delay = delay || 1
    @timeout = timeout || 1000
    @boardPin = boardPin || 0
    @optoPin = optoPin
    @motorPin = motorPin
    @closeOnHiLO = closeOnHiLO
    @boardOpenCounter = 0


  setUp: () ->
    @PI = new PI.PIFaceDigital 0, true
    if @optoPin?
      @PI.watch @optoPin, @onWatch.bind(@)
    if @motorPin?
      @PI.set @motorPin, 1

  onWatch: (pin,type) ->
    if pin == @optoPin
      if @closeOnHiLO and type == 'hilo'
        @close()

      else if !@closeOnHiLO and type == 'lohi'
        @close()

  open: () ->
    setTimeout @_open.bind(@), @delay
    @_closeTimer = setTimeout @close.bind(@), @timeout

  _open: () ->
    @boardOpenCounter++
    @PI.set(@boardPin,1)

  close: () ->
    debug 'piface boardOpenCounter',@boardOpenCounter
    @boardOpenCounter--
    if @boardOpenCounter < 0
      @boardOpenCounter = 0
    if @boardOpenCounter == 0
      @PI.set @boardPin, 0
