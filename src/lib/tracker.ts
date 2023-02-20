import Scrap from './scrap'
import fs from 'fs-extra'
import path from 'path'
import { TrackerItem, BaileysSocket } from '../shared/interfaces/types'
import * as cron from 'node-cron'

const FILE_PATH = path.join(__dirname, '../data/trackList.json')

export class Tracker {
  //Traclist is a task that runs every 5 minutes to check the availability of the products in the list
  static async tracklist (scrap: Scrap, Socket: BaileysSocket) {
    console.log('Starting tracker')
    await scrap.init()
    Tracker.StartTask(async () => {
      console.log('Checking availability')
      const tracker = new Tracker()

      const file = await tracker.getFile()
      const list = JSON.parse(file)
      const filteredList = list.filter((item: TrackerItem) => item.alert || !item.available)
      for (const item of filteredList) {
        //if (!item.alert) continue
        const availability = await scrap.scrap(item.url)
        const updatedItem = await tracker.updateItem({
          ...item,
          ...availability
        })
        if (availability.available) {
          if (item.alert)
            tracker.sendAlertMessage(item.userId, updatedItem, Socket)
          console.log(`El producto ${item.name} está disponible`)
        }
        console.log(`El producto ${item.name} no está disponible`)
      }
    })
  }

  private async sendAlertMessage (
    userId: string,
    item: TrackerItem,
    socket: BaileysSocket
  ) {
    //return console.log(item)
    if (!item.image)
      return socket.sendMessage(userId, {
        text: `*${item.name.trim()}*\n\n*Disponible:* Si\n*Precio:* ${
          item.price
        }\n*Url:* ${item.url}`
      })
    socket.sendMessage(userId, {
      image: { url: item.image },
      caption: `*${item.name.trim()}*\n\n*Disponible:* Si\n*Precio:* ${
        item.price
      }\n*Url:* ${item.url}`
    })
  }

  private async updateItem (item: TrackerItem) {
    const file = await this.getFile()
    const list = JSON.parse(file)
    const index = list.findIndex((i: TrackerItem) => i.id === item.id)
    list[index] = item
    await fs.writeFile(FILE_PATH, JSON.stringify(list))
    return item
  }

  static StartTask (task: () => void) {
    //cron.schedule('*/5 * * * *', () => {
    cron.schedule('* * * * *', () => {
      task()
    })
  }

  async getFile () {
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, '[]')
    }

    const file = await fs.readFile(FILE_PATH, 'utf-8')
    return file
  }

  static async addItem (item: TrackerItem) {
    const file = await new Tracker().getFile()
    const list = JSON.parse(file)
    list.push(item)
    await fs.writeFile(FILE_PATH, JSON.stringify(list))
    return list
  }
}
