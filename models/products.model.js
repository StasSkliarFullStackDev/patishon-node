const mongoose = require('mongoose')
const productSchema = new mongoose.Schema({
    productImage: {
        type: String,
        default: null
    },
    productName: {
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
    }
}, { timestamps: true })

const products = mongoose.model('products', productSchema)
module.exports = products