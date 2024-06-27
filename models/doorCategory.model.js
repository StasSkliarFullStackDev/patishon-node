const mongoose = require('mongoose')
const doorCategorySchema = new mongoose.Schema({
    doorCategory: {
        category: {
            type: String,
            default: null
        },
        isEnabled: {
            type: Boolean,
            default: false
        }
    },
    doorHinges: [{
        type: {
            type: String,
            default: null
        },
        isActivated: {
            type: Boolean,
            default: false
        }
    }]
}, { timestamps: true })

const doorCategory = mongoose.model('doorCategory', doorCategorySchema)
module.exports = doorCategory