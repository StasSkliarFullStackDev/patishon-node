const mongoose = require('mongoose')

const handleVariantSchema = new mongoose.Schema({
    type: {
        type: String,
        default: null
    },
    price: {
        type: Number,
        default: 0
    },
    size: {
        type: Number,
        default: 0
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

const handleVariant = mongoose.model('handleVariant', handleVariantSchema)
module.exports = handleVariant