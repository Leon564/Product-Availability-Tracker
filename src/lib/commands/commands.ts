import Scrap from "../scrap"
import track from "../useCases/track.useCase"

export class commands {
  private comandos: { [key: string]: Function } = {}
  constructor (private data: any) {
    this.comandos = {
      track
    }
  }

  static execute (data: any) {
    return new commands(data).getCommand()
  }

  async getCommand () {
    const command = this.data.message.command
    if (this.comandos[command]) {
      const response = await this.comandos[command](this.data.message)
      return response
    }
  }
}
