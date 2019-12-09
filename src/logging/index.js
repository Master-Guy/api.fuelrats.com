
import log4js from 'log4js'
import config from '../../config'


log4js.configure({
  appenders: {
    syslog: { type: 'stdout' },
    syslogerr: { type: 'stderr' },
    slack: {
      type: '@log4js-node/slack',
      token: config.slack.token,
      channel_id: 'development',
      username: config.slack.username
    },
    graylog: {
      type: '@log4js-node/gelf',
      host: config.graylog.host,
      port: config.graylog.port,
      facility: config.graylog.facility
    },
    email: {
      type: '@log4js-node/smtp',
      subject: 'Fuel Rats API Problem',
      sender: 'blackhole@fuelrats.com',
      recipients: 'techrats@fuelrats.com',
      SMTP: config.smtp,
      sendInterval: 3600
    }
    // syslogFilter: {
    //   type: 'logLevelFilter',
    //   appender: 'syslogerr',
    //   level: 'error'
    // }
  },
  categories: {
    default: {
      appenders: ['graylog'],
      level: 'debug'
    },
    fatal: {
      appenders: ['graylog', 'syslogerr', 'email', 'slack'],
      level: 'error'
    }
  }
})


const logger = log4js.getLogger()
const fatalLogger = log4js.getLogger('fatal')

export default logger
export { fatalLogger }