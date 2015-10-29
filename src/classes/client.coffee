{EventEmitter} = require 'events'
{Magellan} = require 'magellan-scanners'
socket = require 'socket.io-client'
colors = require 'colors'
path = require 'path'
fs = require 'fs'
os = require 'os'
osenv = require 'osenv'
udpfindme = require 'udpfindme'
util = require 'util'
PIN = require './pin'
LED = require './led'
BAO = require './bao'
PIFace = require './piface'

module.exports =
class Client extends EventEmitter
  constructor: (startdiscoverserver) ->
    if typeof startdiscoverserver=='undefined'
      startdiscoverserver = false

    @state = 'none'
    @baos = {}
    @baosIndex = 0
    @connected = false
    @discoverd = false
    @alivePinNumber = 26
    @useSTDIN = true
    @lastSetupFile = path.join osenv.home(),'.sorter_last_setup.json'
    @containers = ['PLZ','SG','SGSF']
    @waitfor = {}

    @inputDevice = ""

    @usePiFaceDigital = false

    if startdiscoverserver==true
      discoverServer = new udpfindme.Server 31111 , '0.0.0.0'
      discoverMessage =
        port: @port
        type: 'sorter-client'
      discoverServer.setMessage discoverMessage


    @interfaces = []
    @nInterfaces = os.networkInterfaces()
    (@setIFace(@nInterfaces[name]) for name of @nInterfaces)

    #process.on 'exit', @_clean.bind(@)
    process.on 'SIGTERM', @_clean.bind(@)
    process.on 'SIGINT', @_clean.bind(@)
    process.on 'SIGHUP', @_clean.bind(@)

  _clean: () ->
    if @usePiFaceDigital==true
      @baos['K-1'].PI.set 0,0
      @baos['K-1'].PI.set 0,1
      @baos['K-1'].PI.set 0,2
      @baos['K-1'].PI.set 0,3
      @baos['K-1'].PI.set 0,4
      @baos['K-1'].PI.set 0,5
      @baos['K-1'].PI.set 0,6
      @baos['K-1'].PI.set 0,7
      process.exit()

  setIFace: (entries) ->
    (@interfaces.push(item.address) for item in entries when item.family=='IPv4')

  setUpBAO: (tag,delay,timeout,boardPin,optoPin,closeOnHiLO) ->
    @baos[tag] = new BAO tag,delay,timeout,boardPin,optoPin,closeOnHiLO
    @baosIndex++

  setUpPIFace: (tag,delay,timeout,boardPin,optoPin,closeOnHiLO,motorPin) ->
    @usePiFaceDigital = true
    @baos[tag] = new PIFace tag,delay,timeout,boardPin,optoPin,closeOnHiLO,motorPin
    @baosIndex++

  ping: () ->
    list = []
    (list.push({ tag: tag,filter: @baos[tag].filter }) for tag of @baos)
    if @io?
      data =
        index: @baosIndex
        list: list
      @sendIO 'ping', data

  onDiscoveryFound: (data,remote)->
    if typeof data.type == 'string'
      if data.type == 'sorter'
        @url = 'http://'+remote.address+':'+data.port+'/'
        if not @io?.connected
          @setIoConnectTimer()
      if data.type == 'sorter-client'
        if @interfaces.indexOf(remote.address) >= 0
          error 'client', 'there is on service running'

  setIoConnectTimer: ()->
    if typeof @ioConnectTimer!='undefined'
      clearTimeout @ioConnectTimer
    @ioConnectTimer = setTimeout @setIO.bind(@), 1000

  setIO: () ->
    opt =
      autoConnect: false
    @io = socket @url, opt
    debug 'client start', 'set up io '+@url
    @io.on 'connect_error', (err) => @onConnectError(err)
    @io.on 'connect', () => @onConnect()
    @io.on 'disconnect', () => @onDisconnect()
    @io.on 'filter removed',(data) => @onFilterRemoved(data)
    @io.on 'containers',(data) => @onContainers(data)
    @io.on 'add id', (data) => @onID(data)
    @io.connect()

  onDiscoveryTimout: () ->
    @discovery.discover()

  start: () ->

    @discovery = new udpfindme.Discovery 31111
    @discovery.on 'found', (data,remote) => @onDiscoveryFound(data,remote)
    @discovery.on 'timeout', () => @onDiscoveryTimout()
    @discovery.discover()


    setInterval @ping.bind(@), 10000
    if @useSTDIN==false
      try
        magellan = new Magellan
        magellan.read (input) => @onMagellanInput(input)
        debug 'client magellan', 'using magellan scanner'
      catch error
        warn 'client magellan', 'missing magellan scanner, now using stdin'
        @useSTDIN = true

    @alive = new LED
    @alive.pin = @alivePinNumber
    @alive.run()

    (@baos[tag].setUp() for tag of @baos)

    if @useSTDIN==true
      stdin = process.openStdin()
      stdin.on 'data', (input) => @onStdInput(input)


    setTimeout @lastSetup.bind(@), 1000
    @displayPinSetup()

  onStdInput: (input) ->
    debug 'stdin', input.toString()
    @onInput input.toString().substring(0,input.toString().length-2)
    @onInput input.toString()

  onMagellanInput: (input) ->
    input = input.replace /^\*/,''
    input = input.replace /^i/,''
    @onInput input

  onInput: (input) ->

    if @io?.connected == true
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
        checkCode = ""

        if typeof @waitfor[input] == 'string'
          checkCode = input
        else if typeof @waitfor[input.substring(0,input.length-2)] == 'string'
          checkCode = input.substring(0,input.length-2)

        if typeof @waitfor[checkCode] == 'string'
          tag = @waitfor[checkCode]
          if typeof @baos[tag] == 'object'
            msg =
              id: checkCode
              tag: tag
            @io.emit 'open', msg
            @baos[tag].open()
          else
            @sendIO 'error', new Error('waiting for tag, but have no board for'+tag)
        else
          @sendIO 'notforme', input
    else
      error 'onInput','not connected'

  onConnectError: (err) ->
    debug 'connect_error'
    @io.disconnect()

  onConnect: () ->
    debug 'client connected', 'ok'
    @alive.connected = true
    setTimeout @setAllFilter.bind(@), 2000

  setAllFilter: () ->
    list = @list()
    (@setFilter(item.tag,item.filter) for item in list when typeof item.tag=='string' and typeof item.filter=='string' and typeof @baos[item.tag]=='object')
    #@ping()


  onDisconnect: () ->
    debug 'client disconnected', '-'
    @alive.connected = false

  onFilterRemoved: (data) ->
    debug 'client on removed filter', data
    if @baos[data.tag]?
      if @baos[data.tag].filter == data.filter
        @baos[data.tag].filter = ''
        @freeWaitFor data.tag

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
        @freeWaitFor msg.tag
        list = msg.data
        debug 'client got list', list.length
      else
        list = [msg.data]
      debug 'client adding ids', list.length
      (@addID(msg.tag,id) for id in list)
    true
  sendIO: (tag,data) ->
    if @io?
      debug tag, @io.id+JSON.stringify(data, null, 0)
      @io.emit tag, data
    else
      debug 'sendio','defered'
      me = @
      fn = (tag,data) ->
        me.sendIO(tag,data)
      setTimeout fn, 2000

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
    debug 'client set filter', tag+' '+filter
    @baos[tag].filter = filter
    msg =
      tag: tag
      filter: filter
    @sendIO 'filter', msg
    debug 'client baos open', tag
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
        for item in list when typeof item.tag=='string' and typeof item.filter=='string' and typeof @baos[item.tag]=='object'
          @setFilter(item.tag,item.filter)
      catch error
        console.log error
        #@emit 'error', error

  setSaveTimer: () ->
    if typeof @saveTimer!='undefined'
      clearTimeout @saveTimer
    @saveTimer = setTimeout @save.bind(@), 5000

  list: () ->
    list = []
    (list.push({ tag: tag,filter: @baos[tag].filter }) for tag of @baos)
    list
  save: () ->
    fs.writeFile @lastSetupFile,JSON.stringify(@list(),null,2), (err) => @onSave(err)
  onSave: (err) ->
    if err
      @emit 'error', err

  padR: (str, length) ->
    while str.length < length
      str+=' '
    str.substring 0, length

  displayPinSetup: () ->
    endL  = "\n"
    if @usePiFaceDigital==true
      w = 3
      l = ''
      r0 = ''
      r1 = ''
      if @baos['K-1'].boardPin*1==0
        r0= 'B'
      if @baos['K-1'].motorPin*1==0
        r0= 'M'
      if @baos['K-1'].boardPin*1==1
        r1= 'B'
      if @baos['K-1'].motorPin*1==1
        r1= 'M'

      l += colors.black( '----' ) + endL
      l += colors.black( '|NO|' ) + r0 + endL
      l += colors.black( '|CO|' ) + r0 + endL
      l += colors.black( '|NC|' ) + r0 + endL
      l += colors.black( '----' ) + endL
      l += colors.black( '|NO|' ) + r1 + endL
      l += colors.black( '|CO|' ) + r1 + endL
      l += colors.black( '|NC|' ) + r1 + endL
      l += colors.black( '----' ) + endL
      l += colors.black( '|0V|' ) + endL
      l += colors.black( '|0V|' ) + endL
      l += colors.black( '|5V|' ) + endL
      l += colors.black( '----' ) + endL

      l += colors.red( '---' )

      for i in [0..9]
        l += colors.yellow( '--' )
      l += colors.yellow( '-' )
      for i in [0..9]
        l += colors.green( '--' )
      l += colors.green( '-' )

      l += colors.blue( '---' )
      l += endL

      l += colors.red( '|+|' )
      for i in [0..9]
        v = '*'
        if @baos['K-1'].boardPin*1==i
          v = 'B'
        if @baos['K-1'].motorPin*1==i
          v = 'M'
        l += colors.yellow( '|'+v )

      l += colors.yellow('|')
      for i in [0..9]
        v = '*'
        if @baos['K-1'].optoPin*1==i
          v = 'O'
        l += colors.green( '|'+v )
      l += colors.green('|')
      l += colors.blue( '|-|' )
      l +=endL

      l += colors.red( '---' )
      for i in [0..9]
        l += colors.yellow( '--' )
      l += colors.yellow( '-' )
      for i in [0..9]
        l += colors.green( '--' )
      l += colors.green( '-' )

      l += colors.blue( '---' )
      l += endL
      console.log l

    else
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

      notes[1 - 1]  = @padR '3.3V+', 8
      cl[1 - 1]     = 'yellow'
      notes[2 - 1]  = @padR '5V', 8
      cl[2 - 1]     = 'red'
      notes[4 - 1]  = @padR '5V+', 8
      cl[4 - 1]     = 'red'

      notes[6 - 1]  = @padR 'GND',8
      cl[6 - 1]     = 'grey'
      notes[9 - 1]  = @padR 'GND',8
      cl[9 - 1]     = 'grey'
      notes[14 - 1] = @padR 'GND',8
      cl[14 - 1]    = 'grey'
      notes[17 - 1] = @padR 'GND',8
      cl[17 - 1]    = 'grey'
      notes[20 - 1] = @padR 'GND',8
      cl[20 - 1]    = 'grey'
      notes[25 - 1] = @padR 'GND',8
      cl[25 - 1]    = 'grey'
      notes[@alivePinNumber-1]  = @padR 'LED' ,6
      cl[@alivePinNumber - 1]   = 'green'



      l     = ''
      l    += endL
      l    += '|-------------------||-------------------|'
      l    += endL
      i     = 1
      for y in [1..20]
        for x in [1..2]
          pn = colors[cl[i-1]]( @padR( '#'+(i)+'', 4) )
          l +='| '+pn+' | ' + colors[cl[i-1]]( @padR(notes[i-1],10) )+' |'
          i++
        l += endL
        l +='|-------------------||-------------------|'
        l += endL
      console.log l
