{EventEmitter} = require 'events'
PIN = require './pin'

pulse =
  connected: [ 100, 500 ]
  notConnected: [ 900 ]

module.exports =
class LED extends EventEmitter
  constructor: (pin) ->
    @pulse = pulse
    @pin = pin || 26
    @active = false
    @connected = false
    @alive = true
    @timer = null
    @openindex = 0
    @setUp()
  setUp: () ->
    @led = new PIN @pin
    @led.on 'started', () => @onLEDStarted()
    @led.on 'set out', () => @onLEDSetOut()
    @led.start
  onLEDStarted: () ->
    @led.out()
  onLEDSetOut: () ->
    @active = true
  run: ()->
    frequencies = if @connected then @pulse.connected else @pulse.notConnected
    index = frequencies.indexOf @timeout
    index++
    if index > frequencies.length
      index = 0
    @timeout = frequencies[index]
    setTimeout @onTimeout.bind(@) , @timeout
  onTimeout: () ->
    if @alive
      @alive = false
    else
      @alive = true
    @led.set @alive
    @run()
