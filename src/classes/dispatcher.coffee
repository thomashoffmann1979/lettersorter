{EventEmitter} = require 'events'
socketio = require 'socket.io'
udpfindme = require 'udpfindme'
freeport = require 'freeport'
variables = require '../variables'

module.exports =
class Dispatcher extends EventEmitter
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
    @erp_clients = {}

    @clientsCount = 0
    @sendings = {}
    @box_containers = {}

  freeport: (err,port) ->
    if err
      @emit 'error', err
    else
      @port = port
      setTimeout @deferedStart.bind(@),1000

  deferedStart: () ->
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

  start: () ->
    freeport (err,port) => @freeport(err,port)


  onStdInput: (data) ->
    input = data.toString().replace /\n/g,''
    if input=='refresh'
      @sendERP 'sendings'

  onIncommingConnection: (socket) ->
    debug 'master connection', socket.id
    socket.on 'disconnect', (data) => @onDisconnect(socket,data)
    socket.on 'filter', (data) => @onFilter(socket,data)

    socket.on 'ping', (data) => @onPing(socket,data)

    socket.on 'ui', (data) => @onUI(socket,data)
    socket.on 'erp', (data) => @onERP(socket,data)
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
    debug 'on new', JSON.stringify(data, null, 10)
    if typeof data.codes != 'undefined'
      if data.codes.length > 0
        if typeof data.containers != 'undefined'
          @addSending data
        else
          info 'on new', 'got data without containers'
      else
        info 'on new', 'got data with no code'
    else
      info 'on new', 'got data without codes'
  onUI: (socket,data) ->
    @ui_clients[socket.id] = socket
  sendUI: (event,data) ->
    (@ui_clients[id].emit(event,data) for id of @ui_clients when @ui_clients[id].connected==true)

  onERP: (socket,data) ->
    @erp_clients[socket.id] = socket
    debug 'erp', socket.id
    socket.on 'error', (msg) => @onERPError(msg)
    socket.on 'sendings', (list) => @onSendings(list)
    socket.on 'loginSuccess', (data) => @onLoginSuccess(socket,data)
    socket.on 'loginError', (data) => @onLoginError(socket,data)
    msg =
      client: variables.ERP_CLIENT
      login: variables.ERP_LOGIN
      password: variables.ERP_PASSWORD
    socket.emit 'login', msg

  onERPError: (socket,data) ->
    error 'dispatcher erp error', data
    
  onLoginSuccess: (socket,data) ->
    debug 'login', data
    @sendERP 'sendings', {}
    @timer = setInterval @loopSendings.bind(@), 60000

  loopSendings: () ->
    @sendERP 'sendings', {}

  onLoginError: (socket,data) ->
    error 'login error', data
  onSendings: (list) ->
    debug 'on sendings', JSON.stringify(list,null,0).substring(0,50)
    (@addSending(item) for item in list)
  sendERP: (event,data) ->
    (@erp_clients[id].emit(event,data) for id of @erp_clients when @erp_clients[id].connected==true)


  onOCR: (socket,data) ->
    @ocr_clients[socket.id] = socket
    debug 'send ocr', 'start'
    socket.emit 'start', true
  sendOCR: (event,data,socket) ->
    msg = data
    if socket?
      msg.id = socket.id
    msg.timestamp = new Date
    (@ocr_clients[id].emit(event,data) for id of @ocr_clients when @ocr_clients[id].connected==true)

  onPing: (socket,data) ->
    @addBoxClient socket
    @sendUI 'ping', data, socket

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


      @sendUI 'filter', data, socket

      if typeof @sendings[container] == 'undefined'
        @sendings[container] = []
      msg =
        tag: data.tag
        data: @sendings[container]
      debug 'adding', container + ' #'+data.tag+' *'+@sendings[container].length
      socket.emit 'add id', msg

  removeFilter: (container,tag,id) ->
    # removing same tag, same socket and different container
    ( @deleteBoxContainter(cont) for cont of @box_containers when @box_containers[cont].id == id and @box_containers[cont].tag==tag and container!=cont)
    if typeof @box_containers[container] == 'object'
      if @box_containers[container].id == id
        if @box_containers[container].tag == tag
          debug 'master remove filter', 'on same tag'
          @deleteBoxContainter container
      else
        debug 'master remove filter', 'on different socket '+container

      if typeof @box_containers[container] == 'object'
        socket_id = @box_containers[container].id
        socket_tag = @box_containers[container].tag
        @deleteBoxContainter container
        if @box_clients[socket_id]?
          msg =
            tag: socket_tag
            filter: container
          @box_clients[socket_id].emit 'filter removed', msg
          data = msg
          data.id = socket_id
          @sendUI 'filter removed', data

  deleteBoxContainter: (container) ->
    debug 'remove container', container
    delete @box_containers[container]

  addSending: (item) ->
    (@addSendingContainer(container+'-'+item.containers[container],item.codes) for container of item.containers )

  addSendingContainer: (container,codes) ->
    code = codes[0]
    if typeof @sendings[container] == 'undefined'
      @sendings[container]=[]
    if @sendings[container].indexOf(code) < 0
      debug 'add sending container', container+' #'+code
      @sendings[container].push code
    else
      debug 'add sending container', 'allready there'

    if typeof @box_containers[container] == 'string'
      if typeof @box_clients[@box_containers[container]] == 'object'
        @box_clients[@box_containers[container]].emit 'add id', id
