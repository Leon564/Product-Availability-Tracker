import {
  MessageBody,
  SendData
} from '../../shared/interfaces/types'
import fs from 'fs-extra'
import Scrap from '../scrap'
import { Tracker } from '../tracker'

const track = async (m: MessageBody): Promise<SendData> => {
  const url = m.outCommandMessage
  if (!url) {
    return {
      type: 'text',
      text: 'Debes enviar la url del producto'
    }
  }

  const availability = Scrap.validDomain(url)
  if (!availability.supported)
    return { type: 'text', text: 'El dominio no está soportado' }

  return Tracker.addItem({
    url,
    alert: true,
    userId: m.userId,
    createdAt: new Date().toISOString(),
    id: Math.random().toString(36).substring(2, 9),
    name: '',
    image: '',
    price: 0,
    available: false,
    updatedAt: new Date().toISOString()
  })
    .then(() => {
      return {
        type: 'text',
        text: 'Producto agregado a la lista de seguimiento'
      }
    })
    .catch((error) => {
      console.log(error)
      return {
        type: 'text',
        text: 'El producto ya está en la lista de seguimiento'
      }
    }) as Promise<SendData>
}

export default track
