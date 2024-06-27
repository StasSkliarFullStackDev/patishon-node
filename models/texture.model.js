const mongoose = require('mongoose')

const textureSchema = new mongoose.Schema({
    url: {
        type: String,
        default: null
    },
    scale: {
        type: Number,
        default: 0
    }
})

const texture = mongoose.model('texture', textureSchema)
module.exports = texture