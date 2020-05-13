/* eslint-disable no-magic-numbers,id-match */
import enumerable from '../classes/Enum'

@enumerable({ symbols: false })
export default class IRCCommands {
  static SERVER
  static ERROR
  static EOS
  static UID
  static SJOIN
  static SID
  static WHOIS
  static PASS
  static PROTOCTL
  static JOIN
  static PART
  static NICK
  static SWHOIS
  static MODE
  static TKL
}
