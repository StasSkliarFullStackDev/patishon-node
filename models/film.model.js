const mongoose = require('mongoose')
const filmSchema = new mongoose.Schema({
    image: {
        type: String,
        default: null
    },
    name: {
        type: String,
        default: null
    },
    // price: {
    //     type: Number,
    //     default: 0
    // },
    isActivated: {
        type: Boolean,
        default: false
    },
    price: {
        type: Number,
        default: 0
    },
    disabled: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

const film = mongoose.model('film', filmSchema)
module.exports = film