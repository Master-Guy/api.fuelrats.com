import { Rescue, Rat, db } from '../db'
import DatabaseQuery from '../query2/Database'


import Rats from './Rats'
import {
  ForbiddenAPIError,
  GoneAPIError,
  NotFoundAPIError,
  UnprocessableEntityAPIError,
  UnsupportedMediaAPIError
} from '../classes/APIError'

import API, {
  permissions,
  authenticated,
  GET,
  POST,
  PUT,
  PATCH,
  DELETE,
  parameters
} from '../classes/API'
import { websocket } from '../classes/WebSocket'
import RescueView from '../views/Rescue'
import DatabaseDocument from '../Documents/Database'

const rescueAccesstime = 3600000

/**
 *
 */
export default class Rescues extends API {
  /**
   * @inheritdoc
   */
  get type () {
    return 'rescues'
  }

  @GET('/rescues')
  @websocket('rescues', 'search')
  @authenticated
  @permissions('rescue.read')
  async search (ctx) {
    const query = new DatabaseQuery({ connection: ctx })
    const result = await Rescue.findAndCountAll(query.searchObject)
    return new DatabaseDocument({ query, result, type: RescueView })
  }

  @GET('/rescues/:id')
  @websocket('rescues', 'read')
  @authenticated
  @permissions('rescue.read')
  @parameters('id')
  async findById (ctx) {
    const query = new DatabaseQuery({ connection: ctx })
    const result = await Rescue.findOne({
      where: {
        id: ctx.params.id
      }
    })
    if (!result) {
      throw new NotFoundAPIError({ parameter: 'id' })
    }
    return new DatabaseDocument({ query, result, type: RescueView })
  }

  @POST('/rescues')
  @websocket('rescues', 'create')
  @authenticated
  @permissions('rescue.write')
  async create (ctx) {
    const query = new DatabaseQuery({ connection: ctx })
    const result = await Rescue.create(ctx.data, {
      userId: ctx.state.user.id
    })

    const rescue = new DatabaseDocument({ query, result, type: RescueView })

    ctx.response.status = 201
    process.emit('rescueCreated', ctx, rescue.data)
    return rescue
  }

  @PUT('/rescues/:id')
  @websocket('rescues', 'update')
  @authenticated
  @parameters('id')
  async update (ctx) {
    const rescue = await super.update({ ctx, databaseType: Rescue, updateSearch: { userId: ctx.state.user.id } })

    const query = new DatabaseQuery({ connection: ctx })
    return new DatabaseDocument({ query, rescue, type: RescueView })
  }

  @DELETE('/rescues/:id')
  @websocket('rescues', 'delete')
  @authenticated
  @permissions('rescue.delete')
  @parameters('id')
  async delete (ctx) {
    await super.delete({ ctx, Rescue })

    process.emit('rescueDeleted', ctx, CustomPresenter.render({
      id: ctx.params.id
    }, {}))
    ctx.status = 204
    return true
  }

  // relationships

  @POST('/rescues/:id/relationships/rats')
  @websocket('rescues', 'rats', 'create')
  @authenticated
  @parameters('id')
  async relationshipRatsCreate (ctx) {
    const result = await this.relationshipChange({
      ctx,
      databaseType: Rescue,
      relationType: 'rats',
      change: 'add',
      relationship: 'rats'
    })

    const query = new DatabaseQuery({ connection: ctx })
    return new DatabaseDocument({ query, result, type: RescueView  })
  }

  @PATCH('/rescues/:id/relationships/rats')
  @websocket('rescues', 'rats', 'patch')
  @authenticated
  @parameters('id')
  async relationshipRatsPatch (ctx) {
    const result = await this.relationshipChange({
      ctx,
      databaseType: Rescue,
      relationType: 'rats',
      change: 'patch',
      relationship: 'rats'
    })

    const query = new DatabaseQuery({ connection: ctx })
    return new DatabaseDocument({ query, result, type: RescueView  })
  }

