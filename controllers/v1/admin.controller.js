//models 
const productSchema = require('../../models/products.model')
const panelSchema = require('../../models/panels.model')
const doorGlassSchema = require('../../models/doorGlass.model')
const configurationSchema = require('../../models/configuration.model')
const filmSchema = require('../../models/film.model')
const frameTypeSchema = require('../../models/frameType.model')
const frameVariantSchema = require('../../models/frameVariant.model')
const handleVariantSchema = require('../../models/handleVariant.model')
const DoorChannelSchema = require('../../models/doorChannel.model')
const DoorCategorySchema = require('../../models/doorCategory.model')
const { jsPDF } = require('jspdf')
const OrderSchema = require('../../models/order.model')
const tolranceSchema = require('../../models/tolerance.model')
const cartSchema = require('../../models/cart.model')

//helpers
const { paginationData, parseToMongoObjectID, createErrorResponse, createSuccessResponse, isNotNullAndUndefined, isvalidId } = require('../../helpers/utils')
const message = require('../../helpers/message')

// npm 

const PDFDocument = require('pdfkit');

const productsList = async (req, res) => {
    const SEARCH = req.body.search
    const OFFSET = req.body.offset ? req.body.offset : 0
    const LIMIT = req.body.limit ? req.body.limit : 10
    const SORT_BY = req.body.sortBy
    const ORDER = req.body.order
    let pagination = []
    let sortBy = "createdAt";
    let order = -1;
    const sortObject = {};

    if (isNotNullAndUndefined(LIMIT) && isNotNullAndUndefined(OFFSET)) {
        pagination = [{ $skip: OFFSET }, { $limit: LIMIT }]
    }
    else {
        pagination = [{ $skip: 0 }, { $limit: 10 }]
    }
    if (isNotNullAndUndefined(SORT_BY)) {
        sortBy = SORT_BY
    }
    if (isNotNullAndUndefined(ORDER)) order = ORDER
    sortObject[sortBy] = order

    const aggregationArray = [{
        $project: {
            productImage: 1,
            productName: 1,
            // price: 1,
            isActivated: 1
        }
    }]

    if (SEARCH && SEARCH != '') {
        aggregationArray.push({
            $match: {
                $or: [
                    {
                        productName: { $regex: new RegExp(('.*' + SEARCH + '.*'), "i") }
                    },
                    // {
                    //     price: { $regex: new RegExp(('.*' + SEARCH + '.*'), "i") }
                    // },
                ]
            }
        })
    }

    aggregationArray.push({
        "$sort": sortObject
    },
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
    const productdata = await productSchema.aggregate(aggregationArray)
    if (productdata && productdata[0] && productdata[0].data && productdata[0].data.length > 0) {
        let TotalCount = productdata && productdata[0] && productdata[0].totalCount ? productdata[0].totalCount.count : 0
        const pagination = paginationData(TotalCount, LIMIT, OFFSET)
        return res.status(200).json({ success: true, message: message.prdouctList, data: productdata[0].data, pagination })
    }
    else return res.status(200).json({ success: true, message: message.prdouctList, data: [] })
}

const productView = async (req, res) => {
    const productId = req.params.id
    if (!(isvalidId(productId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const productDetail = await productSchema.findOne({ _id: productId }, { _id: 0, productImage: 1, productName: 1, price: 1 })
    if (productDetail) return res.status(200).json(createSuccessResponse(message.productDetail, productDetail))
    else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const productUpdate = async (req, res) => {
    const productId = req.body.productId
    if (!(isvalidId(productId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const productDetail = await productSchema.findOne({ _id: productId })
    if (productDetail) {
        if (req.file) productDetail.productImage = req.file.path
        if (req.body.productName) productDetail.productName = req.body.productName
        // if (req.body.price) productDetail.price = req.body.price
        const updated = await productDetail.save()
        if (updated) return res.status(200).json(createSuccessResponse(message.productUpdated))
        else return res.status(400).json(createErrorResponse(message.unableToUpadte))
    } else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const productActiveDeactive = async (req, res) => {
    const productId = req.params.id
    if (!(isvalidId(productId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const productDetail = await productSchema.findOne({ _id: productId })
    if (productDetail) {
        const productName = productDetail.productName
        if (productDetail.isActivated == true) {
            // const sameDeactive = await productSchema.findOne({ _id: { $ne: productId }, productName, isActivated: true })
            // if (!sameDeactive) return res.status(200).json(createSuccessResponse(message.unableToDeactivate))
            const atLeastOne = await productSchema.findOne({ _id: { $ne: productId }, isActivated: true })
            if (!atLeastOne) return res.status(200).json(createSuccessResponse(message.unableToDeactivate))
            productDetail.isActivated = false
        }
        else {
            const sameActivate = await productSchema.findOne({ _id: { $ne: productId }, productName, isActivated: true })
            if (sameActivate) {
                sameActivate.isActivated = false
                await sameActivate.save()
                // return res.status(200).json(createSuccessResponse(`Already activated ${productName}.`))
            }
            const maxActivate = await productSchema.find({ isActivated: true }).count()
            if (maxActivate >= 3) return res.status(400).json(createErrorResponse(message.unableToActivate))
            productDetail.isActivated = true
        }
        const activatedDeactived = await productDetail.save()
        if (activatedDeactived && activatedDeactived.isActivated == true) return res.status(200).json(createSuccessResponse(message.productActivated))
        if (activatedDeactived && activatedDeactived.isActivated == false) return res.status(200).json(createSuccessResponse(message.productDeactivated))
    } else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const productDuplicate = async (req, res) => {
    const productId = req.params.id
    if (!(isvalidId(productId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const productDetail = await productSchema.findOne({ _id: productId })
    if (productDetail) {
        const newProduct = Object.assign({})
        newProduct.productImage = productDetail.productImage
        newProduct.productName = productDetail.productName
        newProduct.price = productDetail.price
        const duplicateProduct = await new productSchema(newProduct).save()
        if (duplicateProduct) return res.status(200).json(createSuccessResponse(message.productDuplicated))
        else return res.status(400).json(createErrorResponse(message.unableToDuplicate))
    } else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const roomSizeDetail = async (req, res) => {
    const aggregationArray = [
        {
            $lookup: {
                from: 'panels',
                pipeline: [
                    {
                        $project: {
                            panelPricePermm: 1,
                            perPanelPrice: 1
                        }
                    }
                ], as: 'panelPrice'
            }
        },
        {
            $unwind: '$panelPrice'
        },
        {
            $lookup: {
                from: 'frametypes',
                pipeline: [
                    {
                        $project: {
                            type: 1,
                            price: 1,
                            isActivated: 1
                        }
                    }
                ], as: 'frameType'
            }
        },
        {
            $lookup: {
                from: 'framevariants',
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ["$isActivated", true]
                            }
                        }
                    },
                    {
                        $project: {
                            type: 1,
                            isDefault: 1,
                            isActivated: 1
                        }
                    }
                ], as: 'frameVariant'
            }
        },
        {
            $lookup: {
                from: 'doorchannels',
                pipeline: [
                    {
                        $project: {
                            type: '$doorType.type',
                            isEnabled: '$doorType.isEnabled',
                            doorSize: 1
                        }
                    }
                ], as: 'doorchannels'
            }
        },
        {
            $lookup: {
                from: 'doorcategories',
                pipeline: [
                    {
                        $project: {
                            category: '$doorCategory.category',
                            isEnabled: '$doorCategory.isEnabled',
                            doorHinges: 1
                        }
                    }
                ], as: 'doorHinges'
            }
        },
        {
            $lookup: {
                from: 'handlevariants',
                pipeline: [
                    {
                        $project: {
                            type: 1,
                            isDefault: 1,
                            isActivated: 1,
                            glbFile: 1,
                            price: 1,
                            size: 1
                        }
                    }
                ], as: 'doorHandles'
            }
        },
        {
            $lookup: {
                from: 'films',
                pipeline: [
                    {
                        $match: {
                            disabled: false
                        }
                    },
                    {
                        $project: {
                            image: 1,
                            name: 1,
                            // price: 1,
                            isActivated: 1,
                            price: 1
                            // isEnabled: 1
                        }
                    }
                ], as: 'films'
            }
        },
        {
            $project: {
                length: '$roomSize.length',
                breadth: '$roomSize.breadth',
                height: '$roomSize.height',
                panelPricePermm: '$panelPrice.panelPricePermm',
                perPanelPrice: '$panelPrice.perPanelPrice',
                frameType: 1,
                frameVariant: 1,
                doorchannels: 1,
                doorHinges: 1,
                doorHandles: 1,
                films: 1
            }
        }]
    const roomSize = await configurationSchema.aggregate(aggregationArray)
    if (roomSize && roomSize.length > 0) return res.status(200).json(createSuccessResponse(message.roomSizeDetail, roomSize[0]))
    else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const roomSizeUpdate = async (req, res) => {
    const configurationId = req.body.id
    if (!(isvalidId(configurationId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const roomSizeCheck = await configurationSchema.findOne({ _id: configurationId })
    if (roomSizeCheck) {
        if (req.body.length || req.body.length == 0) {
            if (req.body.length >= 1000 && req.body.length <= 9000) {
                roomSizeCheck.roomSize.length = req.body.length
            } else return res.status(400).json(createErrorResponse(message.lenBre))
        }
        if (req.body.breadth || req.body.breadth == 0) {
            if (req.body.breadth >= 1000 && req.body.breadth <= 9000) {
                roomSizeCheck.roomSize.breadth = req.body.breadth
            } else return res.status(400).json(createErrorResponse(message.lenBre))
        }

        if (req.body.height || req.body.height == 0) {
            if (req.body.height >= 1500 && req.body.height <= 3000) {
                roomSizeCheck.roomSize.height = req.body.height
            } else return res.status(400).json(createErrorResponse(message.roomHeight))
        }
        const updated = await roomSizeCheck.save()
        if (updated) return res.status(200).json(createSuccessResponse(message.roomSizeUpdated))
        else return res.status(400).json(createErrorResponse(message.unableToUpadte))
    } else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const partitionDetail = async (req, res) => {
    const aggregationArray = [{
        $project: {
            _id: 0,
            perMillimeterPrice: '$partition.perMillimeterPrice',
        }
    }]
    const partition = await configurationSchema.aggregate(aggregationArray)
    if (partition && partition.length > 0) return res.status(200).json(createSuccessResponse(message.partitionDetail, partition[0]))
    else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const partitionUpdate = async (req, res) => {
    const configurationId = req.body.id
    if (!(isvalidId(configurationId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const partitionCheck = await configurationSchema.findOne({ _id: configurationId })
    if (partitionCheck) {
        if (req.body.perMillimeterPrice) partitionCheck.partition.perMillimeterPrice = req.body.perMillimeterPrice
        const updated = await partitionCheck.save()
        if (updated) return res.status(200).json(createSuccessResponse(message.partitionUpdated))
        else return res.status(400).json(createErrorResponse(message.unableToUpadte))
    } else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const addPanel = async (req, res) => {
    const keys = ['panelSize', 'panelPrice', 'panelPricePermm']
    const { panelSize, panelPrice, panelPricePermm } = req.body
    keys.map((e) => {
        if (!req.body[e]) return res.status(400).json(createErrorResponse(`Please provide ${e}.`))
    })
    const checkPanel = await panelSchema.findOne({ panelSize })
    if (checkPanel) return res.status(400).json(createErrorResponse(message.panelSizeAlready))
    const panelObj = Object.assign({})
    panelObj.panelSize = panelSize
    panelObj.panelPrice = panelPrice
    panelObj.panelPricePermm = panelPricePermm
    panelObj.perPanelPrice = perPanelPrice
    const saved = await new panelSchema(panelObj).save()
    if (saved) return res.status(200).json(createSuccessResponse(message.panelAdded))
    else return res.status(400).json(createErrorResponse(message.unableToSave))
}

const panelList = async (req, res) => {
    const SEARCH = req.body.search
    const OFFSET = req.body.offset
    const LIMIT = req.body.limit
    const SORT_BY = req.body.sortBy
    const ORDER = req.body.order
    let pagination = []
    let sortBy = "createdAt";
    let order = -1;
    const sortObject = {};

    if (isNotNullAndUndefined(LIMIT) && isNotNullAndUndefined(OFFSET)) {
        pagination = [{ $skip: OFFSET }, { $limit: LIMIT }]
    }
    else {
        pagination = [{ $skip: 0 }, { $limit: 10 }]
    }
    if (isNotNullAndUndefined(SORT_BY)) {
        sortBy = SORT_BY
    }
    if (isNotNullAndUndefined(ORDER)) order = ORDER
    sortObject[sortBy] = order

    const aggregationArray = [{
        $project: {
            panelSize: 1,
            panelPrice: 1
        }
    }]

    if (SEARCH && SEARCH != '') {
        aggregationArray.push({
            $match: {
                $or: [
                    {
                        panelSize: SEARCH
                    },
                    {
                        panelPrice: SEARCH
                    },
                ]
            }
        })
    }

    aggregationArray.push({
        "$sort": sortObject
    },
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
    const panelData = await panelSchema.aggregate(aggregationArray)
    if (panelData && panelData[0].data && panelData[0].data.length > 0) return res.status(200).json(createSuccessResponse(message.panelList, panelData[0].data))
    else return res.status(400).json(createSuccessResponse(message.panelList, []))
}

const panelView = async (req, res) => {
    // const panelId = req.params.id
    // if (!(isvalidId(panelId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    // const panelDetail = await panelSchema.findOne({ _id: panelId },  { _id: 1, panelSize: 1,panelPrice: 1 })
    // if (panelDetail) return res.status(200).json(createSuccessResponse(message.panelDetail, panelDetail))
    // else return res.status(400).json(createErrorResponse(message.unableToFound))

    const panelDetail = await panelSchema.findOne({}, { _id: 0, panelPricePermm: 1, perPanelPrice: 1 }).sort({ createdAt: -1 })
    if (panelDetail) return res.status(200).json(createSuccessResponse(message.panelDetail, panelDetail))
    else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const panelUpdate = async (req, res) => {
    // const panelId = req.body.panelId
    // if (!(isvalidId(panelId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    // const panelDetail = await panelSchema.findOne({ _id: panelId })
    // if (panelDetail) {
    //     const checkPanel = await panelSchema.findOne({ _id: { $ne: panelDetail._id }, panelSize: req.body.panelSize })
    //     if (checkPanel) return res.status(400).json(createErrorResponse(message.panelSizeAlready))
    //     if (req.body.panelSize) panelDetail.panelSize = req.body.panelSize
    //     if (req.body.panelPrice) panelDetail.panelPrice = req.body.panelPrice
    //     const updated = await panelDetail.save()
    //     if (updated) return res.status(200).json(createSuccessResponse(message.panelUpdated))
    //     else return res.status(400).json(createErrorResponse(message.unableToUpadte))
    // } else return res.status(400).json(createErrorResponse(message.unableToFound))

    const panelDetail = await panelSchema.findOne({}).sort({ createdAt: -1 })
    if (panelDetail) {
        if (req.body.panelPricePermm) panelDetail.panelPricePermm = req.body.panelPricePermm
        if (req.body.perPanelPrice) panelDetail.perPanelPrice = req.body.perPanelPrice
        const updated = await panelDetail.save()
        if (updated) return res.status(200).json(createSuccessResponse(message.panelUpdated))
        else return res.status(400).json(createErrorResponse(message.unableToUpadte))
    } else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const panelDelete = async (req, res) => {
    const panelId = req.params.id
    if (!(isvalidId(panelId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const panelCheck = await panelSchema.findOne({ _id: panelId })
    if (!panelCheck) return res.status(400).json(createErrorResponse(message.panelNotFound))
    const deleted = await panelSchema.findOneAndDelete({ _id: panelId })
    if (deleted) return res.status(200).json(createSuccessResponse(message.panelDeleted))
    else return res.status(400).json(createErrorResponse(message.unableToDelete))
}

const frameTypeList = async (req, res) => {
    const SEARCH = req.body.search
    const OFFSET = req.body.offset ? req.body.offset : 0
    const LIMIT = req.body.limit ? req.body.limit : 10
    const SORT_BY = req.body.sortBy
    const ORDER = req.body.order
    let pagination = []
    let sortBy = "createdAt";
    let order = -1;
    const sortObject = {};

    if (isNotNullAndUndefined(LIMIT) && isNotNullAndUndefined(OFFSET)) {
        pagination = [{ $skip: OFFSET }, { $limit: LIMIT }]
    }
    else {
        pagination = [{ $skip: 0 }, { $limit: 10 }]
    }
    if (isNotNullAndUndefined(SORT_BY)) {
        sortBy = SORT_BY
    }
    if (isNotNullAndUndefined(ORDER)) order = ORDER
    sortObject[sortBy] = order

    const aggregationArray = [{
        $project: {
            type: 1,
            isActivated: 1,
            price: 1
        }
    }]


    if (SEARCH && SEARCH != '') {
        aggregationArray.push({
            $match: {
                $or: [
                    {
                        type: { $regex: new RegExp(('.*' + SEARCH + '.*'), "i") }
                    },
                    {
                        price: { $regex: new RegExp(('.*' + SEARCH + '.*'), "i") }
                    },
                ]
            }
        })
    }

    aggregationArray.push({
        "$sort": sortObject
    },
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
    const productdata = await frameTypeSchema.aggregate(aggregationArray)
    if (productdata && productdata[0] && productdata[0].data && productdata[0].data.length > 0) {
        let TotalCount = productdata && productdata[0] && productdata[0].totalCount ? productdata[0].totalCount.count : 0
        const pagination = paginationData(TotalCount, LIMIT, OFFSET)
        return res.status(200).json({ success: true, message: message.frameTypeList, data: productdata[0].data, pagination })
    }
    else return res.status(200).json({ success: true, message: message.frameTypeList, data: [] })
}

const frameTypeUpdate = async (req, res) => {
    const frameTypeId = req.body.frameTypeId
    if (!(isvalidId(frameTypeId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const frameDetail = await frameTypeSchema.findOne({ '_id': frameTypeId })
    if (frameDetail) {
        frameDetail.price = req.body.framePrice
        const updated = await frameDetail.save()
        if (updated) return res.status(200).json(createSuccessResponse(message.frameTypeUpdated))
        else return res.status(400).json(createErrorResponse(message.unableToUpadte))
    } else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const frameTypeActiveDeactive = async (req, res) => {
    const frameTypeId = req.params.id
    if (!(isvalidId(frameTypeId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const frameTypeDetail = await frameTypeSchema.findOne({ '_id': frameTypeId })
    if (frameTypeDetail) {
        if (frameTypeDetail.isActivated) {
            const checkActivate = await frameTypeSchema.findOne({ _id: { $ne: frameTypeId }, isActivated: true })
            if (checkActivate) frameTypeDetail.isActivated = false
            else return res.status(400).json(createSuccessResponse(message.unableToDeactivate))
        } else frameTypeDetail.isActivated = true
        const activatedDeactived = await frameTypeDetail.save()
        if (activatedDeactived && activatedDeactived.isActivated == true) return res.status(200).json(createSuccessResponse(message.frameTypeActivated))
        if (activatedDeactived && activatedDeactived.isActivated == false) return res.status(200).json(createSuccessResponse(message.frameTypeDeactivated))
    } else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const frameVariantAdd = async (req, res) => {
    const keys = ['type']
    const { type } = req.body
    keys.map((e) => {
        if (!req.body[e]) return res.status(400).json(createErrorResponse(`Please provide ${e}.`))
    })
    const checkFrame = await frameVariantSchema.findOne({ type: type.toLowerCase() })
    if (checkFrame) return res.status(400).json(createErrorResponse(message.frameVariantTypeAl))
    const obj = Object.assign({})
    const checkCount = await frameVariantSchema.find({}).count()
    if (checkCount == 0) {
        obj.isDefault = true
        obj.isActivated = true
    }
    obj.type = type.toLowerCase()
    await frameVariantSchema(obj).save()
    return res.status(200).json(createSuccessResponse(message.frameVariantAdd))
}

const frameVariantList = async (req, res) => {
    const SEARCH = req.body.search
    const OFFSET = req.body.offset ? req.body.offset : 0
    const LIMIT = req.body.limit ? req.body.limit : 10
    const SORT_BY = req.body.sortBy
    const ORDER = req.body.order
    let pagination = []
    let sortBy = "createdAt";
    let order = -1;
    const sortObject = {};

    if (isNotNullAndUndefined(LIMIT) && isNotNullAndUndefined(OFFSET)) {
        pagination = [{ $skip: OFFSET }, { $limit: LIMIT }]
    }
    else {
        pagination = [{ $skip: 0 }, { $limit: 10 }]
    }
    if (isNotNullAndUndefined(SORT_BY)) {
        sortBy = SORT_BY
    }
    if (isNotNullAndUndefined(ORDER)) order = ORDER
    sortObject[sortBy] = order

    const aggregationArray = [{
        $project: {
            type: 1,
            isActivated: 1,
            isDefault: 1,
            createdAt: 1
        }
    }]


    if (SEARCH && SEARCH != '') {
        aggregationArray.push({
            $match: {
                $or: [
                    {
                        type: { $regex: new RegExp(('.*' + SEARCH + '.*'), "i") }
                    }
                ]
            }
        })
    }
    aggregationArray.push({
        "$sort": sortObject
    },
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
    const productdata = await frameVariantSchema.aggregate(aggregationArray)
    if (productdata && productdata[0] && productdata[0].data && productdata[0].data.length > 0) {
        let TotalCount = productdata && productdata[0] && productdata[0].totalCount ? productdata[0].totalCount.count : 0
        const pagination = paginationData(TotalCount, LIMIT, OFFSET)
        return res.status(200).json({ success: true, message: message.frameVariantList, data: productdata[0].data, pagination })
    }
    else return res.status(200).json(createSuccessResponse(message.frameVariantList, []))
}

const frameVariantDelete = async (req, res) => {
    const frameVariantId = req.params.id
    if (!(isvalidId(frameVariantId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const frameVariantDetail = await frameVariantSchema.findOne({ _id: frameVariantId })
    if (frameVariantDetail) {
        await frameVariantSchema.deleteOne({ _id: frameVariantId })
        return res.status(200).json(createErrorResponse(message.frameVariantDelete))
    } else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const frameVariantActiveDeactive = async (req, res) => {
    const frameVariantId = req.params.id
    if (!(isvalidId(frameVariantId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const frameVariantDetail = await frameVariantSchema.findOne({ _id: frameVariantId })
    if (frameVariantDetail) {
        if (frameVariantDetail.isActivated) {
            if (frameVariantDetail.isDefault) return res.status(400).json(createErrorResponse(message.frameVariantDeactiveCheck))
            const checkActivate = await frameVariantSchema.findOne({ _id: { $ne: frameVariantId }, isActivated: true })
            if (checkActivate) {
                frameVariantDetail.isActivated = false
            }
            else return res.status(400).json(createSuccessResponse(message.unableToDeactivate))
        } else {
            const count = await frameVariantSchema.findOne({ isActivated: true }).count()
            if (count >= 5) return res.status(400).json(createErrorResponse(message.frameVariantMaxActive))
            frameVariantDetail.isActivated = true
        }
        const activatedDeactived = await frameVariantDetail.save()
        if (activatedDeactived && activatedDeactived.isActivated == true) return res.status(200).json(createSuccessResponse(message.frameVariantActivated))
        if (activatedDeactived && activatedDeactived.isActivated == false) return res.status(200).json(createSuccessResponse(message.frameVariantDeactivated))
    } else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const frameVariantDefault = async (req, res) => {
    const frameVariantId = req.params.id
    if (!(isvalidId(frameVariantId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const frameVariantDetail = await frameVariantSchema.findOne({ '_id': frameVariantId })
    if (frameVariantDetail) {
        await frameVariantSchema.updateMany({ isDefault: true }, { isDefault: false, isActivated: false })
        frameVariantDetail.isDefault = true
        frameVariantDetail.isActivated = true
        const isDefault = await frameVariantDetail.save()
        if (isDefault && isDefault.isDefault == true) return res.status(200).json(createSuccessResponse(message.frameVariantDefaulted))
    } else return res.status(400).json(createErrorResponse(message.unableToFound))
}

// const doorChannelList = async (req, res) => {
//     const SORT_BY = req.body.sortBy
//     const ORDER = req.body.order
//     const type = req.body.type
//     if (!type) return res.status(400).json(createErrorResponse(message.provideType))
//     const aggregationArray = [
//         {
//             $unwind: "$doorChannel"
//         },
//         {
//             $project: {
//                 doorChannel: 1
//             }
//         }]

//     aggregationArray.push({
//         $match: {
//             'doorChannel.doorType.type': type
//         }
//     })
//     const door = await configurationSchema.aggregate(aggregationArray)
//     if (door && door.length > 0) {
//         let final = door[0].doorChannel.doorSize;
//         if (isNotNullAndUndefined(SORT_BY) && ORDER) {
//             final.sort((a, b) => {
//                 if (a[SORT_BY] < b[SORT_BY]) { return ORDER }
//                 if (a[SORT_BY] > b[SORT_BY]) { return ORDER; }
//                 return 0;
//             })
//         }
//         door[0].doorChannel.doorSize = final
//         return res.status(200).json(createSuccessResponse(message.doorChannelList, door[0].doorChannel))
//     }
//     else return res.status(200).json(createSuccessResponse(message.doorChannelList, []))
// }

const doorChannelList = async (req, res) => {
    const SORT_BY = req.body.sortBy
    const ORDER = req.body.order
    const category = req.body.type
    if (!category) return res.status(400).json(createErrorResponse(message.provideType))
    const aggregationArray = [
        {
            $match: {
                'doorType.type': category
            }
        },
        {
            $project: {
                doorType: 1,
                doorSize: 1
            }
        }]

    const door = await DoorChannelSchema.aggregate(aggregationArray)
    if (door && door.length > 0) {
        let final = door[0].doorSize;
        if (isNotNullAndUndefined(SORT_BY) && ORDER) {
            final.sort((a, b) => {
                if (a[SORT_BY] < b[SORT_BY]) { return ORDER }
                if (a[SORT_BY] > b[SORT_BY]) { return ORDER; }
                return 0;
            })
        }
        door[0].doorSize = final
        return res.status(200).json(createSuccessResponse(message.doorChannelList, door[0]))
    }
    else return res.status(200).json(createSuccessResponse(message.doorChannelList, []))
}

const doorSizeForGlass = async (req, res) => {
    const SORT_BY = req.body.sortBy
    const ORDER = req.body.order
    const aggregationArray = [
        {
            $project: {
                doorSize: 1
            }
        }
    ]

    const door = await DoorChannelSchema.aggregate(aggregationArray)
    if (door && door.length > 0) {

        let final = door[0].doorSize.concat(door[1].doorSize);
        if (isNotNullAndUndefined(SORT_BY) && ORDER) {
            final.sort((a, b) => {
                if (a[SORT_BY] < b[SORT_BY]) { return ORDER }
                if (a[SORT_BY] > b[SORT_BY]) { return ORDER; }
                return 0;
            })
        }

        return res.status(200).json(createSuccessResponse(message.doorChannelList, final))
    }
    else return res.status(200).json(createSuccessResponse(message.doorChannelList, []))
}

const doorTypeEnableDisable = async (req, res) => {
    const doorChannelId = req.params.id
    if (!(isvalidId(doorChannelId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const doorChannelData = await DoorChannelSchema.findOne({ '_id': doorChannelId })
    if (doorChannelData) {
        if (doorChannelData.doorType.isEnabled == true) {
            const checkDisable = await DoorChannelSchema.findOne({ '_id': { $ne: doorChannelId }, 'doorType.isEnabled': false })
            if (checkDisable) return res.status(400).json(createErrorResponse(message.AtLeastdoorEnable))
            doorChannelData.doorType.isEnabled = false
        }
        else {
            doorChannelData.doorType.isEnabled = true
        }
        const enableDisable = await doorChannelData.save()
        if (enableDisable && enableDisable.doorType.isEnabled == true) return res.status(200).json(createSuccessResponse(message.doorTypeEnable))
        if (enableDisable && enableDisable.doorType.isEnabled == false) return res.status(200).json(createSuccessResponse(message.doorTypeDisable))
    } else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const doorSizeActiveDeactive = async (req, res) => {
    const doorSizeId = req.params.id
    if (!(isvalidId(doorSizeId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const doorChannelData = await DoorChannelSchema.findOne({ 'doorSize._id': doorSizeId })
    if (doorChannelData) {
        let atLeastOne = null
        let checkActivated = false
        if (doorChannelData.doorSize && doorChannelData.doorSize.length > 0) {
            doorChannelData.doorSize.map((r) => {
                if (String(r._id) == String(doorSizeId)) {
                    doorChannelData.doorSize.map((a) => {
                        if (String(a._id) != String(doorSizeId)) {
                            if (a.isActivated == true) {
                                atLeastOne = true
                            }
                        }
                    })
                    if (r.isActivated == true) {
                        checkActivated = false
                        r.isActivated = false
                    }
                    else {
                        checkActivated = true
                        r.isActivated = true
                    }
                }
            })
        }
        if (checkActivated == false && !atLeastOne) return res.status(400).json(createSuccessResponse(`At least one ${doorChannelData.doorType.type} door size must me activated.`))
        const activatedDeactived = await doorChannelData.save()
        if (activatedDeactived && checkActivated == true) return res.status(200).json(createSuccessResponse(message.doorSizeActivated))
        if (activatedDeactived && checkActivated == false) return res.status(200).json(createSuccessResponse(message.doorSizeDeactivated))
    } else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const doorChannelEdit = async (req, res) => {
    const doorSizeId = req.body.id
    if (!(isvalidId(doorSizeId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const doorChannelData = await DoorChannelSchema.findOne({ 'doorSize._id': doorSizeId })
    if (doorChannelData) {
        doorChannelData.doorSize.map((i) => {
            if (String(i._id) == String(doorSizeId)) {
                if (req.body.doorSize) i.size = req.body.doorSize
                if (req.body.doorPrice) i.price = req.body.doorPrice
            }
        })
        const updated = await doorChannelData.save()
        if (updated) return res.status(200).json(createSuccessResponse(`${doorChannelData.doorType.type.charAt(0).toUpperCase()}${doorChannelData.doorType.type.slice(1)} door channel details updated successfully`))
        else return res.status(400).json(createErrorResponse(message.unableToUpadte))
    } return res.status(400).json(createErrorResponse(message.unableToFound))
}

const doorGlassList = async (req, res) => {
    const OFFSET = req.body.offset ? req.body.offset : 0
    const SEARCH = req.body.search
    const LIMIT = req.body.limit ? req.body.limit : 10
    const SORT_BY = req.body.sortBy
    const ORDER = req.body.order
    let sortBy = "createdAt";
    let order = -1;
    const sortObject = {};
    let pagination = []
    pagination = [{ $skip: OFFSET }, { $limit: LIMIT }]
    if (isNotNullAndUndefined(SORT_BY)) {
        sortBy = SORT_BY
    }
    if (isNotNullAndUndefined(ORDER)) order = ORDER
    sortObject[sortBy] = order
    const aggregationArray = [
        {
            $lookup: {
                from: 'doorchannels',
                let: { 'channelId': '$channelSize' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $in: ['$$channelId', '$doorSize._id']
                            }
                        }
                    }
                ], 'as': 'channelSize1'
            }
        },
        {
            $unwind: '$channelSize1'
        },
        {
            $project: {
                glassSize: { $toString: "$glassSize" },
                doorGlassPrice: { $toString: "$doorGlassPrice" },
                channel: {
                    $first: {
                        "$filter": {
                            "input": "$channelSize1.doorSize",
                            "as": "size",
                            "cond": {
                                "$eq": ["$$size._id", '$channelSize']
                            }
                        }
                    }
                },
                doorType: '$channelSize1.doorType.type',
                isActivated: 1
            }
        },
        {
            $addFields: {
                "channelSize": { $toString: '$channel.size' }
            }
        }
    ]

    if (SEARCH && SEARCH != '') {
        aggregationArray.push({
            $match: {
                $or: [
                    {
                        glassSize: { $regex: new RegExp(('.*' + SEARCH + '.*'), "i") }
                    },
                    {
                        doorGlassPrice: { $regex: new RegExp(('.*' + SEARCH + '.*'), "i") }
                    },
                    {
                        channelSize: { $regex: new RegExp(('.*' + SEARCH + '.*'), "i") }
                    },
                    {
                        doorType: { $regex: new RegExp(('.*' + SEARCH + '.*'), "i") }
                    }
                ]
            }
        })
    }

    aggregationArray.push({
        "$sort": sortObject
    },
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
    const doorGlass = await doorGlassSchema.aggregate(aggregationArray)
    if (doorGlass && doorGlass[0] && doorGlass[0].data && doorGlass[0].data.length > 0) {
        let TotalCount = doorGlass && doorGlass[0] && doorGlass[0].totalCount ? doorGlass[0].totalCount.count : 0
        const pagination = paginationData(TotalCount, LIMIT, OFFSET)
        return res.status(200).json({ success: true, meassage: message.doorGlassList, data: doorGlass[0].data, pagination })
    }
    else return res.status(200).json(createSuccessResponse(message.doorGlassList, []))
}

const doorGlassEdit = async (req, res) => {
    const doorGlassId = req.body.doorGlassId
    if (!(isvalidId(doorGlassId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const doorGlassData = await doorGlassSchema.findOne({ _id: doorGlassId })
    if (doorGlassData) {
        if (req.body.glassSize) doorGlassData.glassSize = req.body.glassSize
        if (req.body.channelSize) doorGlassData.channelSize = req.body.channelSize
        if (req.body.price) doorGlassData.doorGlassPrice = req.body.price
        const updated = await doorGlassData.save()
        if (updated) return res.status(200).json(createSuccessResponse(message.doorGlassUpdated))
        else return res.status(400).json(createErrorResponse(message.unableToUpadte))
    } return res.status(400).json(createErrorResponse(message.unableToFound))
}

const doorGlassActivateDeactivate = async (req, res) => {
    const doorGlassId = req.params.id
    if (!(isvalidId(doorGlassId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const doorGlassData = await doorGlassSchema.findOne({ _id: doorGlassId })
    if (doorGlassData) {
        if (doorGlassData.isActivated) {
            const checkActivate = await doorGlassSchema.findOne({ _id: { $ne: doorGlassId }, doorType: doorGlassData.doorType, isActivated: true })
            if (checkActivate) doorGlassData.isActivated = false
            else return res.status(400).json(createErrorResponse(`At least one door glass is activated for ${doorGlassData.doorType} door.`))
        } else doorGlassData.isActivated = true
        await doorGlassData.save()
        if (doorGlassData.isActivated) return res.status(200).json(createSuccessResponse(message.doorGlassActivated))
        else return res.status(200).json(createSuccessResponse(message.doorGlassDeactivated))
    } return res.status(400).json(createErrorResponse(message.unableToFound))
}

const doorCategoryAndHingesList = async (req, res) => {
    const SORT_BY = req.body.sortBy
    const ORDER = req.body.order
    const category = req.body.category
    if (!category) return res.status(400).json(createErrorResponse(message.provideType))
    const aggregationArray = [
        {
            $match: {
                'doorCategory.category': category
            }
        },
        {
            $project: {
                doorCategory: 1,
                doorHinges: 1
            }
        }]

    const door = await DoorCategorySchema.aggregate(aggregationArray)
    if (door && door.length > 0) {
        let final = door[0].doorHinges;
        if (isNotNullAndUndefined(SORT_BY) && ORDER) {
            final.sort((a, b) => {
                if (a[SORT_BY] < b[SORT_BY]) { return ORDER }
                if (a[SORT_BY] > b[SORT_BY]) { return ORDER; }
                return 0;
            })
        }
        door[0].doorHinges = final
        return res.status(200).json(createSuccessResponse(message.doorHingesList, door[0]))
    }
    else return res.status(200).json(createSuccessResponse(message.doorHingesList, []))
}

const doorCategoryEnableDisable = async (req, res) => {
    const doorCategorylId = req.params.id
    if (!(isvalidId(doorCategorylId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const doorCategoryData = await DoorCategorySchema.findOne({ '_id': doorCategorylId })
    if (doorCategoryData) {
        if (doorCategoryData.doorCategory.isEnabled == true) {
            const checkDisable = await DoorCategorySchema.findOne({ '_id': { $ne: doorCategorylId }, 'doorCategory.isEnabled': false })
            if (checkDisable) return res.status(400).json(createErrorResponse(message.AtLeastCateEnable))
            doorCategoryData.doorCategory.isEnabled = false
        }
        else {
            doorCategoryData.doorCategory.isEnabled = true
        }
        const enableDisable = await doorCategoryData.save()
        if (enableDisable && enableDisable.doorCategory.isEnabled == true) return res.status(200).json(createSuccessResponse(message.doorCategoryEnable))
        if (enableDisable && enableDisable.doorCategory.isEnabled == false) return res.status(200).json(createSuccessResponse(message.doorCategoryDisable))
    } else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const doorHingesActiveDeactive = async (req, res) => {
    const doorHingesId = req.params.id
    if (!(isvalidId(doorHingesId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const doorHingesDetail = await DoorCategorySchema.findOne({ 'doorHinges._id': doorHingesId })
    if (doorHingesDetail) {
        let atLeastOne = null
        let checkActivated = false
        if (doorHingesDetail.doorHinges && doorHingesDetail.doorHinges.length > 0) {
            doorHingesDetail.doorHinges.map((r) => {
                if (String(r._id) == String(doorHingesId)) {
                    doorHingesDetail.doorHinges.map((a) => {
                        if (String(a._id) != String(doorHingesId)) {
                            if (a.isActivated == true) {
                                atLeastOne = true
                            }
                        }
                    })
                    if (r.isActivated == true) {
                        checkActivated = false
                        r.isActivated = false
                    }
                    else {
                        checkActivated = true
                        r.isActivated = true
                    }
                }
            })
        }
        if (checkActivated == false && !atLeastOne) return res.status(400).json(createSuccessResponse(' At least one door hinge must be activated'))
        const activatedDeactived = await doorHingesDetail.save()
        if (activatedDeactived && checkActivated == true) return res.status(200).json(createSuccessResponse(message.doorHingestActivated))
        if (activatedDeactived && checkActivated == false) return res.status(200).json(createSuccessResponse(message.doorHingestDeactivated))
    } else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const handleSideList = async (req, res) => {
    const SORT_BY = req.body.sortBy
    const ORDER = req.body.order

    const aggregationArray = [{
        $project: {
            _id: 0,
            handleSides: 1
        }
    }]

    const list = await configurationSchema.aggregate(aggregationArray)
    if (list && list[0] && list[0].handleSides && list[0].handleSides.length > 0) {
        let final = list[0].handleSides;
        if (isNotNullAndUndefined(SORT_BY) && ORDER) {
            final.sort((a, b) => {
                if (a[SORT_BY] < b[SORT_BY]) { return ORDER }
                if (a[SORT_BY] > b[SORT_BY]) { return ORDER; }
                return 0;
            })
        }
        return res.status(200).json(createSuccessResponse(message.handleSidesList, final))
    }
    else return res.status(200).json(createSuccessResponse(message.handleSidesList, []))
}

const handleSidesActiveDeactive = async (req, res) => {
    const handleSidesId = req.params.id
    if (!(isvalidId(handleSidesId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const handleSidesDetail = await configurationSchema.findOne({ 'handleSides._id': handleSidesId })
    if (handleSidesDetail) {
        let atLeastOne = null
        handleSidesDetail.handleSides.map((e) => {
            if (String(e._id) != String(handleSidesId)) {
                if (e.isActivated == true) {
                    atLeastOne = true
                }
            }
        })
        let checkActivate = false
        if (handleSidesDetail.handleSides && handleSidesDetail.handleSides.length > 0) {
            handleSidesDetail.handleSides.map((e) => {
                if (String(e._id) == String(handleSidesId)) {
                    if (e.isActivated == true) {
                        checkActivate = false
                        e.isActivated = false
                    }
                    else {
                        checkActivate = true
                        e.isActivated = true
                    }
                }
            })
        }
        if (checkActivate == false && !atLeastOne) return res.status(200).json(createSuccessResponse(message.unableToDeactivate))
        const activatedDeactived = await handleSidesDetail.save()
        if (activatedDeactived && checkActivate == true) return res.status(200).json(createSuccessResponse(message.handleSidesActivated))
        if (activatedDeactived && checkActivate == false) return res.status(200).json(createSuccessResponse(message.handleSidesDeactivated))
    } else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const handleVariantAdd = async (req, res) => {
    const keys = ['price']
    const { type, price } = req.body
    if (!req.file) return res.status(400).json(createErrorResponse(`Please provide image.`))
    keys.map((e) => {
        if (!req.body[e]) return res.status(400).json(createErrorResponse(`Please provide ${e}.`))
    })

    const obj = Object.assign({})
    const checkCount = await handleVariantSchema.find({}).count()
    if (checkCount == 0) {
        obj.isDefault = true
        obj.isActivated = true
    }
    obj.type = req.file.path
    obj.price = price
    await handleVariantSchema(obj).save()
    return res.status(200).json(createSuccessResponse(message.handleVariantAdd))
}

const handleVariantList = async (req, res) => {
    const SEARCH = req.body.search
    const OFFSET = req.body.offset ? req.body.offset : 0
    const LIMIT = req.body.limit ? req.body.limit : 10
    const SORT_BY = req.body.sortBy
    const ORDER = req.body.order
    let pagination = []
    let sortBy = "createdAt";
    let order = -1;
    const sortObject = {};

    if (isNotNullAndUndefined(LIMIT) && isNotNullAndUndefined(OFFSET)) {
        pagination = [{ $skip: OFFSET }, { $limit: LIMIT }]
    }
    else {
        pagination = [{ $skip: 0 }, { $limit: 10 }]
    }
    if (isNotNullAndUndefined(SORT_BY)) {
        sortBy = SORT_BY
    }
    if (isNotNullAndUndefined(ORDER)) order = ORDER
    sortObject[sortBy] = order

    const aggregationArray = [{
        $project: {
            type: 1,
            size: 1,
            price: { $toString: '$price' },
            isActivated: 1,
            isDefault: 1
        }
    }]


    if (SEARCH && SEARCH != '') {
        aggregationArray.push({
            $match: {
                $or: [
                    {
                        price: { $regex: new RegExp(('.*' + SEARCH + '.*'), "i") }
                    }
                ]
            }
        })
    }

    aggregationArray.push({
        "$sort": sortObject
    },
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
    const productdata = await handleVariantSchema.aggregate(aggregationArray)
    if (productdata && productdata[0] && productdata[0].data && productdata[0].data.length > 0) {
        let TotalCount = productdata && productdata[0] && productdata[0].totalCount ? productdata[0].totalCount.count : 0
        const pagination = paginationData(TotalCount, LIMIT, OFFSET)
        return res.status(200).json({ success: true, meassage: message.handleVariantList, data: productdata[0].data, pagination })
    }
    else return res.status(200).json(createSuccessResponse(message.handleVariantList, []))
}

const updateHandleVarient = async (req, res) => {

    let object = Object.assign({})
    let keys = ['size', 'price']
    keys.map(i => req.body[i] ? object[i] = req.body[i] : null)

    await handleVariantSchema.updateOne({ _id: req.body.id }, object)
    return res.status(200).json(createSuccessResponse(message.varientUpdated))
}

const handleVariantActiveDeactive = async (req, res) => {
    const handleVariantId = req.params.id
    if (!(isvalidId(handleVariantId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const handleVariantDetail = await handleVariantSchema.findOne({ '_id': handleVariantId })
    if (handleVariantDetail) {
        if (handleVariantDetail) {
            if (handleVariantDetail.isActivated) {
                if (handleVariantDetail.isDefault) return res.status(400).json(createErrorResponse(message.handleVariantDeactiveCheck))
                const checkActivate = await handleVariantSchema.findOne({ _id: { $ne: handleVariantId }, isActivated: true })
                if (checkActivate) {
                    handleVariantDetail.isActivated = false
                }
                else return res.status(400).json(createSuccessResponse(message.unableToDeactivate))
            } else {
                const count = await handleVariantSchema.findOne({ isActivated: true }).count()
                if (count >= 5) return res.status(400).json(createErrorResponse(message.frameVariantMaxActive))
                handleVariantDetail.isActivated = true
            }
            const activatedDeactived = await handleVariantDetail.save()
            if (activatedDeactived && activatedDeactived.isActivated == true) return res.status(200).json(createSuccessResponse(message.handleVariantActivated))
            if (activatedDeactived && activatedDeactived.isActivated == false) return res.status(200).json(createSuccessResponse(message.handleVariantDeactivated))
        } else return res.status(400).json(createErrorResponse(message.unableToFound))
    }
}

const handleVariantEdit = async (req, res) => {
    const handleVariantId = req.body.handleVariantId
    if (!(isvalidId(handleVariantId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const handleVariantDetail = await handleVariantSchema.findOne({ '_id': handleVariantId })
    if (handleVariantDetail) {
        if (req.body.price) handleVariantDetail.price = req.body.price
        if (req.file) handleVariantDetail.type = req.file.path
        await handleVariantDetail.save()
        return res.status(200).json(createSuccessResponse(message.handleVariantUpdate))
    } else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const handleVariantDefault = async (req, res) => {
    const handleVariantId = req.params.id
    if (!(isvalidId(handleVariantId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const handleVariantDetail = await handleVariantSchema.findOne({ '_id': handleVariantId })
    if (handleVariantDetail) {
        await handleVariantSchema.updateMany({ isDefault: true }, { isDefault: false, isActivated: false })
        handleVariantDetail.isDefault = true
        handleVariantDetail.isActivated = true
        const isDefault = await handleVariantDetail.save()
        if (isDefault && isDefault.isDefault == true) return res.status(200).json(createSuccessResponse(message.handleVariantDefaulted))
    } else return res.status(400).json(createErrorResponse(message.unableToFound))
}

// const filmDetail = async (req, res) => {
//     const aggregationArray = [{
//         $project: {
//             film: 1
//         }
//     }]
//     const film = await configurationSchema.aggregate(aggregationArray)
//     if (film && film.length > 0) return res.status(200).json(createSuccessResponse(message.filmDetail, film[0].film))
//     else return res.status(400).json(createErrorResponse(message.unableToFound))
// }

// const filmEnableDisable = async (req, res) => {
//     const filmDetail = await configurationSchema.findOne({})
//     if (filmDetail && filmDetail.film) {
//         let checkEnable = false
//         if (filmDetail.film.isEnabled == true) {
//             checkEnable = false
//             filmDetail.film.isEnabled = false
//         }
//         else {
//             checkEnable = true
//             filmDetail.film.isEnabled = true
//         }
//         const enableDisable = await filmDetail.save()
//         if (enableDisable && checkEnable == true) return res.status(200).json(createSuccessResponse(message.filmEnable))
//         if (enableDisable && checkEnable == false) return res.status(200).json(createSuccessResponse(message.filmDisable))
//     } else return res.status(400).json(createErrorResponse(message.unableToFound))
// }

// const filmUpdate = async (req, res) => {
//     const filmDetail = await configurationSchema.findOne({})
//     if (filmDetail && filmDetail.film) {
//         if (req.body.price) filmDetail.film.price = req.body.price
//         if (req.body.priceIncToBasePrice) filmDetail.film.priceIncToBasePrice = req.body.priceIncToBasePrice
//         const updated = await filmDetail.save()
//         if (updated) return res.status(200).json(createSuccessResponse(message.filmUpdated))
//         else return res.status(400).json(createErrorResponse(message.unableToUpadte))
//     } else return res.status(400).json(createErrorResponse(message.unableToFound))
// }

const addFilm = async (req, res) => {
    // const keys = ['name', 'price']
    // for (e of keys) {
    //     if (!req.body[e]) return res.status(400).json(createErrorResponse(`Please provide ${e}.`))
    // }
    // const checkFilmName = await filmSchema.findOne({ name: req.body.name })
    // if (checkFilmName) return res.status(400).json(createErrorResponse(message.filmName))
    // const newObj = Object.assign({})
    // if (req.file) newObj.image = req.file.path
    // newObj.name = req.body.name.toLowerCase()
    // newObj.price = req.body.price
    // const isEnabled = await filmSchema.findOne({ isEnabled: true })
    // newObj.isEnabled = isEnabled ? true : false
    // const added = await new filmSchema(newObj).save()
    // if (added) return res.status(200).json(createSuccessResponse(message.filmAdded))
    // else return res.status(400).json(createErrorResponse(message.unableToSave))


    const keys = ['name']
    const { name } = req.body
    keys.map((e) => {
        if (!req.body[e]) return res.status(400).json(createErrorResponse(`Please provide ${e}.`))
    })
    const checkFilmName = await filmSchema.findOne({ name: name.toLowerCase() })
    if (checkFilmName) return res.status(400).json(createErrorResponse(message.filmName))
    const obj = Object.assign({})
    const checkCount = await filmSchema.find({}).count()
    if (checkCount == 0) {
        obj.isDefault = true
        obj.isActivated = true
    }
    if (req.file) newObj.image = req.file.path
    obj.name = name.toLowerCase()
    await filmSchema(obj).save()
    return res.status(200).json(createSuccessResponse(message.filmAdded))
}

const filmList = async (req, res) => {
    const OFFSET = req.body.offset ? req.body.offset : 0
    const LIMIT = req.body.limit ? req.body.limit : 10
    const SORT_BY = req.body.sortBy
    const ORDER = req.body.order
    const SEARCH = req.body.search
    let sortBy = "createdAt";
    let order = -1;
    const sortObject = {};
    let pagination = []

    if (isNotNullAndUndefined(LIMIT) && isNotNullAndUndefined(OFFSET)) {
        pagination = [{ $skip: OFFSET }, { $limit: LIMIT }]
    }
    else {
        pagination = [{ $skip: 0 }, { $limit: 10 }]
    }


    if (isNotNullAndUndefined(SORT_BY)) {
        sortBy = SORT_BY
    }
    if (isNotNullAndUndefined(ORDER)) order = ORDER
    sortObject[sortBy] = order

    const aggregationArray = [
        {
            $lookup: {
                from: "films",
                pipeline: [
                    {
                        $match: {

                            disabled: false
                        }
                    }
                ],
                as: "enabled"
            }
        },
        {
            $project: {
                name: 1,
                image: 1,
                // price: { $toString: '$price' },
                isEnabled: { $gt: [{ $size: "$enabled" }, 0] },
                isActivated: 1,
                createdAt: 1,
                price: 1

            }
        },
    ]
    if (isNotNullAndUndefined(SEARCH) && SEARCH != "") {
        aggregationArray.push({
            $match: {
                $or: [{
                    name: { $regex: new RegExp(('.*' + SEARCH + '.*'), "i") }
                },
                    // {
                    //     price: { $regex: new RegExp(('.*' + SEARCH + '.*'), "i") }
                    // }
                ]
            }
        })
    }

    aggregationArray.push({
        "$sort": sortObject
    },
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
    const film = await filmSchema.aggregate(aggregationArray)
    if (film && film[0] && film[0].data && film[0].data.length > 0) {
        let TotalCount = film && film[0] && film[0].totalCount ? film[0].totalCount.count : 0
        const pagination = paginationData(TotalCount, LIMIT, OFFSET)
        const isEnabled = film[0].data[0].isEnabled
        return res.status(200).json({ success: true, meassage: message.filmList, data: film[0].data, isEnabled, pagination })
    }
    else return res.status(200).json(createSuccessResponse(message.filmList, []))
}

const filmUpdate = async (req, res) => {
    const filmId = req.body.filmId
    if (!(isvalidId(filmId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const filmDetail = await filmSchema.findOne({ _id: filmId })
    if (filmDetail) {
        // if (req.body.price) filmDetail.price = req.body.price
        if (req.body.name) {
            const code = await filmSchema.findOne({ name: req.body.name.toLowerCase() })
            if (code) return res.status(400).json(createErrorResponse(message.filmName))
            filmDetail.name = req.body.name.toLowerCase()
        }
        if (req.file) filmDetail.image = req.file.path
        if (req.body['price']) filmDetail['price'] = req.body['price']
        const updated = await filmDetail.save()
        if (updated) return res.status(200).json(createSuccessResponse(message.filmUpdated))
        else return res.status(400).json(createErrorResponse(message.unableToUpadte))
    } else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const filmDetail = async (req, res) => {
    const filmId = req.params.id
    if (!(isvalidId(filmId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const filmDetail = await filmSchema.findOne({ _id: filmId })
    if (filmDetail) return res.status(200).json(createSuccessResponse(message.filmDetail, filmDetail))
    else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const deleteFilm = async (req, res) => {
    const filmId = req.params.id
    if (!(isvalidId(filmId))) return res.status(400).json(createErrorResponse(message.validMongoId))
    const filmDetail = await filmSchema.findOne({ _id: filmId })
    if (filmDetail) {
        if (filmDetail.isActivated) {
            const count1 = await filmSchema.find({ isActivated: true }).count()
            if (count1 === 1) return res.status(400).json(createErrorResponse(message.unableToDeactivateFilm))

        }
        const count = await filmSchema.findOne({}).count()
        if (count == 1) return res.status(400).json(createErrorResponse('At least one film is required.'))
        const deleted = await filmSchema.deleteOne({ _id: filmId })
        if (deleted) return res.status(200).json(createSuccessResponse(message.filmDeleted))
        else return res.status(400).json(createErrorResponse(message.unableToDelete))
    } else return res.status(400).json(createErrorResponse(message.unableToFound))
}

const filmEnableDisable = async (req, res) => {
    const isEnabled = await filmSchema.findOne({ isEnabled: true })
    if (isEnabled) {
        await filmSchema.updateMany({ isEnabled: true }, { isEnabled: false })
        return res.status(200).json(createSuccessResponse(message.filmDisable))
    }
    else {
        await filmSchema.updateMany({ isEnabled: false }, { isEnabled: true })
        return res.status(200).json(createSuccessResponse(message.filmEnable))
    }
}

const filmActivateDeactivate = async (req, res) => {
    const filmId = req.query.id

    if (filmId) {

        if (!(isvalidId(filmId))) return res.status(400).json(createErrorResponse(message.validMongoId))
        const filmDetail = await filmSchema.findOne({ _id: filmId })
        if (filmDetail) {
            if (filmDetail.isActivated == true) {
                const filmActive = await filmSchema.findOne({ _id: { $ne: filmId }, isActivated: true })
                if (filmActive) filmDetail.isActivated = false
                else return res.status(400).json(createErrorResponse(message.unableToDeactivateFilm))

            }
            else {
                const count = await filmSchema.find({ isActivated: true }).count()
                if (count >= 5) return res.status(400).json(createErrorResponse('Maximum of 5 films can be activated.'))
                filmDetail.isActivated = true
            }
            const activatedDeactived = await filmDetail.save()
            if (activatedDeactived.isActivated == true) return res.status(200).json(createSuccessResponse(message.filmActivated))
            else return res.status(200).json(createSuccessResponse(message.filmDeactivated))
        } else return res.status(400).json(createErrorResponse(message.unableToFound))
    }
    else {

        await filmSchema.updateMany({ isActivated: false })
        return res.status(200).json(createSuccessResponse(message.filmDeactivated))
    }
}

const allFilmActivateDeactivate = async (req, res) => {

    let count = await filmSchema.find({ disabled: false }).count()
    let updateObject = Object.assign({})
    let responseMessage = ""

    if (count > 0) {
        responseMessage = message.filmsDisabled
        updateObject['disabled'] = true
    }
    else {
        responseMessage = message.filmsEnabled
        updateObject['disabled'] = false
    }

    await filmSchema.updateMany(updateObject)
    return res.status(200).json(createSuccessResponse(responseMessage))
}

const productListForWebsite = async (req, res) => {
    const productList = await productSchema.find({ isActivated: true }).select('productName productImage isActivated')
    console.log(productList)
    if (productList && productList.length > 0) return res.status(200).json(createSuccessResponse(message.prdouctList, productList))
    else return res.status(200).json(createSuccessResponse(message.prdouctList, []))
}

// --------------- For texture add only -------------------

const TextureSchema = require('../../models/texture.model')
const fs = require('fs')
const film = require('../../models/film.model')
const { isValidObjectId } = require('mongoose')

const textureAPI = async (req, res) => {
    const keys = ['scale']
    for (i of keys) {
        if (!req.body[i]) return res.status(400).json(createErrorResponse(`Please provide ${i}.`))
    }
    if (!req.file) return res.status(400).json(createErrorResponse('Please provide the image.'))
    const newObj = Object.assign({})
    newObj.url = req.file.path
    newObj.scale = req.body.scale
    const added = await new TextureSchema(newObj).save()
    const newUrl = `public/texture/${added._id}.${added.url.split('.')[1]}`
    fs.rename(added.url, newUrl, async (err, data) => {
        if (err) return console.log(":::::: error ::::::::: ", err)
        await TextureSchema.updateOne({ _id: added._id }, { url: newUrl })
        console.log(":::::::::: File Renamed :::::::::::")
        return res.status(200).json(createSuccessResponse("Texture added successfully.", newUrl))
    })

}

const textureDetail = async (req, res) => {
    const textureId = req.params.id
    if (!isvalidId(textureId)) return res.status(400).json(createErrorResponse(message.validMongoId))
    const texture = await TextureSchema.findOne({ _id: textureId }).select('url scale').lean()
    if (texture) {
        texture.url = texture.url.split('.')[0]
        return res.status(200).json(createSuccessResponse(message.textureDetail, texture))
    } else return res.status(400).json(createErrorResponse(message.textureNot))
}

const ordersList = async (req, res) => {

    let offset = req.body.offset || req.body.offset == 0 ? parseInt(req.body.offset) : 0
    let limit = req.body.limit || req.body.limit == 0 ? parseInt(req.body.limit) : 10
    let sort = req.body.sort
    let order = req.body.order || req.body.order == 0 ? parseInt(req.body.order) : 0
    let search = req.body.search
    let list = await OrderSchema.ordersListForAdmin(offset, limit, order, sort, search)

    if (list && list[0]) {

        let totalCount = list && list[0] && list[0].totalCount ? list[0].totalCount.count : 0
        let pagination = paginationData(totalCount, limit, offset)

        return res.status(200).json(createSuccessResponse(message.orderFetched, { list: list[0].data, pagination }))
    }
    else return res.status(400).json(createErrorResponse(message.orderNotFetched))
}

const orderDetails = async (req, res) => {

    if (isValidObjectId(req.params.id)) {

        let order = await OrderSchema.model.findOne({ _id: req.params.id })

        if (order) return res.status(200).json(createSuccessResponse(message.orderFetched, order))
        else return res.status(400).json(createErrorResponse(message.orderNotFound))
    }
    else return res.status(400).json(createErrorResponse(message.orderNotFound))
}

const getTolerance = async (req, res) => {

    let tolerance = await tolranceSchema.model.findOne().select('-createdAt -updatedAt -__v')

    return res.status(200).json(createSuccessResponse(message.toleranceFetched, tolerance))
}

const updateTolerance = async (req, res) => {

    let keys = [
        "headChannel",
        "floorChannelLeft",
        "floorChannelRight",
        "verticalFramingChannel",
        "horizontalFramingChannelLeft",
        "horizontalFramingChannelRight",
        "horizontalFramingChannelDoor",
        "horizontalBarsLeft",
        "horizontalBarsRight",
        "horizontalBarsDoor",
        "leftPanel",
        "rightPanel",
        "doorPanel",
        "cappingChannel",
        "endCoverTrims"
    ]
    let updateObject = Object.assign({})

    keys.map(i => req.body[i] || req.body[i] == 0 ? updateObject[i] = req.body[i] : null)
    await tolranceSchema.model.updateMany(updateObject)

    return res.status(200).json(createSuccessResponse(message.toleranceUpdated))
}

// ---------------- To get dimensions & create image and pdf --------------
const imageAndPdfGenerator = async (req, res) => {


    const pdfDataArray = req.body.data
    const pdfArray = []
    const clientPdfArray = []
    const orderId = Math.random().toString(36).substr(2, 10).toUpperCase()

    for (let i = 0; i < pdfDataArray.length; i++) {

        const data = req.body.data[i]
        const fileName = `public/pdf/${data.name}_${Date.now()}.pdf`
        const clientFileName = `public/pdf/${data.name}_client_${Date.now()}.pdf`

        const keys = ["product", "price", "frameVarient", "frameType", "roomSize", "partition"]
        let object = Object.assign({})

        keys.map(i => data[i] ? object[i] = data[i] : null)
        object['pdf'] = fileName
        object['clientPdf'] = fileName
        object['leftPanelSize'] = data?.panels?.left?.size
        object['rightPanelSize'] = data?.panels?.right?.size
        object['film'] = data.filmName ? "yes" : "no"
        object['orderId'] = orderId

        if (data.door) {
            object['doorGlass'] = data.door.doorGlass
            object['doorChannel'] = data.door.doorChannel
            object['doorCategory'] = data.door.doorCategory
            object['doorHinges'] = data.door.doorHinges
            object['handleType'] = data.door.handleType
            object['handleVarient'] = data.door.handleVarient
        }

        let productDetails = await productSchema.findOne({ productName: data.product.name })
        if (productDetails) object.product.image = productDetails.productImage
        let order = await OrderSchema.model(object).save()

        const colorCodes = {
            headRail: "#7e4f25",
            default: "#000000",
            floorRail: "#e30a16",
            vertivalFramingChannel: "#40b06f",
            horizontalFramingChannel: "#f39608",
            panels: "#009fe3",
            horizontalBars: "#951b81"
        }


        const headers = [
            {
                'name': "Part",
                'prompt': "Part",
                'width': 100,
                'align': 'center',
            },
            {
                'name': "Quantity",
                'prompt': "Quantity",
                'width': 50,
                'align': 'center',
            },
            {
                'name': "Measurement",
                'prompt': "Measurement (mm)",
                'width': 50,
                'align': 'center',
            }
        ]

        const tolrance = await tolranceSchema.model.findOne()

        const parts = [
            "Vertical Framing Channel",
            "Vertical Framing Channel (Door)",
            "Horizontal Framing Channel (Left)",
            "Horizontal Framing Channel (Right)",
            "Horizontal Framing Channel (Door)",
            "Floor Channel (Left)",
            "Floor Channel (Right)",
            "Head Channel",
            "Horizontal Bars (Left)",
            "Horizontal Bars (Right)",
            "Horizontal Bars (Door)",
            "Horizontal Bars Spacing (Left)",
            "Horizontal Bars Spacing (Right)"
        ]

        if (data.door) parts.push("Panels Left", "Panels Right")
        else parts.push("Panels")
        parts.push("Door Panel", "Capping Channel", "End Cover Trims", "Hinges", "Handles Hex", "Adjustable Feet", "Insert")


        const quantity = [
            (data.panels.left.count + data.panels.right.count) * 2,
            (data.door ? 2 : 0),
            data.panels.left.count * 2,
            data.panels.right.count * 2,
            data.door ? 2 : 0,
            data.panels.left.count > 0 ? 1 : 0,
            data.panels.right.count > 0 ? 1 : 0,
            1,
            data?.panels?.left?.count > 0 ? data.panels.left.horizontalBars * data.panels.left.count * 2 : 0,
            data?.panels?.right?.count > 0 ? data.panels.right.horizontalBars * data.panels.right.count * 2 : 0,
            data.door ? data.door.horizontalBars * 2 : 0,
            " ",
            " "
        ]

        if (data.door) quantity.push(data.panels.left.count, data.panels.right.count,)
        else quantity.push(data.panels.left.count)

        quantity.push(
            data.door ? 1 : 0,
            ((data.panels.left.count > 0 ? data.panels.left.count - 1 : 0) + (data.panels.right.count > 0 ? data.panels.right.count - 1 : 0)) * 2,
            data.product.name == 'Floating' ? 4 : data.product.name == "Fixed to two walls" ? 0 : data.product.name == "Fixed to one wall" ? 2 : 0,
            data.door && data.door.type == "single" ? 2 : data.door && data.door.type == "double" ? 4 : 0,
            data.door && data.door.type == "single" ? 2 : data.door && data.door.type == "double" ? 4 : 0,
            (data.panels.left.count + data.panels.right.count) * 2,
            (data.panels.left.count + data.panels.right.count) * 2,
        )

        const measurement = [
            data.wallHeight - tolrance.verticalFramingChannel,
            data.door ? (data.door.size - tolrance.doorPanel) : "0",
            data?.panels?.left?.count > 0 ? data.panels.left.size - tolrance.horizontalFramingChannelLeft : "0",
            data?.panels?.right?.count > 0 ? data?.panels?.right?.size - tolrance.horizontalFramingChannelRight : "0",
            data?.door?.size > 0 ? data.door.size - tolrance.horizontalFramingChannelDoor : "0",
            data?.panels?.left?.count > 0 ? (data.panels.left.size * data.panels.left.count) - tolrance.floorChannelLeft : "0",
            data?.panels?.right?.count > 0 ? (data.panels.right.size * data.panels.right.count) - tolrance.floorChannelRight : "0",
            data.wallLength - tolrance.headChannel,
            data?.panels?.left.count > 0 && data?.panels?.left?.horizontalBars > 0 ? data.panels.left.size - tolrance.horizontalBarsLeft : "0",
            data?.panels?.right.count > 0 && data?.panels?.right?.horizontalBars > 0 ? data.panels.right.size - tolrance.horizontalBarsRight : "0",
            data?.door?.horizontalBars > 0 ? data.door.size - tolrance.horizontalBarsDoor : "0",
            data?.panels?.left.count > 0 && data?.panels?.left?.horizontalBars > 0 ? (data.wallHeight / data?.panels?.left?.horizontalBars) + 1 : "0",
            data?.panels?.right.count > 0 && data?.panels?.right?.horizontalBars > 0 ? (data.wallHeight / data?.panels?.right?.horizontalBars) + 1 : "0",
        ]


        if (data.door) measurement.push(
            data?.panels?.left?.count > 0 ? `${(data.panels.left.size - tolrance.leftPanel).toFixed(2)} x ${(data.wallHeight - tolrance.verticalFramingChannel).toFixed(2)}` : "0",
            data?.panels?.right?.count > 0 ? `${(data.panels.right.size - tolrance.rightPanel).toFixed(2)} x ${(data.wallHeight - tolrance.verticalFramingChannel).toFixed(2)}` : "0"
        )

        else measurement.push(`${(data.panels.left.size).toFixed(2)} x ${(data.wallHeight - tolrance.verticalFramingChannel).toFixed(2)}`)

        measurement.push(
            data?.door ? `${(data.door.size - tolrance.doorPanel).toFixed(2)} x ${(data.wallHeight - tolrance.doorPanel).toFixed(2)}` : "0",
            `${tolrance.cappingChannel}`,
            `${tolrance.endCoverTrims}`,
            " ",
            data.door ? data.door.handleSize : "0",
            " ",
            " "
        )

        const tableData = () => {

            let result = []

            for (let i = 0; i < (data.door ? 20 : 19); i++) {

                result.push({
                    Part: parts[i],
                    Quantity: quantity[i].toString(),
                    Measurement: measurement[i].toString().includes("x") || measurement[i] == " " ? measurement[i] : parseFloat(measurement[i]).toFixed(2)
                })
            }

            return result
        };

        const doc = new jsPDF({ orientation: "landscape" });
        const pageWidth = doc.internal.pageSize.getWidth() - 30
        const ratio = 9000 / pageWidth
        const width = data.wallLength / ratio
        const extraMarginFromLeftRight = width > 0 ? (pageWidth - width) / 2 : 0
        const descriptionStartPoint = 40
        const marginFronLeftRight = 15 + extraMarginFromLeftRight
        const height = 150
        const marginFromTop = 25
        const spaceBeetweenPanels = 2
        const panelMarginFromHeadrail = 15
        const panelMarginFromFloorail = 10
        const railLineWidth = 1
        const panelLineWidth = 0.8
        const panelHeight = height - marginFromTop - panelMarginFromHeadrail - panelMarginFromFloorail

        let curretWidth = marginFronLeftRight
        let leftPanelsEndPoint = curretWidth
        let rightPanelsStartPoint = curretWidth

        // logo
        let iamgeData = fs.readFileSync('public/logo/logo.png').toString('base64')
        doc.addImage(iamgeData, "png", 10, 10, 50, 10)

        // header data
        doc.setFontSize(10)
        doc.text(`Order ID`, 225, 15)
        doc.text(`:`, 250, 15)
        doc.text(`${orderId}`, 255, 15)

        doc.setFontSize(10)
        doc.text(`Product Type`, 225, 20)
        doc.text(`:`, 250, 20)
        doc.text(`${data.product.name}`, 255, 20)

        // head rail
        doc.setDrawColor(colorCodes.headRail);
        doc.setLineWidth(railLineWidth)
        doc.line(marginFronLeftRight, marginFromTop, width + marginFronLeftRight, marginFromTop)

        // left panels
        if (data?.panels?.left?.count > 0) {

            let spaceToRemove = (spaceBeetweenPanels * (data.panels.left.count - 1)) / data.panels.left.count
            let panelSize = (data.panels.left.size / ratio) - spaceToRemove

            for (let i = 0; i < data.panels.left.count; i++) {

                let startPoint = i == 0 ? curretWidth : curretWidth + spaceBeetweenPanels
                let endPoint = startPoint + panelSize
                curretWidth = endPoint

                // walls
                doc.setLineWidth(panelLineWidth)
                doc.setDrawColor(colorCodes.vertivalFramingChannel);
                doc.line(startPoint, marginFromTop + panelMarginFromHeadrail, startPoint, height - panelMarginFromFloorail)
                doc.line(endPoint, marginFromTop + panelMarginFromHeadrail, endPoint, height - panelMarginFromFloorail)

                // top and bottom
                doc.setLineWidth(panelLineWidth)
                doc.setDrawColor(colorCodes.horizontalFramingChannel);
                doc.line(startPoint + 1, marginFromTop + panelMarginFromHeadrail - 1, endPoint - 1, marginFromTop + panelMarginFromHeadrail - 1)
                doc.line(startPoint + 1, height - panelMarginFromFloorail + 1, endPoint - 1, height - panelMarginFromFloorail + 1)

                // inner rectangle
                doc.setFillColor(colorCodes.panels);
                doc.rect(startPoint + 1, marginFromTop + panelMarginFromHeadrail, endPoint - startPoint - 2, height - panelMarginFromFloorail - marginFromTop - panelMarginFromHeadrail, "F")

                // horizontal bars 

                if (data?.panels?.left?.horizontalBars > 0) {

                    let spaceBetweenHorizontalBars = panelHeight / (data.panels.left.horizontalBars + 1)
                    let currentLinePosition = marginFromTop + panelMarginFromHeadrail

                    for (let j = 0; j < data.panels.left.horizontalBars; j++) {

                        currentLinePosition = currentLinePosition + spaceBetweenHorizontalBars

                        doc.setLineWidth(panelLineWidth)
                        doc.setDrawColor(colorCodes.horizontalBars);
                        doc.line(startPoint + 1, currentLinePosition, endPoint - 1, currentLinePosition)
                    }
                }
            }

            leftPanelsEndPoint = curretWidth

            // floor rail for left panels

            doc.setDrawColor(colorCodes.floorRail);
            doc.setLineWidth(railLineWidth)
            doc.line(marginFronLeftRight, height, leftPanelsEndPoint, height)
        }

        // door
        if (data.door) {

            let spaceToRemove = data.panels.left.count > 0 ? spaceBeetweenPanels : 0
            let doorSize = (data.door.size / ratio) - spaceToRemove

            let startPoint = data.panels.left.count > 0 ? curretWidth + spaceBeetweenPanels : curretWidth
            let endPoint = startPoint + doorSize
            curretWidth = endPoint

            // walls
            doc.setLineWidth(panelLineWidth)
            doc.setDrawColor(colorCodes.vertivalFramingChannel);
            doc.line(startPoint, marginFromTop + panelMarginFromHeadrail, startPoint, height - panelMarginFromFloorail)
            doc.line(endPoint, marginFromTop + panelMarginFromHeadrail, endPoint, height - panelMarginFromFloorail)

            // top and bottom
            doc.setLineWidth(panelLineWidth)
            doc.setDrawColor(colorCodes.horizontalFramingChannel);
            doc.line(startPoint + 1, marginFromTop + panelMarginFromHeadrail - 1, endPoint - 1, marginFromTop + panelMarginFromHeadrail - 1)
            doc.line(startPoint + 1, height - panelMarginFromFloorail + 1, endPoint - 1, height - panelMarginFromFloorail + 1)


            // inner rectangle
            doc.setFillColor(colorCodes.panels);
            doc.rect(startPoint + 1, marginFromTop + panelMarginFromHeadrail, endPoint - startPoint - 2, height - panelMarginFromFloorail - marginFromTop - panelMarginFromHeadrail, "F")

            // horizontal bars 

            if (data?.door?.horizontalBars > 0) {

                let spaceBetweenHorizontalBars = panelHeight / (data.door.horizontalBars + 1)
                let currentLinePosition = marginFromTop + panelMarginFromHeadrail

                for (let i = 0; i < data.door.horizontalBars; i++) {

                    currentLinePosition = currentLinePosition + spaceBetweenHorizontalBars

                    doc.setLineWidth(panelLineWidth)
                    doc.setDrawColor(colorCodes.horizontalBars);
                    doc.line(startPoint + 1, currentLinePosition, endPoint - 1, currentLinePosition)
                }
            }
        }

        // right panels
        if (data?.panels?.right?.count > 0) {

            let spaceToRemove = (spaceBeetweenPanels * data.panels.right.count) / data.panels.right.count
            let panelSize = (data.panels.right.size / ratio) - spaceToRemove
            rightPanelsStartPoint = data.door ? curretWidth + spaceBeetweenPanels : curretWidth

            for (let i = 0; i < data.panels.right.count; i++) {

                let startPoint = data.door ? curretWidth + spaceBeetweenPanels : curretWidth
                let endPoint = startPoint + panelSize
                curretWidth = endPoint

                // walls
                doc.setLineWidth(panelLineWidth)
                doc.setDrawColor(colorCodes.vertivalFramingChannel);
                doc.line(startPoint, marginFromTop + panelMarginFromHeadrail, startPoint, height - panelMarginFromFloorail)
                doc.line(endPoint, marginFromTop + panelMarginFromHeadrail, endPoint, height - panelMarginFromFloorail)

                // top and bottom
                doc.setLineWidth(panelLineWidth)
                doc.setDrawColor(colorCodes.horizontalFramingChannel);
                doc.line(startPoint + 1, marginFromTop + panelMarginFromHeadrail - 1, endPoint - 1, marginFromTop + panelMarginFromHeadrail - 1)
                doc.line(startPoint + 1, height - panelMarginFromFloorail + 1, endPoint - 1, height - panelMarginFromFloorail + 1)


                // inner rectangle
                doc.setFillColor(colorCodes.panels);
                doc.rect(startPoint + 1, marginFromTop + panelMarginFromHeadrail, endPoint - startPoint - 2, height - panelMarginFromFloorail - marginFromTop - panelMarginFromHeadrail, "F")



                // horizontal bars 

                if (data?.panels?.right?.horizontalBars > 0) {

                    let spaceBetweenHorizontalBars = panelHeight / (data.panels.right.horizontalBars + 1)
                    let currentLinePosition = marginFromTop + panelMarginFromHeadrail

                    for (let j = 0; j < data.panels.right.horizontalBars; j++) {

                        currentLinePosition = currentLinePosition + spaceBetweenHorizontalBars

                        doc.setLineWidth(panelLineWidth)
                        doc.setDrawColor(colorCodes.horizontalBars);
                        doc.line(startPoint + 1, currentLinePosition, endPoint - 1, currentLinePosition)
                    }
                }
            }

            // floor rail for right panels

            doc.setDrawColor(colorCodes.floorRail);
            doc.setLineWidth(railLineWidth)
            doc.line(rightPanelsStartPoint, height, curretWidth, height)
        }

        // color declarations

        let descriptionHeight = height + 20
        let colorBoxHeight = height + 17.5
        let boxWidth = 3
        let boxHeight = 3

        doc.setFontSize(10)
        doc.text("Head Channel", descriptionStartPoint, descriptionHeight)
        doc.setFillColor(colorCodes.headRail);
        doc.rect(descriptionStartPoint + 25, colorBoxHeight, boxWidth, boxHeight, "F")

        doc.text("Floor Channel", descriptionStartPoint + 35, descriptionHeight)
        doc.setFillColor(colorCodes.floorRail);
        doc.rect(descriptionStartPoint + 60, colorBoxHeight, boxWidth, boxHeight, "F")

        doc.text("Vertical Framing Channel", descriptionStartPoint + 70, descriptionHeight)
        doc.setFillColor(colorCodes.vertivalFramingChannel);
        doc.rect(descriptionStartPoint + 112.5, colorBoxHeight, boxWidth, boxHeight, "F")

        doc.text("Horizontal Framing Channel", descriptionStartPoint + 122, descriptionHeight)
        doc.setFillColor(colorCodes.horizontalFramingChannel);
        doc.rect(descriptionStartPoint + 169, colorBoxHeight, boxWidth, boxHeight, "F")

        doc.text("Horizontal Bars", descriptionStartPoint + 178, descriptionHeight)
        doc.setFillColor(colorCodes.horizontalBars);
        doc.rect(descriptionStartPoint + 205, colorBoxHeight, boxWidth, boxHeight, "F")

        // footer data

        doc.text("Ceiling Height", 15, height + 35)
        doc.text(":", 42, height + 35)
        doc.text(`${data.wallHeight}`, 47, height + 35)

        doc.text("Door Category", 15, height + 43)
        doc.text(":", 42, height + 43)
        doc.text(`${data.door ? data.door.doorCategory.charAt(0).toUpperCase() + data.door.doorCategory.slice(1) : "N/A"}`, 47, height + 43)

        doc.text("Door Color", 15, height + 51)
        doc.text(":", 42, height + 51)
        doc.text(`${data.door ? data.frameColorCode : "N/A"}`, 47, height + 51)

        doc.text("Film Name", 230, height + 35)
        doc.text(":", 262, height + 35)
        doc.text(`${data.filmName ? data.filmName : "N/A"}`, 268, height + 35)

        doc.text("Frame Color Code", 230, height + 43)
        doc.text(":", 262, height + 43)
        doc.text(`${data.frameColorCode}`, 268, height + 43)

        // table section
        doc.addPage()
        doc.setLineWidth(0);
        doc.setDrawColor(colorCodes.default);
        doc.table(70, 25, tableData(), headers, { autoSize: false, headerBackgroundColor: "#FFFFFF", fontSize: 9, padding: 2 });
        doc.save(fileName)

        pdfArray.push(fileName)

        // **********     Client Pdf     **********

        const clientDoc = new jsPDF({ orientation: "landscape" });

        const ClientPdfQuantity = [
            (data.panels.left.count + data.panels.right.count) * 2,
            (data.door ? 2 : 0),
            data.panels.left.count * 2,
            data.panels.right.count * 2,
            data.door ? 2 : 0,
            data.panels.left.count > 0 ? 1 : 0,
            data.panels.right.count > 0 ? 1 : 0,
            1,
            data?.panels?.left?.count > 0 ? data.panels.left.horizontalBars * data.panels.left.count * 2 : 0,
            data?.panels?.right?.count > 0 ? data.panels.right.horizontalBars * data.panels.right.count * 2 : 0,
            data.door ? data.door.horizontalBars * 2 : 0,
            " ",
            " "
        ]

        if (data.door) ClientPdfQuantity.push(data.panels.left.count, data.panels.right.count,)
        else quantity.push(data.panels.left.count)

        ClientPdfQuantity.push(
            data.door ? 1 : 0,
            ((data.panels.left.count > 0 ? data.panels.left.count - 1 : 0) + (data.panels.right.count > 0 ? data.panels.right.count - 1 : 0)) * 2,
            data.product.name == 'Floating' ? 4 : data.product.name == "Fixed to two walls" ? 0 : data.product.name == "Fixed to one wall" ? 2 : 0,
            data.door && data.door.type == "single" ? 2 : data.door && data.door.type == "double" ? 4 : 0,
            data.door && data.door.type == "single" ? 2 : data.door && data.door.type == "double" ? 4 : 0,
            (data.panels.left.count + data.panels.right.count) * 2,
            (data.panels.left.count + data.panels.right.count) * 2,
        )

        const ClientPdfMeasurement = [
            data.wallHeight,
            data.door ? data.door.size : "0",
            data?.panels?.left?.count > 0 ? data.panels.left.size : "0",
            data?.panels?.right?.count > 0 ? data?.panels?.right?.size : "0",
            data?.door?.size > 0 ? data.door.size : "0",
            data?.panels?.left?.count > 0 ? data.panels.left.size * data.panels.left.count : "0",
            data?.panels?.right?.count > 0 ? data.panels.right.size * data.panels.right.count : "0",
            data.wallLength,
            data?.panels?.left.count > 0 && data?.panels?.left?.horizontalBars > 0 ? data.panels.left.size : "0",
            data?.panels?.right.count > 0 && data?.panels?.right?.horizontalBars > 0 ? data.panels.right.size : "0",
            data?.door?.horizontalBars > 0 ? data.door.size : "0",
            data?.panels?.left.count > 0 && data?.panels?.left?.horizontalBars > 0 ? (data.wallHeight / data?.panels?.left?.horizontalBars) + 1 : "0",
            data?.panels?.right.count > 0 && data?.panels?.right?.horizontalBars > 0 ? (data.wallHeight / data?.panels?.right?.horizontalBars) + 1 : "0",
        ]


        if (data.door) ClientPdfMeasurement.push(
            data?.panels?.left?.count > 0 ? `${data.panels.left.size.toFixed(2)} x ${data.wallHeight.toFixed(2)}` : "0",
            data?.panels?.right?.count > 0 ? `${data.panels.right.size.toFixed(2)} x ${data.wallHeight.toFixed(2)}` : "0"
        )

        else ClientPdfMeasurement.push(`${data.panels.left.size.toFixed(2)} x ${data.wallHeight.toFixed(2)}`)

        ClientPdfMeasurement.push(
            data?.door ? `${data.door.size.toFixed(2)} x ${data.wallHeight.toFixed(2)}` : "0",
            `${tolrance.cappingChannel}`,
            `${tolrance.endCoverTrims}`,
            " ",
            data.door ? data.door.handleSize : "0",
            " ",
            " "
        )

        const clientTableData = () => {

            let result = []

            for (let i = 0; i < (data.door ? 20 : 19); i++) {

                result.push({
                    Part: parts[i],
                    Quantity: ClientPdfQuantity[i].toString(),
                    Measurement: ClientPdfMeasurement[i].toString().includes("x") || ClientPdfMeasurement[i] == " " ? ClientPdfMeasurement[i] : parseFloat(ClientPdfMeasurement[i]).toFixed(2)
                })
            }

            return result
        };

        // head section

        clientDoc.addImage(iamgeData, "png", 10, 10, 50, 10)

        clientDoc.setFontSize(10)
        clientDoc.text(`Order ID`, 225, 15)
        clientDoc.text(`:`, 250, 15)
        clientDoc.text(`${orderId}`, 255, 15)

        clientDoc.setFontSize(10)
        clientDoc.text(`Product Type`, 225, 20)
        clientDoc.text(`:`, 250, 20)
        clientDoc.text(`${data.product.name}`, 255, 20)

        // main image

        clientDoc.addImage(data.base64, "png", 15, marginFromTop + 5, pageWidth, height - 10)

        // footer data

        clientDoc.text("Ceiling Height", 15, height + 35)
        clientDoc.text(":", 42, height + 35)
        clientDoc.text(`${data.wallHeight}`, 47, height + 35)

        clientDoc.text("Door Category", 15, height + 43)
        clientDoc.text(":", 42, height + 43)
        clientDoc.text(`${data.door ? data.door.doorCategory.charAt(0).toUpperCase() + data.door.doorCategory.slice(1) : "N/A"}`, 47, height + 43)

        clientDoc.text("Door Color", 15, height + 51)
        clientDoc.text(":", 42, height + 51)
        clientDoc.text(`${data.door ? data.frameColorCode : "N/A"}`, 47, height + 51)

        clientDoc.text("Film Name", 230, height + 35)
        clientDoc.text(":", 262, height + 35)
        clientDoc.text(`${data.filmName ? data.filmName : "N/A"}`, 268, height + 35)

        clientDoc.text("Frame Color Code", 230, height + 43)
        clientDoc.text(":", 262, height + 43)
        clientDoc.text(`${data.frameColorCode}`, 268, height + 43)

        // table section

        clientDoc.addPage()
        clientDoc.setLineWidth(0);
        clientDoc.setDrawColor(colorCodes.default);
        clientDoc.table(70, 25, clientTableData(), headers, { autoSize: false, headerBackgroundColor: "#FFFFFF", fontSize: 9, padding: 2 });
        clientDoc.save(clientFileName)

        clientPdfArray.push(clientFileName)
    }

    if (req.body.fromCart) await cartSchema.model.deleteMany()
    return res.status(200).json(createSuccessResponse("PDF", clientPdfArray))
}

// cart to cart
const addToCart = async (req, res) => {

    let itemCount = await cartSchema.model.count()

    if (itemCount < 5) {

        let productDetails = await productSchema.findOne({ productName: req.body.product.name })
        if (productDetails) req.body.product.image = productDetails.productImage

        await cartSchema.model({ data: req.body }).save()
        return res.status(200).json(createSuccessResponse(message.itemAddedToCart))
    }
    else return res.status(400).json(createErrorResponse(message.cartFull))
}

// cart List
const cartList = async (req, res) => {

    let offset = req.body.offset || req.body.offset == 0 ? parseInt(req.body.offset) : 0
    let limit = req.body.limit || req.body.limit == 0 ? parseInt(req.body.limit) : 10
    let sort = req.body.sort
    let order = req.body.order || req.body.order == 0 ? parseInt(req.body.order) : 0
    let search = req.body.search
    let list = await cartSchema.cartList(offset, limit, order, sort, search)

    if (list && list[0]) {

        let totalCount = list && list[0] && list[0].totalCount ? list[0].totalCount.count : 0
        let pagination = paginationData(totalCount, limit, offset)

        let newList = list[0].data.map(i => {
            i.data._id = i._id
            return i.data
        })
        return res.status(200).json(createSuccessResponse(message.cartFetched, { list: newList, pagination }))
    }
    else return res.status(400).json(createErrorResponse(message.cartNotFetched))
}

// remove from cart
const removeFromCart = async (req, res) => {

    if (isValidObjectId(req.params.id)) {

        let item = await cartSchema.model.findOne({ _id: req.params.id })

        if (item) {

            item.remove()
            return res.status(200).json(createSuccessResponse(message.itemRemoved))
        }
        else return res.status(400).json(createErrorResponse(message.itmeNotFound))
    }
    else return res.status(400).json(createErrorResponse(message.itmeNotFound))
}

module.exports = {
    productsList,
    productView,
    productUpdate,
    productActiveDeactive,
    productDuplicate,
    roomSizeDetail,
    roomSizeUpdate,
    partitionDetail,
    partitionUpdate,
    addPanel,
    panelList,
    panelView,
    panelUpdate,
    panelDelete,
    frameTypeList,
    frameTypeUpdate,
    frameTypeActiveDeactive,
    frameVariantList,
    frameVariantActiveDeactive,
    frameVariantDefault,
    handleVariantEdit,
    frameVariantDelete,
    frameVariantAdd,
    doorChannelList,
    doorSizeForGlass,
    doorTypeEnableDisable,
    doorSizeActiveDeactive,
    doorChannelEdit,
    doorGlassList,
    doorGlassEdit,
    doorGlassActivateDeactivate,
    doorCategoryAndHingesList,
    doorCategoryEnableDisable,
    doorHingesActiveDeactive,
    handleSideList,
    handleSidesActiveDeactive,
    handleVariantAdd,
    handleVariantList,
    handleVariantActiveDeactive,
    handleVariantDefault,
    // filmDetail,
    // filmEnableDisable,
    // filmUpdate,
    addFilm,
    filmList,
    filmUpdate,
    deleteFilm,
    filmDetail,
    filmEnableDisable,
    filmActivateDeactivate,
    productListForWebsite,
    textureAPI,
    textureDetail,
    imageAndPdfGenerator,
    ordersList,
    orderDetails,
    getTolerance,
    updateTolerance,
    updateHandleVarient,
    addToCart,
    cartList,
    removeFromCart,
    allFilmActivateDeactivate
}