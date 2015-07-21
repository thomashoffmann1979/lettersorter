{Command} = require 'tualo-commander'
path = require 'path'
fs = require 'fs'
{Client} = require '../main'

params = [
  {parameter: "-m, --magellan", description: "use usb-com scanner"},
  {parameter: "-n, --nodiscover", description: "do not check if there is allread on service running"},
  {parameter: "-b, --boards [boards]", description: "the number of boards to be used"},
  {parameter: "-d, --global_delay [global_delay]", description: "global delay for open a box, defaults to 500ms"},
  {parameter: "-t, --global_timeout [global_timeout]", description: "global timeout for close a box, defaults to 1000ms"},
]

for i in [1..12]
  params.push {parameter: "-p"+i+", --boardPin"+i+" [boardPin"+i+"]", description: "pin number of boards #"+i+""}
  params.push {parameter: "-o"+i+", --optoPin"+i+" [optoPin"+i+"]", description: "pin number of optical switch #"+i+""}
  params.push {parameter: "-d"+i+", --delay"+i+" [delay"+i+"]", description: "delay for opening the board #"+i+""}
  params.push {parameter: "-t"+i+", --timeout"+i+" [timeout"+i+"]", description: "timeout for closing the board #"+i+""}


module.exports =
class ClientCMD extends Command
  @commandName: 'client'
  @commandArgs: []
  @commandShortDescription: 'run the client service'
  @options: params
  @help: () ->
    """

    """

  action: (options,args) ->
    @client = new Client (typeof options.nodiscover=='undefiend')
    gd = parseInt( options.global_delay || 500 )
    gt = parseInt( options.global_timeout || 1000 )
    if options.magellan
      debug 'options.magellan', '*'
      @client.useSTDIN=false


    if options.boards
      boards = parseInt options.boards
      if boards > 12
        boards=12
      for i in [1..boards]
        optoPin = options['optoPin'+(i)]
        boardPin= options['boardPin'+(i)]
        delay   = options['delay'+(i)] || (i * gd)
        tag     = 'K-'+i
        timeout = options['timeout'+(i)] || gt
        @client.setUpBAO tag,delay,timeout,boardPin,optoPin
      @client.start()

    else
      @client.displayPinSetup()
      error 'client', 'you have to set the number of boards'
