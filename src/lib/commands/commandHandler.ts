import { proto } from '@adiwajshing/baileys'
import {
  BaileysSocket,
  MessageData,
  SendData
} from '../../shared/interfaces/types'
import { MessageMapper } from '../../shared/infrastructure/baileys/baileys.mapper'
import { commands } from './commands'
import { readFileSync } from 'fs'

class commandHandler {
  constructor (
    private socket: BaileysSocket,
    private message: proto.IWebMessageInfo,
    private messageData: MessageData
  ) {}

  static async start (socket: BaileysSocket, message: proto.IWebMessageInfo) {
    const messageData = MessageMapper.toDomain({ data: message, socket })
    const handler = new commandHandler(socket, message, messageData)
    return handler.messageHandler()
  }

  async messageHandler () {
    const { messageData, socket, message } = this
    if (messageData.message.isCommand) {
      const reply = await commands.execute(messageData)
      if (reply)
      await this.sendReply(reply)
    }
  }

  async sendReply (data: SendData) {
    const { userId, device } = this.messageData

    //quoting
    let quoted: any = data.quoted ? { quoted: this.message } : {}
    if (data.fakeQuoted) {
      quoted = MessageMapper.replyFakeMessage({
        text: data.fakeQuoted || 'hola'
      })
    }

    const messageContent = MessageMapper.toSocket(data, device)

    await this.socket.sendMessage(userId, messageContent, { ...quoted })

    if (data.reacttion)
      await this.socket.sendMessage(userId, {
        react: { text: data.reacttion, key: this.message.key }
      })
  }
}

export default commandHandler
