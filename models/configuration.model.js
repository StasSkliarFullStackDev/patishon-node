const mongoose = require('mongoose')
const configurationSchema = new mongoose.Schema({
    roomSize: {
        length: {
            type: Number,
            default: 1200
        },
        breadth: {
            type: Number,
            default: 1200
        },
        height: {
            type: Number,
            default: 1500
        },
    },
    partition: {
        perMillimeterPrice: {
            type: Number,
            default: 50
        }
    },
    // film: {
    //     price: {
    //         type: Number,
    //         default: 0
    //     },
    //     priceIncToBasePrice: {
    //         type: String,
    //         default: false
    //     },
    //     isEnabled: {
    //         type: Boolean,
    //         default: false
    //     }
    // },
    // frameType: [{
    //     type: {
    //         type: String,
    //         default: null
    //     },
    //     price: {
    //         type: Number,
    //         default: 0
    //     },
    //     isActivated: {
    //         type: Boolean,
    //         default: false
    //     }
    // }],
    // frameVariant: [{
    //     type: {
    //         type: String,
    //         default: null
    //     },
    //     isDefault: {
    //         type: Boolean,
    //         default: false
    //     },
    //     isActivated: {
    //         type: Boolean,
    //         default: false
    //     }
    // }],
    doorChannel: [{
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
        doorSize: [{
            size: {
                type: Number,
                default: 0
            },
            isActivated: {
                type: Boolean,
                default: false
            },
            price: {
                type: Number,
                default: 0
            }
        }],
    }],
    doorCategory: [{
        category: {
            name: {
                type: String,
                default: null
            },
            isEnabled: {
                type: Boolean,
                default: false
            }
        },
        doorHinges: [{
            hingesType: {
                type: String,
                default: 0
            },
            isActivated: {
                type: Boolean,
                default: false
            }
        }]
    }],
    handleSides: [{
        type: {
            type: String,
            default: null
        },
        isActivated: {
            type: Boolean,
            default: false
        }
    }],
    handleVariant: [{
        type: {
            type: String,
            default: null
        },
        price: {
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
    }]
}, { timestamps: true })

const configuration = mongoose.model('configuration', configurationSchema)
module.exports = configuration