import { WABot } from './shared/utils/loader'
import socket from './shared/infrastructure/baileys/baileys'
import commandHandler from './lib/commands/commandHandler'
import { Tracker } from './lib/tracker'
import Scrap from './lib/scrap'

WABot.setup({
  bailey: socket,
  commandHandler: commandHandler,
  scrap: new Scrap,
  tracker: new Tracker
}).start()
