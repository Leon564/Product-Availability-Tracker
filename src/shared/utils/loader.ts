import { BaileysSocket } from '../interfaces/types'
import { Tracker } from '../../lib/tracker'
import Scrap from '../../lib/scrap'

type Options = {
  bailey: () => Promise<BaileysSocket>
  commandHandler: any,
  tracker : Tracker,
  scrap: Scrap
}

export class WABot {
  constructor (private options: Options) {}

  static setup (options: Options): WABot {
    return new WABot(options)
  }

  async start () {
    const { bailey, commandHandler } = this.options
    const socket = await bailey()
    socket.ev.on('messages.upsert', ({ messages }) =>
      commandHandler.start(socket, messages[0])
    )

    Tracker.tracklist(new Scrap, socket)
  }
}
