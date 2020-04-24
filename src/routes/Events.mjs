import {
  BadRequestAPIError,
  ConflictAPIError,
  ForbiddenAPIError,
  NotFoundAPIError,
  UnprocessableEntityAPIError,
} from '../classes/APIError'
import { Context } from '../classes/Context'
import { listen } from '../classes/Event'
import EventStream from '../classes/EventStream'
import StatusCode from '../classes/StatusCode'
import WebSocket, { websocket } from '../classes/WebSocket'
import { Client } from '../db'
import API, {
  authenticated,
  parameters,
  GET,
  POST,
} from './API'

/**
 * WebSocket and SSE subscription endpoint
 */
export default class Events extends API {
  /**
   * @inheritdoc
   */
  get type () {
    return 'events'
  }

  /**
   * Endpoint for SSE
   * @param {Context} ctx Connection context
   * @returns {Promise<undefined>} Returns an indefinite promise to keep the connection alive
   */
  @GET('/events')
  @authenticated
  events (ctx) {
    return EventStream.fromConnection(ctx)
  }

  /**
   * Event listener for fuelrats api change events that should be broadcasted to SSE
   * @param {object} user the user that caused the vent
   * @param {object} data event data
   */
  @listen('fuelrats.*')
  onListen (user, data) {
    EventStream.sendAll({ event: this.event, data: { user: user.id, data } })
  }

  /**
   * Subscribe to a list of websocket events
   * @endpoint
   */
  @websocket('events', 'subscribe')
  @parameters('events')
  @authenticated
  subscribe (ctx) {
    const { events } = ctx.query

    if (!Array.isArray(events)) {
      throw new UnprocessableEntityAPIError({
        parameter: 'events',
      })
    }

    const existingSubscription = events.some((event) => {
      return ctx.client.subscriptions.includes(event)
    })
    if (existingSubscription) {
      throw new ConflictAPIError({ parameter: 'event' })
    }

    ctx.client.subscriptions.push(...events)
    ctx.response.status = StatusCode.noContent
    return true
  }

  /**
   * Unsubscribe from a list of websocket events
   * @endpoint
   */
  @websocket('events', 'unsubscribe')
  @parameters('events')
  @authenticated
  unsubscribe (ctx) {
    const { events } = ctx.query()

    if (!Array.isArray(events)) {
      throw new UnprocessableEntityAPIError({
        parameter: 'events',
      })
    }

    const isSubscribed = events.every((event) => {
      return ctx.client.subscriptions.includes(event)
    })

    if (!isSubscribed) {
      throw new NotFoundAPIError({ parameter: 'events' })
    }

    ctx.client.subscriptions = ctx.client.subscriptions.filter((subscription) => {
      return events.includes(subscription) === false
    })
    ctx.response.status = StatusCode.noContent
    return true
  }

  /**
   * Broadcast a WebSocket event
   * @endpoint
   */
  @POST('/events/:event')
  @websocket('events', 'broadcast')
  @parameters('event')
  @authenticated
  async broadcast (ctx) {
    let { event } = ctx.query
    event = event.toLowerCase()

    const [namespace] = event.split('.')
    if (namespace === 'fuelrats') {
      throw new ForbiddenAPIError({ parameter: 'event' })
    }

    const client = await Client.findOne({
      where: {
        id: ctx.state.clientId,
      },
    })

    if (!client) {
      throw new BadRequestAPIError({
        parameter: 'event',
      })
    }

    if (!client.namespaces.includes(namespace)) {
      throw new ForbiddenAPIError({
        parameter: 'event',
      })
    }

    const { data } = ctx

    WebSocket.instance.onBroadcast({
      event,
      sender: ctx.state.user.id,
      data,
    })

    ctx.response.status = StatusCode.noContent
    return true
  }
}