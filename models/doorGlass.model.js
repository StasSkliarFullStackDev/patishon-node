const mongoose = require('mongoose')
const doorGlassSchema = new mongoose.Schema({
    glassSize: {
        type: Number,
        default: 0
    },
    channelSize: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'doorChannel'
    },
    doorGlassPrice: {
        type: Number,
        default: 0
    },
    doorType: {
        type: String,
        default: null
    },
    isActivated: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

const doorGlass = mongoose.model('doorGlass', doorGlassSchema)
module.exports = doorGlass