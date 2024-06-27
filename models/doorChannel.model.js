const mongoose = require('mongoose')
const doorChannelSchema = new mongoose.Schema({
    doorType: {
        type: {
            type: String,
            default: null
        },
        isEnabled: {
            type: Boolean,
            default: false
        }
    },
    doorSize: [
        {
            size: {
                type: Number,
                default: 0
            },
            price: {
                type: Number,
                default: 0
            },
            isActivated: {
                type: Boolean,
                default: false
            }
        }
    ]
}, { timestamps: true })

const doorChannel = mongoose.model('doorChannel', doorChannelSchema)
module.exports = doorChannel