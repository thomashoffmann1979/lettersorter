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

  onFilterRemoved: (filter) ->
    ftag = null
    for tag of @baos when @baos[tag].filter == filter
      ftag = tag
    if ftag?
      @baos[ftag].filter = ''
      msg =
        tag: ftag
        filter: filter
      @sendIO 'filter', msg
      @freeWaitFor ftag

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
        @emit 'error', error

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
      @emit 'error', err

  padR: (str, length) ->
    while str.length < length
      str+=' '
    str.substring 0, length

  displayPinSetup: () ->
    cl = []
    notes = []
    for i in [1..42]
      cl[i-1] = 'black'
      notes[i-1] = '---'
    for tag of @baos
      notes[ @baos[tag].boardPin - 1 ]  = tag+' B'
      cl[ @baos[tag].boardPin - 1 ]     = 'blue'
      notes[ @baos[tag].optoPin - 1 ]   = tag+' O'
      cl[ @baos[tag].optoPin - 1 ]      = 'magenta'

    notes[1 - 1]  = me.padR '3.3V+', 8
    cl[1 - 1]     = 'yellow'
    notes[2 - 1]  = me.padR '5V', 8
    cl[2 - 1]     = 'red'
    notes[4 - 1]  = me.padR '5V+', 8
    cl[4 - 1]     = 'red'

    notes[6 - 1]  = me.padR 'GND',8
    cl[6 - 1]     = 'grey'
    notes[9 - 1]  = me.padR 'GND',8
    cl[9 - 1]     = 'grey'
    notes[14 - 1] = me.padR 'GND',8
    cl[14 - 1]    = 'grey'
    notes[17 - 1] = me.padR 'GND',8
    cl[17 - 1]    = 'grey'
    notes[20 - 1] = me.padR 'GND',8
    cl[20 - 1]    = 'grey'
    notes[25 - 1] = me.padR 'GND',8
    cl[25 - 1]    = 'grey'
    notes[me.alivePinNumber-1]  = me.padR 'LED' ,6
    cl[me.alivePinNumber - 1]   = 'green'


    endL  = "\n"
    l     = ''
    l    += endL
    l    += '|-------------------||-------------------|'
    l    += endL
    i     = 1
    for y in [0..20]
      for x in [0..2]
        pn = colors[cl[i-1]]( @padR( '#'+(i)+'', 4) )
        l +='| '+pn+' | ' + colors[cl[i-1]]( @padR(notes[i-1],10) )+' |'
        i++
      l += endL
      l +='|-------------------||-------------------|'
      l += endL
    console.log l
