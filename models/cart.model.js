const mongoose = require('mongoose')
const utils = require('../helpers/utils')
const cartSchema = new mongoose.Schema({

    data: {
        type: Object
    }
}, { timestamps: true })

module.exports.model = mongoose.model('cart', cartSchema)

module.exports.cartList = (OFFSET, LIMIT, ORDER, SORT_BY, SEARCH) => {

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
            "$sort": sortObject
        }
    ]

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