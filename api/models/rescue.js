'use strict'

let _ = require('underscore')
let mongoose = require('mongoose')
let winston = require('winston')
let Rat = require('./rat')

mongoose.Promise = global.Promise

let Schema = mongoose.Schema





let RescueSchema = new Schema({
  active: {
    default: true,
    type: Boolean
  },
  archive: {
    default: false,
    type: Boolean
  },
  client: {
    default: {},
    type: {
      CMDRname: {
        type: String
      },
      nickname: {
        type: String
      }
    }
  },
  codeRed: {
    default: false,
    type: Boolean
  },
  createdAt: {
    type: Date
  },
  epic: {
    default: false,
    type: Boolean
  },
  firstLimpet: {
    type: Schema.Types.ObjectId,
    ref: 'Rat'
  },
  lastModified: {
    type: Date
  },
  open: {
    default: true,
    type: Boolean
  },
  name: {
    type: String
  },
  notes: {
    type: String
  },
  platform: {
    default: 'unknown',
    enum: [
      'pc',
      'xb',
      'unknown'
    ],
    type: String
  },
  quotes: {
    type: [{
      type: Schema.Types.ObjectId,
      ref: 'Quote'
    }]
  },
  rats: {
    default: [],
    type: [{
      type: Schema.Types.ObjectId,
      ref: 'Rat'
    }]
  },
  unidentifiedRats: {
    default: [],
    type: [{
      type: String
    }]
  },
  successful: {
    type: Boolean
  },
  system: {
    default: '',
    type: String
  }
}, {
  versionKey: false
})





let linkRats = function (next) {
  let rescue = this
  let updates = []
  let increment = {}

  rescue.rats = rescue.rats || []

  rescue.rats = _.reject(rescue.rats, function (rat) {
    return rat.toString() === rescue.firstLimpet.toString()
  })

  rescue.rats.forEach(function (rat, index, rats) {
    if (rescue.successful) {
      increment.successfulAssistCount = 1
    } else {
      increment.failedAssistCount = 1
    }

    updates.push(mongoose.models.Rat.findByIdAndUpdate(rat, {
      $inc: {
        successfulAssistCount: 1,
        rescueCount: 1
      },
      $addToSet: {
        rescues: rescue._id
      }
    }))
  })

  if (rescue.firstLimpet) {
    if (rescue.successful) {
      increment.successfulRescueCount = 1
    } else {
      increment.failedRescueCount = 1
    }

    updates.push(mongoose.models.Rat.findByIdAndUpdate(rescue.firstLimpet, {
      $inc: {
        successfulRescueCount: 1,
        rescueCount: 1
      },
      $addToSet: {
        rescues: rescue._id
      }
    }))
  }

  Promise.all(updates)
  .then(next)
  .catch(next)
}

let normalizePlatform = function (next) {
  this.platform = this.platform.toLowerCase().replace(/^xb\s*1|xbox|xbox1|xbone|xbox\s*one$/g, 'xb')

  next()
}

let updateTimestamps = function (next) {
  let timestamp = new Date()

  if (!this.open) {
    this.active = false
  }

  if (this.isNew) {
    this.createdAt = this.createdAt || timestamp
  }

  this.lastModified = timestamp

  next()
}

let sanitizeInput = function (next) {
  let rescue = this

  if (rescue.system) {
    rescue.system = rescue.system.trim()
  }

  if (rescue.client) {
    if(rescue.client.CMDRname) {
      rescue.client.CMDRname = rescue.client.CMDRname.trim()
    }

    if(rescue.client.nickname) {
      rescue.client.nickname = rescue.client.nickname.trim()
    }
  }

  if (rescue.unidentifiedRats) {
    for (let i = 0; i < rescue.unidentifiedRats.length; i++) {
      rescue.unidentifiedRats[i] = rescue.unidentifiedRats[i].replace(/cmdr /i, '').replace(/\s\s+/g, ' ').trim()
    }
  }

  if (rescue.quotes) {
    for(let i = 0; i < rescue.quotes.length; i++) {
      rescue.quotes[i] = rescue.quotes[i].trim()
    }
  }

  if (rescue.name) {
    rescue.name = rescue.name.trim()
  }

  next()
}

let indexSchema = function (rescue) {
  rescue.index(function () {})
  for (let ratId of rescue.rats) {
    Rat.findById(ratId, function (err, rat) {
      if (err) {
        winston.error(err)
      } else {
        if (rat) {
          rat.save()
        }
      }
    })
  }
}

RescueSchema.pre('save', sanitizeInput)
RescueSchema.pre('save', updateTimestamps)
RescueSchema.pre('save', normalizePlatform)
RescueSchema.pre('save', linkRats)

RescueSchema.pre('update', sanitizeInput)
RescueSchema.pre('update', updateTimestamps)

RescueSchema.plugin(require('mongoosastic'))

RescueSchema.post('save', indexSchema)

RescueSchema.set('toJSON', {
  virtuals: true
})

if (mongoose.models.Rescue) {
  module.exports = mongoose.model('Rescue')
} else {
  module.exports = mongoose.model('Rescue', RescueSchema)
}
