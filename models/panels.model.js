const mongoose = require('mongoose')
const panelSchema = new mongoose.Schema({
    panelSize: {
        type: Number,
        default: 0
    },
    panelPrice: {
        type: Number,
        default: 0
    },
    panelPricePermm: {
        type: Number,
        default: 0
    },
    perPanelPrice: {
        type: Number,
        default: 0
    }
}, { timestamps: true })

const panel = mongoose.model('panel', panelSchema)
module.exports = panel