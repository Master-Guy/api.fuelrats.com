import crypto from 'crypto'
import IRCClient from './IRCClient'
import IRCConnection from './IRCConnection'

const uidLength = 8
const apiUserUid = `0${crypto.randomBytes(uidLength / 2).toString('hex').toUpperCase()}`

export default class IRC {
  constructor () {
    this.client = new IRCClient(this)
  }

  onServerSyncCompleted () {
    this.client.sendUserIntroduction({
      uid: apiUserUid,
      nickname: 'API',
      username: 'api',
      hostname: 'api.fuelrats.com',
      realName: 'Fuel Rats API',
      vhost: 'api.fuelrats.com',
    })

    this.client.sendJoin('#help', `@${apiUserUid}`)
  }
}
