{Command} = require 'tualo-commander'
path = require 'path'
fs = require 'fs'
{Dispatcher} = require '../main'

module.exports =
class DispatcherCMD extends Command
  @commandName: 'dispatcher'
  @commandArgs: []
  @commandShortDescription: 'run the dispatcher service'
  @help: () ->
    """

    """
  action: (options,args) ->
    @dispatcher = new Dispatcher
    @dispatcher.start()
