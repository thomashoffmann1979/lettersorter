{EventEmitter} = require 'events'
socketio = require 'socket.io'
udpfindme = require 'udpfindme'

module.exports =
class Master extends EventEmitter
  constructor: () ->
    @url = ''
    @port = 3000
    @client = ''
    @login = ''
    @password = ''

    @containers = ['PLZ','SG','SGSF']

    @tags = {}

    @box_clients = {}
    @ui_clients = {}
    @ocr_clients = {}

    @clientsCount = 0

    @sendings = {}
    @box_containers = {}

  start: () ->

    discoverServer = new udpfindme.Server 31111 , '0.0.0.0'
    discoverMessage =
      port: @port
      type: 'sorter'
    discoverServer.setMessage discoverMessage


    @io = socketio()
    @io.on 'connection', (socket) => @onIncommingConnection(socket)
    @io.listen @port
    debug 'master start','listen on '+@port

    @emit 'listen', @port
    stdin = process.openStdin()
    stdin.on 'data', (data) => @onStdInput(data)

  #  options =
  #    url: @url
  #    client: @client
  #    login: @login
  #    password: @password

  #  @erp = new ERP options
  #  @erp.on 'logged in', (sid) => @onERPLogin(sid)
  #  @erp.on 'error', (error) => @onERPError(error)
  #  @erp.on 'sendings', (sendings) => @onERPSendings(sendings)
  #  @erp.login()
  #onERPLogin: (sid) ->
  #  @emit 'logged in', sid
  #  @erp.sendings()

  #onERPError: (error) ->
  #  @emit 'error', error
  #
  #onERPSendings: (sendings) ->
  #  (@addSending(item) for item in sendings)

  onStdInput: (data) ->
    input = data.toString().replace /\n/g,''
    if input=='refresh'
      @erp.sendings()

  onIncommingConnection: (socket) ->
    debug 'master connection', socket.id
    socket.on 'disconnect', (data) => @onDisconnect(socket,data)
    socket.on 'filter', (data) => @onFilter(socket,data)

    socket.on 'ping', (data) => @onPing(socket,data)

    socket.on 'ui', (data) => @onUI(socket,data)
    socket.on 'ocrservice', (data) => @onOCR(socket,data)
    socket.on 'new', (data) => @onNew(socket,data)

  onDisconnect: (socket) ->
    debug 'master disconnect', socket.id
    if typeof @ui_clients[socket.id] == 'object'
      delete @ui_clients[socket.id]
    if typeof @ocr_clients[socket.id] == 'object'
      delete @ocr_clients[socket.id]
    if typeof @box_clients[socket.id] == 'object'
      delete @box_clients[socket.id]

  onNew: (socket,data) ->
    if typeof data.codes != 'undefined'
      if data.codes.length > 0
        if typeof data.containers != 'undefined'
          if data.containers.length > 0
            @addSending data

  onUI: (socket,data) ->
    @ui_clients[socket.id] = socket

  onOCR: (socket,data) ->
    @ocr_clients[socket.id] = socket

  onPing: (socket,data) ->
    #debug 'ping', socket.id
    @addBoxClient socket
      #(@removeFilter socket.id,item.filter for item in data.list)

    #(@onFilter socket,item for item in data.list)
  addBoxClient: (socket) ->
    if typeof @box_clients[socket.id]=='undefined'
      debug 'add box', socket.id
      @box_clients[socket.id] = socket

  onFilter: (socket,data) ->
    @addBoxClient socket
    container = data.filter
    if container.length > 0
      debug 'on filter', JSON.stringify(data,null,0)
      @removeFilter container, data.tag, socket.id
      @box_containers[container] =
        tag: data.tag
        id: socket.id


      if typeof @sendings[container] == 'undefined'
        @sendings[container] = []
      msg =
        tag: data.tag
        data: @sendings[container]
      socket.emit 'add id', msg
      console.log @box_containers

  removeFilter: (container,tag,id) ->
    ( @deleteBoxContainter(cont) for cont of @box_containers when @box_containers[cont].id == id and @box_containers[cont].tag==tag and container!=cont)
    if typeof @box_containers[container] == 'object'
      if @box_containers[container].id == id
        if @box_containers[container].tag == tag
          debug 'master remove filter', 'on same tag'
          delete @box_containers[container]
      else
        console.log @box_containers[container]
        debug 'master remove filter', 'on different socket '+container

      if @box_containers[container]
        socketid = @box_containers[container].id
        sockettag = @box_containers[container].tag
        @deleteBoxContainter container
        if @box_clients[socketid]?
          msg =
            tag: sockettag
            filter: container
          @box_clients[socketid].emit 'filter removed', msg

  deleteBoxContainter: (container) ->
    debug 'remove container', container
    delete @box_containers[container]

  addSending: (item) ->
    (@addSendingContainer(container,item.codes) for container in item.containers when typeof @container[container]=='string')

  addSendingContainer: (container,codes) ->
    code = codes[0]
    if typeof @sendings[container] == 'undefined'
      @sendings[container]=[]
    @sendings[container].push code
    if typeof @box_containers[container] == 'string'
      if typeof @box_clients[@box_containers[container]] == 'object'
        @box_clients[@box_containers[container]].emit 'add id', id
