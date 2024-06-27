const mongoose = require('mongoose')

const frameTypeSchema = new mongoose.Schema({
    type: {
        type: String,
        default: null
    },
    price: {
        type: Number,
        default: 0
    },
    isActivated: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

const frameType = mongoose.model('frameType', frameTypeSchema)
module.exports = frameType