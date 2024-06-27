const mongoose = require('mongoose')
const toleranceSchema = new mongoose.Schema({
    headChannel: {
        type: Number,
        default: 0
    },
    floorChannelLeft: {
        type: Number,
        default: 0
    },
    floorChannelRight: {
        type: Number,
        default: 0
    },
    verticalFramingChannel: {
        type: Number,
        default: 0
    },
    horizontalFramingChannelLeft: {
        type: Number,
        default: 0
    },
    horizontalFramingChannelRight: {
        type: Number,
        default: 0
    },
    horizontalFramingChannelDoor: {
        type: Number,
        default: 0
    },
    horizontalBarsLeft: {
        type: Number,
        default: 0
    },
    horizontalBarsRight: {
        type: Number,
        default: 0
    },
    horizontalBarsDoor: {
        type: Number,
        default: 0
    },
    leftPanel: {
        type: Number,
        default: 0
    },
    rightPanel: {
        type: Number,
        default: 0
    },
    doorPanel: {
        type: Number,
        default: 0
    },
    cappingChannel: {
        type: Number,
        default: 0
    },
    endCoverTrims: {
        type: Number,
        default: 0
    }
}, { timestamps: true })

module.exports.model = mongoose.model('tolerance', toleranceSchema)