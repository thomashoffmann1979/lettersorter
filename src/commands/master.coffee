{Command} = require 'tualo-commander'
path = require 'path'
fs = require 'fs'
{Master} = require '../main'

module.exports =
class MasterCMD extends Command
  @commandName: 'master'
  @commandArgs: []
  @commandShortDescription: 'run the master service'
  @help: () ->
    """

    """
  action: (options,args) ->
    @master = new Master
    @master.start()
