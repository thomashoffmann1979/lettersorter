{EventEmitter} = require 'events'
{Magellan} = require 'magellan-scanners'
socket = require 'socket.io-client'
colors = require 'colors'
osenv = require 'osenv'
util = require 'util'
PIN = require './pin'

module.exports =
class Client extends EventEmitter
  constructor: () ->
    @state = 'none'
    @baos = {}
    @baosIndex = 0
    @connected = false
    @host = 'http://localost:3000/'
    @alivePinNumber = 26
    @useSTDIN = false
    @lastSetupFile = path.join osenv.home(),'.sorter_last_setup.json'
    @containers = ['PLZ','SG','SGSF']

  setUpBAO: (tag,delay,timeout,boardPin,optoPin) ->
    @baos[tag] = new BAO tag,delay,timeout,boardPin,optoPin
    @baosIndex++
  ping: () ->
    list = []
    (list.push({ tag: tag,filter: @baos[tag].filter }) for tag of @baos)
    if @io?
      data =
        index: @baosIndex
        list: list
      @sendIO 'ping', data
  start: () ->
    @io = socket @host

    @io.on 'connect', () => @onConnect()
    @io.on 'disconnect', () => @onDisconnect()
    @io.on 'filter removed',(data) => @onFilterRemoved(data)
    @io.on 'containers',(data) => @onContainers(data)
    @io.on 'add id', (data) => @onID(data)

    setInterval @ping.bind(@), 5000
    if @useSTDIN==false
      try
        magellan = new Magellan
        magellan.read (input) => @onMagellanInput(input)
      catch error
        console.log 'missing magellan scanner, now using stdin'
        @useSTDIN = true

    @alive = new LED
    @alive.pin = @alivePinNumber
    @alive.set()
    @alive.run()

    (@baos[tag].setUp() for tag of @baos)

    if @useSTDIN==true
      stdin = process.openStdin()
      stdin.on 'data', (input) => @onStdInput(input)


    setTimeout @lastSetup.bind(@), 1000

  onStdInput: (input) ->
    @onInput input.toString()

  onMagellanInput: (input) ->
    input = input.replace /^\*/,''
    input = input.replace /^i/,''
    @onInput input

  onInput: (input) ->
    input = input.replace /\n/g, ''
    parts = input.split '-'
    key = parts[0]
    if key == 'K'
      @state = 'proc'
      @filterFor = input
      @sendIO 'proc', input
      @setResetTimer()
    else if @checkIfProc(key)
      if @baosIndex==1
        @filterFor = 'K-1'
      @setFilter @filterFor, input
    else
      @sendIO 'code', input
      if typeof @waitfor[input] == 'string'
        tag = @waitfor[input]
        if typeof @baos[tag] == 'object'
          msg =
            id: input
            tag: tag
          @io.emit 'open', msg
          @baos[tag].open()
        else
          @sendIO 'error', new Error('waiting for tag, but have no board for'+tag)
      else
        @sendIO 'notforme', input

  onConnect: () ->
    @connected = true
    @alive.connected = true
    @ping()
  onDisconnect: () ->
    @connected = true
    @alive.connected = false

  onFilterRemoved: (data) ->
    tag = data.tag
    if tag?
      @baos[tag].filter = ''
      msg =
        tag: tag
        filter: filter
      @sendIO 'filter', msg
      @freeWaitFor tag

  freeWaitFor: (tag) ->
    (@deleteID(id) for id in @waitfor when @waitfor[id]==tag)
  deleteID: (id) ->
    delete @waitfor[id]
  addID: (tag,id) ->
    @waitfor[id] = tag
  onContainers: (data) ->
    @containers = data
  onID: (msg) ->
    if msg.tag? and msg.data?
      if util.isArray(msg.data)
        freeWaitFor msg.tag
        list = msg.data
      else
        list = [msg.data]
      (@addID(id) for id in list)
  sendIO: (tag,data) ->
    if @connected==true
      @io.emit tag, data
  checkIfProc: (key) ->
    if @containers.indexOf(key) > -1
      if @baosIndex==1
        true
      else if @baosIndex > 1 and @state == 'proc'
        true
      else
        false
    else
      false

  setFilter: (tag,filter) ->
    @baos[tag].filter = input
    msg =
      tag: tag
      filter: filter
    @sendIO 'filter', msg
    @baos[tag].open()
    @setSaveTimer()

  setResetTimer: () ->
    if typeof @resetTimer!='undefined'
      clearTimeout @resetTimer
    @resetTimer = setTimeout @resetState.bind(@), 5000

  resetState: () ->
    @state = 'none'
    @sendIO 'none'

  lastSetup: () ->
    fs.exists @lastSetupFile, (exists) => @onLastSetupExists(exists)
  onLastSetupExists: (exists) ->
    if exists
      try
        list = require @lastSetupFile
        (@setFilter(item.tag,item.filter) for item in list when typeof item.tag=='string' and typeof item.filter=='string' and typeof @baos[item.tag]=='object')
      catch error
        emit 'error', error

  setSaveTimer: () ->
    if typeof @saveTimer!='undefined'
      clearTimeout @saveTimer
    @saveTimer = setTimeout @save.bind(@), 5000

  save: () ->
    list = []
    (list.push({ tag: tag,filter: @baos[tag].filter }) for tag of @baos)
    fs.writeFile @lastSetupFile, (err) => @onSave(err)
  onSave: (err) ->
    if err
      emit 'error', err
