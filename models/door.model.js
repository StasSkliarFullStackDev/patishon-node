const mongoose = require('mongoose')
const doorSchema = new mongoose.Schema({
    doorCategory: {
        type: String,
        default: null
    },
    doorType: {
        type: String,
        default: null
    },
    typeOfOpening: {
        type: String,
        default: null
    },
    directionOfOpening: {
        type: String,
        default: null
    },
    doorSize: {
        type: Number,
        default: 0
    },
    doorPrice: {
        type: Number,
        default: 0
    },
    handlePosition: {
        type: String,
        default: null
    }
}, { timestamps: true })

const doorModel = mongoose.model('door', doorSchema)
module.exports = doorModel