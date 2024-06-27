const mongoose = require('mongoose')
const utils = require('../helpers/utils')
const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        default: null
    },
    product: {
        image: {
            type: String,
            default: null
        },
        name: {
            type: String,
            default: null
        }
    },
    price: {
        type: Number,
        default: 0
    },
    frameVarient: {
        type: String,
        default: null
    },
    frameType: {
        type: String,
        default: null
    },
    roomSize: {
        length: {
            type: String,
            default: null
        },
        width: {
            type: String,
            default: null
        }
    },
    partition: {
        type: String,
        default: null
    },
    leftPanelSize: {
        type: String,
        default: null
    },
    rightPanelSize: {
        type: String,
        default: null
    },
    doorChannel: {
        type: String,
        default: null
    },
    doorGlass: {
        type: String,
        default: null
    },
    doorCategory: {
        type: String,
        default: null
    },
    doorHinges: {
        type: String,
        default: null
    },
    handleType: {
        type: String,
        default: null
    },
    handleVarient: {
        type: String,
        default: null
    },
    film: {
        type: String,
        default: null
    },
    pdf: {
        type: String,
        default: null
    },
    clientPdf: {
        type: String,
        default: null
    }
}, { timestamps: true })

module.exports.model = mongoose.model('orders', orderSchema)

// orders list for admin
module.exports.ordersListForAdmin = (OFFSET, LIMIT, ORDER, SORT_BY, SEARCH) => {

    let sortBy = "createdAt";
    let order = -1;
    let sortObject = {};
    let pagination = [{ $skip: 0 }, { $limit: 10 }]

    if (utils.isNotNullAndUndefined(SORT_BY) && utils.isNotNullAndUndefined(ORDER)) {

        sortBy = SORT_BY
        order = ORDER
    }

    if (utils.isNotNullAndUndefined(OFFSET) && utils.isNotNullAndUndefined(LIMIT)) pagination = [{ $skip: OFFSET }, { $limit: LIMIT }]

    sortObject[sortBy] = order

    let aggregationArray = [

        {
            $project: {
                _id: 1,
                pdf: 1,
                orderId: 1,
                createdAt: 1,
                clientPdf: 1
            }
        },
        {
            "$sort": sortObject
        }
    ]

    // search
    if (utils.isNotNullAndUndefined(SEARCH)) {
        aggregationArray.push({
            $match: {
                $or: [
                    {
                        orderId: { $regex: new RegExp(('.*' + SEARCH + '.*'), "i") }
                    }
                ]
            }
        })
    }

    // pagination
    aggregationArray.push(
        {
            "$facet": {

                data: pagination,
                totalCount: [
                    {
                        $count: 'count'
                    }
                ]
            }
        },
        {
            $unwind: {

                path: "$totalCount",
                preserveNullAndEmptyArrays: true
            }
        }
    )

    return this.model.aggregate(aggregationArray)
}