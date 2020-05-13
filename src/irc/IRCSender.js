export default class IRCSender {
  isServer = false
  nickname = undefined
  username = undefined
  address = undefined
  hostmask = undefined

  constructor ({
    nickname,
    username,
    hostmask,
    address,
    isServer = false,
  }) {
    this.nickname = nickname
    this.ident = username
    this.hostmask = hostmask
    this.address = address
    this.isServer = isServer
  }

  static hostmaskComponents (senderString) {
    if (senderString.includes('@')) {
      const nickname = senderString.substring(0, senderString.indexOf('!') - 1)
      const username = senderString.substring(senderString.indexOf('!') + 1, senderString.indexOf('@') - 1)
      const hostmask = senderString.substring(senderString.substring('@') + 1, senderString.length - 1)

      return [nickname, username, hostmask]
    } else {
      return [senderString, undefined, undefined]
    }
  }
}
