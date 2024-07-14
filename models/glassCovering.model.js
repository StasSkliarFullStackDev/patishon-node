const mongoose = require('mongoose')
const glassCoveringSchema = new mongoose.Schema({
    glassType: {
        type: String,
        default: null
    },
    price: {
        type: Number,
        default: null
    }
}, { timestamps: true })

const glassCoveringModel = mongoose.model('glassCovering', glassCoveringSchema)
module.exports = glassCoveringModel