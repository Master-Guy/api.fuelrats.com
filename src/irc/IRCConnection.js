import tls from 'tls'

export default class IRCConnection {
  constructor (client, server, port) {
    this.client = client
    this.socket = tls.connect({
      host: server,
      port,
      rejectUnauthorized: false,
      checkServerIdentity: () => {
        return undefined
      },
    }, this.onConnect.bind(this))

    this.socket.setEncoding('utf8')

    this.socket.on('data', this.onData.bind(this))
    this.socket.on('end', this.onEnd.bind(this))
    this.socket.on('error', this.onError.bind(this))
  }

  onConnect () {
    this.client.onConnect()
  }

  onMessage (message) {
    if (message.startsWith('PING :')) {
      const [, pongReply] = message.split(':')
      this.send(`PONG :${pongReply}`)
      return
    }
    this.client.onMessage(message)
  }

  onData (data) {
    data.split(/\r?\n|\r/gmu).forEach((line) => {
      console.log(`< ${data}`)
      this.onMessage(line)
    })
  }

  onEnd () {
    console.log('end')
  }

  onError (error) {
    console.log('error')
  }

  send (data) {
    console.log(`> ${data}`)
    this.socket.write(`${data.replace(/\r?\n|\r/gmu, '')}\r\n`)
  }
}
