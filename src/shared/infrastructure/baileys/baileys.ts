import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  MessageRetryMap,
  useMultiFileAuthState
} from '@adiwajshing/baileys'
import { Boom } from '@hapi/boom'
import MAIN_LOGGER from '@adiwajshing/baileys/lib/Utils/logger'

const logger = MAIN_LOGGER.child({})
logger.level = 'silent'

const useStore = !process.argv.includes('--no-store')
const doReplies = !process.argv.includes('--no-reply')

// external map to store retry counts of messages when decryption/encryption fails
// keep this out of the socket itself, so as to prevent a message decryption/encryption loop across socket restarts
const msgRetryCounterMap: MessageRetryMap = {}

const store = useStore ? makeInMemoryStore({ logger }) : undefined
store?.readFromFile('./baileys_store_multi.json')
// save every 10s
setInterval(() => {
  store?.writeToFile('./baileys_store_multi.json')
}, 10_000)

const startSock = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info')
  // fetch latest version of WA Web
  const { version, isLatest } = await fetchLatestBaileysVersion()
  console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: true,
    auth: {
      creds: state.creds,
      /** caching makes the store faster to send/recv messages */
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    msgRetryCounterMap,
    generateHighQualityLinkPreview: true,
    // ignore all broadcast messages -- to receive the same
    // comment the line below out
    shouldIgnoreJid: jid => isJidBroadcast(jid),
    // implement to handle retries
    getMessage: async key => {
      if (store) {
        const msg = await store.loadMessage(key.remoteJid!, key.id!)
        return msg?.message || undefined
      }

      // only if store is present
      return {
        conversation: 'hello'
      }
    },
    //fix templateMessage
    patchMessageBeforeSending: message => {
      const requiresPatch = !!(
        message.buttonsMessage ||
        // || message.templateMessage
        message.listMessage
      )
      if (requiresPatch) {
        message = {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadataVersion: 2,
                deviceListMetadata: {}
              },
              ...message
            }
          }
        }
      }
      return message
    }
  })

  store?.bind(sock.ev)

  sock.ev.on('creds.update', async creds => {
    saveCreds()
  })

  sock.ev.on('connection.update', update => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut
      console.log(
        'connection closed due to ',
        lastDisconnect?.error,
        ', reconnecting ',
        shouldReconnect
      )
      // reconnect if not logged out
      if (shouldReconnect) {
        startSock()
      }
    } else if (connection === 'open') {
      console.log('opened connection')
    }
  })

  return sock
}

export default startSock
