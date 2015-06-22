{EventEmitter} = require 'events'
PIN = require './pin'

module.exports =
class Clapperboard extends EventEmitter
  constructor: (pin, timeout) ->
    @pin = pin || 2
    @timeout = timeout || 500
    @active = false
    @timer = null
    @openindex = 0
  setUp: () ->
    @board = new PIN @pin
    @board.on 'started', () => @onBoardStarted()
    @board.on 'set out', () => @onBoardSetOut()
    @board.start
  onBoardStarted: () ->
    @board.out()
  onBoardSetOut: () ->
    @active = true
    @open()
  setTimeout: () ->
    @timer = setTimeout @close.bind(@) ,@timeout
  clear: () ->
    if @timer?
      clearTimeout @timer
      @timer = null
  close: () ->
    if @active==true
      @openindex--
      if @openindex == 0
        @board.set false
        debug 'clapperboard','close'
        @emit 'close', true
  open: () ->
    if @active==true
      @openindex++
      @board.set true
      debug 'clapperboard','open'
      @emit 'open', true
      @setTimeout()
