const mongoose = require('mongoose')

const frameVariantSchema = new mongoose.Schema({
    type: {
        type: String,
        default: null
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    isActivated: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

const frameVariant = mongoose.model('frameVariant', frameVariantSchema)
module.exports = frameVariant