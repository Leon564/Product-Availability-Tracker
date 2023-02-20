import WhatsAppSocket, { WAMessage, proto } from '@adiwajshing/baileys'

export type BaileysMessage = { messages: WAMessage[]; type: MessageType }
export type BaileysSocket = ReturnType<typeof WhatsAppSocket>
export type MessageType =
  | 'text'
  | 'listMessage'
  | 'image'
  | 'video'
  | 'sticker'
  | 'buttonsMessage'
  | 'unkown'
export type ResponseType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'buttonsMessage'
  | 'sticker'

export type Nullable = null | undefined

export type MessageBody = {
  type: MessageType
  text?: string
  media?: Buffer
  isCommand?: boolean
  isGroup?: boolean
  downloadMedia: () => Promise<Buffer | Nullable>
  command?: string
  outCommandMessage: string | undefined
  timestamp: number | Long | Nullable
}

export type SendData = {
  type: ResponseType
  text?: string
  media?: Buffer | string
  quoted?: boolean
  reacttion?:
    | '❤️'
    | '👍'
    | '👎'
    | '😂'
    | '😮'
    | '😢'
    | '😡'
    | '🎵'
    | '✅'
    | '❌'
    | '🎲'
    | string
  fakeQuoted?: string
  ptt?: boolean
  gifPlayback?: boolean
}

export type MessageData = {
  id: string
  userId: string
  userName: string
  message: MessageBody
  socket: BaileysSocket
  device: string
}