  @DELETE('/rescues/:id/relationships/rats')
  @websocket('rescues', 'rats', 'delete')
  @authenticated
  @parameters('id')
  async relationshipRatsDelete (ctx) {
    const result = await this.relationshipChange({
      ctx,
      databaseType: Rescue,
      change: 'remove',
      relationship: 'rats'
    })

    const query = new DatabaseQuery({ connection: ctx })
    return new DatabaseDocument({ query, result, type: RescueView  })
  }

  @PATCH('/rescues/:id/relationships/firstLimpet')
  @websocket('rescues', 'firstLimpet', 'patch')
  @authenticated
  async relationshipFirstLimpetPatch (ctx) {
    const result = await this.relationshipChange({
      ctx,
      databaseType: Rescue,
      change: 'patch',
      relationship: 'firstLimpet'
    })

    const query = new DatabaseQuery({ connection: ctx })
    return new DatabaseDocument({ query, result, type: RescueView  })
  }

  getWritePermissionFor ({ connection, entity }) {
    if (connection.state.user && entity.createdAt - Date.now() < rescueAccesstime) {
      for (const rat of connection.state.user.rats) {
        const isAssist = entity.rats.find((fRat) => {
          return fRat.id === rat.id
        })
        if (isAssist || entity.firstLimpetId === rat.id) {
          return ['rescue.write.me', 'rescue.write']
        }
      }
    }
    return ['rescue.write']
  }

  changeRelationship ({ relationship }) {
    switch (relationship) {
      case 'rats':
        return {
          many: true,

          add ({ entity, ids }) {
            return entity.addRats(ids)
          },

          patch ({ entity, ids }) {
            return entity.setRats(ids)
          },

          remove ({ entity, ids }) {
            return entity.removeRats(ids)
          }
        }

      case 'firstLimpet':
        return {
          many: false,

          add ({ entity, id }) {
            return entity.addRat(id)
          },

          patch ({ entity, id }) {
            return entity.setRat(id)
          },

          remove ({ entity, id }) {
            return entity.removeRat(id)
          }
        }

      default:
        throw new UnsupportedMediaAPIError({ pointer: '/relationships' })
    }
  }

  get relationTypes () {
    return {
      'rats': 'rats',
      'firstLimpet': 'rats'
    }
  }

  static get presenter () {
    class RescuesPresenter extends API.presenter {
      relationships () {
        return {
          rats: Rats.presenter,
          firstLimpet: Rats.presenter,
          epics: Epics.presenter
        }
      }

      selfLinks (instance) {
        return `/rescues/${this.id(instance)}`
      }

      links (instance) {
        return {
          rescues: {
            self: this.selfLinks(instance),
            related: this.selfLinks(instance)
          }
        }
      }
    }
    RescuesPresenter.prototype.type = 'rescues'
    return RescuesPresenter
  }
}

process.on('rescueCreated', (ctx, rescue) => {
  if (!rescue.system) {
    return
  }
  if (rescue.system.includes('NLTT 48288') || rescue.system.includes('MCC 811')) {
    BotServ.say(global.PAPERWORK_CHANNEL, 'DRINK!')
  }
})

process.on('rescueUpdated', async (ctx, result, perms, changedValues) => {
  if (!changedValues) {
    return
  }
  if (changedValues.hasOwnProperty('outcome')) {
    const { boardIndex } = result.data[0] || {}
    const caseNumber = boardIndex || boardIndex === 0 ? `#${boardIndex}` : result.data[0].id

    const client = result.data[0].client || ''
    const author = await API.getAuthor(ctx).preferredRat().name
    BotServ.say(global.PAPERWORK_CHANNEL,
      `[Paperwork] Paperwork for rescue ${caseNumber} (${client}) has been completed by ${author.preferredRat().name}`)
  }
})


process.on('suspendedAssign', async (ctx, rat) => {
  const author = await API.getAuthor(ctx)
  BotServ.say(global.MODERATOR_CHANNEL,
    `[API] Attempt to assign suspended rat ${rat.name} (${rat.id}) by ${author.preferredRat().name}`)
})
