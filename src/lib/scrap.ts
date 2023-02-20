import puppeteer, { Browser, Page } from 'puppeteer'
import { load } from 'cheerio'
import { UpdateProductData } from '../shared/interfaces/types'

export default class Scrap {
  private browser: Browser
  private page: Page

  constructor () {
    this.browser = null as any
    this.page = null as any
  }

  async init () {
    this.browser = await puppeteer.launch({
      headless: true,
      ignoreDefaultArgs: ['--disable-extensions'],
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        //"--single-process", // <- this one doesn't works in Windows
        '--disable-gpu'
      ]
    })
    this.page = await this.browser.newPage()
  }

  async scrap (url: string) {
    return await this.getAliExpressAvailabilityItem(url)
  }

  async close () {
    await this.browser.close()
  }

  getPageAvailivilityItem (url: string) {
    const domain = Scrap.validDomain(url)
    switch (domain.domain) {
      case 'aliexpress':
        return this.getAliExpressAvailabilityItem(url)
      default:
        return 'El dominio no está soportado'
    }
  }

  static validDomain (url: string) {
    const domain = new URL(url).host
    if (domain.includes('aliexpress'))
      return { domain: 'aliexpress', supported: true, url }
    return { domain: 'unkown', supported: false, url }
  }

  async getAliExpressAvailabilityItem (url: string): Promise<UpdateProductData> {
    const cookies = [
      {
        name: 'aep_usuc_f',
        value:
          'isfm=y&site=esp&province=null&city=null&c_tp=USD&x_alimid=229076552&re_sns=google&isb=y&region=SV&b_locale=es_ES',
        domain: '.aliexpress.com',
        path: '/',
        expires: Math.floor(new Date().getTime() / 1000 + 86400)
        //httpOnly: true,
        //secure: true
      }
    ]
    await this.page.setCookie(...cookies)
    await this.page.goto(url, { timeout: 0, waitUntil: 'domcontentloaded' })
    const html = await this.page.content()
    const $ = load(html)
    //search if exist the element with the class "customs-message-wrap"
    const availability = $('.customs-message-wrap').length
    let price = $('.product-price-value').text()
    if (price === '' || price === undefined) {
      price = $('.uniform-banner-box-price').text()
    }

    const name = $('.product-title-text').text()
    const image = $('.magnifier-image').attr('src')
    console.log({ price })
    if (availability) {
      return {
        alert: true,
        name,
        image: image || '',
        price: 0,
        updatedAt: new Date().toISOString(),
        available: false
      }
    }
    return {
      alert: false,
      name,
      image: image || '',
      price: price || 0,
      updatedAt: new Date().toISOString(),
      available: true
    }
  }
}
