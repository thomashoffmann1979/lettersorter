{EventEmitter} = require 'events'
PIN = require './pin'
Clapperboard = require './clapperboard'

module.exports =
class BAO extends EventEmitter
  constructor: (tag,delay,timeout,boardPin,optoPin) ->
    @tag = tag || 'node'
    @delay = delay || 1
    @timeout = timeout || 1000
    @boardPin = boardPin || 3
    @optoPin = optoPin
  setUp: () ->
    me = @
    me.board = new Clapperboard me.boardPin, me.timeout
    me.board.on 'open', () ->
      me.emit 'open'
    me.board.on 'close', () ->
      me.emit 'close'
    me.board.setUp()
    if typeof me.optoPin != 'undefined'
      me.opto = new PIN me.optoPin
      me.opto.on 'started', () ->
        me.opto.in true
      me.opto.on 'HiLo', () ->
        me.board.close()
      me.opto.start()
  close: () ->
    if typeof @board == 'object'
      @board.close()
  open: () ->
    if typeof @board == 'object'
      if @delay==0
        @board.open()
      else
        setTimeout @board.open.bind(@board), @delay
