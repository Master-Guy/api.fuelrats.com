import config from '../config'
import IRCCommands from './IRCCommands'
import IRCConnection from './IRCConnection'
import IRCMessage from './IRCMessage'
import IRCReplies from './IRCReplies'
import IRCUser from './IRCUser'

const supportedServerProtocols = [
  'NOQUIT',
  'NICKv2',
  'SJOIN',
  'SJ3',
  'CLK',
  'TKLEXT',
  'TKLEXT2',
  'NICKIP',
  'ESVID',
  'MLOCK',
  'EXTSWHOIS',
  'TOKEN',
]

export default class IRCClient {
  users = []
  servers = []
  delegate = undefined

  constructor (delegate) {
    this.delegate = delegate
    this.connection = new IRCConnection(this, config.irc.server, config.irc.port)
    this.synced = false
  }

  onConnect () {
    console.log('connected')
    this.sendPassword(config.irc.password)
    this.sendProtocolNegotiation(config.irc.serverName, '0ZX')
    this.sendServerInfo()
  }

  onMessage (line) {
    const message = new IRCMessage(line)

    switch (message.command) {
      case IRCCommands.ERROR:
        console.error(message)
        this.dispatch('onErrorMessage', [message])
        break

      case IRCCommands.SID: {
        const [name, distance, identifier] = message.params
        this.servers.push({
          name,
          distance,
          identifier,
        })
        this.dispatch('onServerIntroductionMessage', [message])
        break
      }

      case IRCCommands.EOS: {
        if (this.synced === false) {
          this.connection.send(':0ZX EOS')

          this.synced = true
          this.dispatch('onServerSyncCompleted')
        }
        break
      }

      case IRCCommands.UID: {
        const user = IRCUser.fromUid(message)
        this.addToUserList(user)
        this.dispatch('onUserIntroductionMessage', [message, user])
        break
      }

      case IRCCommands.WHOIS:
        this.sendWhoisReply(message)
        this.dispatch('onWhoisQuery', [message])
        break

      case IRCCommands.PASS:
        break

      default:
        break
    }
  }

  sendPassword (password) {
    this.connection.send(`PASS :${password}`)
  }

  sendProtocolNegotiation (name, sid) {
    this.connection.send(`PROTOCTL EAUTH=${name} SID=${sid}`)
    this.connection.send(supportedServerProtocols.join(' '))
  }

  sendServerInfo () {
    this.connection.send('SERVER api.fuelrats.dev 1 :Fuel Rats API Connection')
  }

  sendUserIntroduction ({
    uid,
    nickname,
    username,
    hostname,
    realName,
    vhost = '*',
    umodes = 'BqStwr',
    ip = '*',
  }) {
    const timestamp = Math.floor(Date.now() / 1000)

    this.users.push(new IRCUser({
      uid,
      nick: nickname,
      ident: username,
      hostname,
      connectedAt: Date(),
      modes: umodes,
      vhost,
      cloak: hostname,
      ip,
      realName,
      server: config.irc.serverName,
      isServer: true,
    }))


    this.connection.send(`UID ${nickname} 1 ${timestamp} ${username} ${hostname} ${uid} `
      + `* ${umodes} ${vhost} ${hostname} ${ip} :${realName}`)
  }

  sendJoin (channel, nick) {
    const timestamp = Math.floor(Date.now() / 1000)
    this.connection.send(`:0ZX SJOIN ${timestamp} ${channel} +nt :${nick}`)
  }

  addToUserList (user) {
    const conflict = this.users.some((listUser) => {
      return listUser.uid === user.uid
    })

    if (!conflict) {
      this.users.push(user)
    }
  }

  sendWhoisReply (message) {
    const sender = message.sender.nickname
    const [query] = message.params

    const user = this.users.find((entry) => {
      return query.toLowerCase() === entry.nick.toLowerCase()
    })

    if (!user) {
      this.sendAsServer(`${IRCReplies.ERR_NOSUCHSERVER} ${sender} ${query} :No such server`)
      return
    }

    this.sendAsServer(`${IRCReplies.RPL_WHOISUSER} ${sender} ${user.nick} `
    + `${user.ident} ${user.hostname} * :${user.realName}`)
    if (user.account) {
      this.sendAsServer(`${IRCReplies} ${sender} ${user.nick} :is a registered nick`)
    }
    if (user.isServer) {
      this.sendAsServer(`${IRCReplies.RPL_WHOISSERVER} ${sender} ${user.nick} ${user.server} :Is an IRC Server`)
    }
    this.sendAsServer(`${IRCReplies.RPL_ENDOFWHOIS} ${sender} ${user.nick} :End of /WHOIS list.`)
  }

  sendAsServer (message) {
    this.send(`:${config.irc.serverName} ${message}`)
  }

  dispatch (method, args = []) {
    if (this.delegate && Reflect.has(this.delegate, method)) {
      Reflect.apply(this.delegate[method], this.delegate, args)
    }
  }
}

