import IRCSender from './IRCSender'

const serverIdRegex = /^[0-9][0-9A-Z]{2}$/gu

export default class IRCMessage {
  command = undefined
  tags = undefined
  params = undefined
  receivedAt = undefined
  sender = undefined

  constructor (line, client) {
    this.receivedAt = Date()
    this.parseLine(line, client)
  }

  parseLine (message, client) {
    let args = message.split(' ')

    this.tags = []
    if (args[0].startsWith('@')) {
      this.parseExtensions(args[0], client)
      args.shift()
    }

    if (args[0].startsWith(':')) {
      this.sender = this.parseSender(args[0])
      args.shift()
    }

    const [command] = args
    args.shift()
    this.command = command

    this.params = []
    if (args.length > 0) {
      while (args.length > 0) {
        if (args[0].startsWith(':')) {
          this.params.push(args.join(' ').substring(1))
          args = []
        } else {
          this.params.push(args[0])
          args.shift()
        }
      }
    }
  }

  parseSender (prefix, client) {
    let sender = prefix
    if (sender.match(serverIdRegex) === true) {
      sender = client.servers.find((server) => {
        return server.identifier === sender
      }).name
    }

    if (sender.includes('@') === false && sender.includes('.') === true) {
      return new IRCSender({
        nickname: sender,
        address: sender,
        isServer: true,
      })
    }

    if (sender.includes('!') === true && sender.includes('@') === true) {
      const [nickname, username, hostmask] = IRCSender.hostmaskComponents(sender)
      return new IRCSender({
        nickname,
        username,
        hostmask,
      })
    }

    return new IRCSender({
      nickname: sender,
    })
  }

  parseExtensions (tags, client) {
    const tagString = tags.substring(1)
    this.tags.push(...tagString.split(';').reduce((acc, tag) => {
      const [key, value] = tag.split('=')
      acc[key] = value
      return acc
    }, {}))
  }
}
