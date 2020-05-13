export default class IRCUser {
  constructor ({
    uid,
    nick,
    ident,
    hostname,
    account,
    connectedAt,
    modes,
    vhost,
    cloak,
    ip,
    realName,
    channels = [],
    server,
    isServer = false,
  }) {
    this.uid = uid
    this.nick = nick
    this.ident = ident
    this.hostname = hostname
    this.account = account
    this.connnectedAt = connectedAt
    this.modes = modes
    this.vhost = vhost
    this.cloak = cloak
    this.ip = ip
    this.realName = realName
    this.channels = channels
    this.server = server
    this.isServer = isServer
  }

  static fromUid (message) {
    let [nick, , connectedAt, ident, hostname, uid, serviceMeta, modes, vhost, cloak, ip, realName] = message.params
    connectedAt = new Date(connectedAt * 1000)
    ip = Buffer.from(ip, 'base64')
    const account = serviceMeta === '0' ? undefined : serviceMeta

    return new IRCUser({
      uid,
      nick,
      ident,
      hostname,
      account,
      connectedAt,
      modes,
      vhost,
      cloak,
      ip,
      realName,
      server: message.sender.address,
    })
  }
}
