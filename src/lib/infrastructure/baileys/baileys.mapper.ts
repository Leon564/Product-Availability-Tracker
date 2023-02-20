import {
  proto,
  downloadMediaMessage,
  getDevice,
  isJidGroup
} from '@adiwajshing/baileys'
import {
  BaileysMessage,
  BaileysSocket,
  MessageBody,
  MessageData,
  MessageType,
  Nullable,
  SendData
} from '../../interfaces/types'
import { writeFileSync } from 'fs'
import config from '../configs/config'

export class MessageMapper {
  static toDomain ({
    data,
    socket
  }: {
    data: proto.IWebMessageInfo
    socket: BaileysSocket
  }): MessageData {
    const message = Message.create({ data })
    return {
      id: data.key.id!,
      userId: data.key.remoteJid!,
      userName: data.key.participant!,
      message,
      socket,
      device: getDevice(data.key.id!)
    }
  }

  static replyFakeMessage ({
    text,
    userId
  }: {
    text: string
    userId?: string
  }): proto.IMessage {
    return {
      quoted: {
        key: { participant: userId || '0@s.whatsapp.net' },
        message: { conversation: text }
      }
    } as proto.IMessage
  }

  static toSocket (data: SendData, device: string) {
    let media: any = data.media ? { url: data.media } : {}
    if (data.media && Buffer.isBuffer(data.media)) {
      media = data.media
    }

    const mimetype = device === 'android' ? 'audio/mp4' : 'audio/mpeg'

    let messageContent: any = {}
    switch (data.type) {
      case 'text':
        messageContent = { text: data.text }
        break
      case 'image':
      case 'sticker':
        messageContent = { [data.type]: media, caption: data.text }
        break
      case 'video':
        messageContent = {
          video: media,
          caption: data.text,
          gifPlayback: !!data.gifPlayback
        }
        break
      case 'audio':
        messageContent = { audio: media, ptt: !!data.ptt, mimetype }
        break
      default:
        return
    }
    return messageContent
  }
}

class Message implements MessageBody {
  type: MessageType
  text: string | undefined
  media: Buffer | undefined
  isCommand: boolean = false
  isGroup: boolean = false
  command: string | undefined
  timestamp: number | Long | Nullable;
  outCommandMessage: string | undefined
  private messageData: proto.IMessage | Nullable
  private isReply: boolean = false

  private constructor ({ data }: { data: proto.IWebMessageInfo }) {
    this.timestamp = data.messageTimestamp
    this.type = this.getType(data.message)
    this.text = this.getText(data.message)
    if (config.prefix && this.text?.startsWith(config.prefix)) {
      this.isCommand = true
      this.command = this.text
        ?.split(' ')[0]
        .replace(config.prefix, '')
        .toLocaleLowerCase()
      this.outCommandMessage = this.text?.split(' ').slice(1).join(' ')
      this.isGroup = !!isJidGroup(data.key.remoteJid!)
    }

    this.messageData = data.message
  }

  static create ({ data }: { data: proto.IWebMessageInfo }): Message {
    const message = new Message({ data })
    return message
  }

  private getType (message: proto.IMessage | Nullable): MessageType {
    const [type] = Object.keys(message || {})
    switch (type) {
      case 'conversation':
        return 'text'
      case 'videoMessage':
        return 'video'
      case 'imageMessage':
        return 'image'
      case 'stickerMessage':
        return 'sticker'
      case 'extendedTextMessage': {
        this.isReply = true
        return this.getReplyType(message)
      }
      default:
        return 'unkown'
    }
  }

  private getText (message: proto.IMessage | Nullable): string | undefined {
    if (this.isReply) return message?.extendedTextMessage?.text || ''
    switch (this.type) {
      case 'text':
        return message?.conversation || ''
      case 'video':
        return message?.videoMessage?.caption || ''
      case 'image':
        return message?.imageMessage?.caption || ''
      default:
        return undefined
    }
  }

  private getReplyType (message: proto.IMessage | Nullable): MessageType {
    const [type] = Object.keys(
      message?.extendedTextMessage?.contextInfo?.quotedMessage || {}
    )
    switch (type) {
      case 'conversation':
        return 'text'
      case 'videoMessage':
        return 'video'
      case 'imageMessage':
        return 'image'
      case 'stickerMessage':
        return 'sticker'
      default:
        return 'unkown'
    }
  }
  public async downloadMedia (): Promise<Buffer | Nullable> {
    if (!this.isCommand) return
    try {
      // validate type
      const validTypes = ['video', 'image', 'sticker']
      if (!validTypes.includes(this.type)) return
      let message = this.messageData
      if (this.isReply) {
        message =
          this.messageData?.extendedTextMessage?.contextInfo?.quotedMessage
      }
      // download media
      const buffer = await downloadMediaMessage(
        { message } as proto.IWebMessageInfo,
        'buffer',
        {},
        {
          logger: null as any,
          // pass this so that baileys can request a reupload of media
          // that has been deleted
          reuploadRequest: null as any
        }
      )
      writeFileSync(`./xd.webp`, buffer as Buffer)
      return buffer as Buffer
    } catch (error) {
      return
    }
  }
}
