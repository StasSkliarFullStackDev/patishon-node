const express = require('express')
const adminRouter = express.Router();
const { asyncTryCatchMiddleware } = require("../../middlewares/async");
const { productsList,
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
    frameVariantDelete,
    frameVariantList,
    frameVariantActiveDeactive,
    frameVariantDefault,
    frameVariantAdd,
    doorChannelList,
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
    handleVariantEdit,
    doorSizeForGlass,
    // filmDetail,
    // filmEnableDisable,
    // filmUpdate,
    addFilm,
    filmList,
    filmUpdate,
    deleteFilm,
    filmEnableDisable,
    filmDetail,
    filmActivateDeactivate,
    productListForWebsite,
    textureAPI,
    textureDetail,
    ordersList,
    orderDetails,
    getTolerance,
    updateTolerance,
    updateHandleVarient,
    addToCart,
    cartList,
    removeFromCart,
    allFilmActivateDeactivate,
    createDoor,
    doorList,
    removeDoor,
    createGlassCovering,
    glassCoveringList, updateGlassCoveringList
} = require('../../controllers/v1/admin.controller')
const {imageAndPdfGenerator} = require('../../controllers/v1/pdf-quote.controller')

const { productImage, filmImage, textureImage } = require('../../middlewares/multer');

adminRouter.post('/product/list', asyncTryCatchMiddleware(productsList));

adminRouter.get('/product/detail/:id', asyncTryCatchMiddleware(productView));

adminRouter.post('/product/update', productImage, asyncTryCatchMiddleware(productUpdate))

adminRouter.put('/product/status/:id', asyncTryCatchMiddleware(productActiveDeactive))

adminRouter.get('/product/duplicate/:id', asyncTryCatchMiddleware(productDuplicate))

adminRouter.get('/roomSizeDetail', asyncTryCatchMiddleware(roomSizeDetail))

adminRouter.post('/roomSizeUpdate', asyncTryCatchMiddleware(roomSizeUpdate))

adminRouter.get('/partitionDetail', asyncTryCatchMiddleware(partitionDetail))

adminRouter.post('/partitionUpdate', asyncTryCatchMiddleware(partitionUpdate))

adminRouter.post('/addPanel', asyncTryCatchMiddleware(addPanel))

adminRouter.post('/createDoor', asyncTryCatchMiddleware(createDoor))

adminRouter.get('/doorList', asyncTryCatchMiddleware(doorList))

adminRouter.delete('/removeDoor/:id', asyncTryCatchMiddleware(removeDoor))

adminRouter.post('/createGlassCovering', asyncTryCatchMiddleware(createGlassCovering))

adminRouter.get('/glassCoveringList', asyncTryCatchMiddleware(glassCoveringList))

adminRouter.post('/glassCoveringList/:id', asyncTryCatchMiddleware(updateGlassCoveringList))

adminRouter.post('/panelList', asyncTryCatchMiddleware(panelList))

// adminRouter.get('/panelView/:id', asyncTryCatchMiddleware(panelView))
adminRouter.get('/panelView', asyncTryCatchMiddleware(panelView))

adminRouter.put('/panelUpdate', asyncTryCatchMiddleware(panelUpdate))

adminRouter.delete('/panelDelete/:id', asyncTryCatchMiddleware(panelDelete))

adminRouter.post('/frameTypeList', asyncTryCatchMiddleware(frameTypeList))

adminRouter.put('/frameTypeUpdate', asyncTryCatchMiddleware(frameTypeUpdate))

adminRouter.post('/frameAdd', asyncTryCatchMiddleware(frameVariantAdd))

adminRouter.put('/frameTypeActiveDeactive/:id', asyncTryCatchMiddleware(frameTypeActiveDeactive))

adminRouter.post('/frameVariantList', asyncTryCatchMiddleware(frameVariantList))

adminRouter.put('/frameVariantActiveDeactive/:id', asyncTryCatchMiddleware(frameVariantActiveDeactive))

adminRouter.put('/frameVariantDefault/:id', asyncTryCatchMiddleware(frameVariantDefault))

adminRouter.delete('/frameVariantDelete/:id', asyncTryCatchMiddleware(frameVariantDelete))

adminRouter.post('/doorChannelList', asyncTryCatchMiddleware(doorChannelList))

adminRouter.put('/doorTypeEnableDisable/:id', asyncTryCatchMiddleware(doorTypeEnableDisable))

adminRouter.put('/doorSizeEnableDisable/:id', asyncTryCatchMiddleware(doorSizeActiveDeactive))

adminRouter.put('/doorChannelEdit', asyncTryCatchMiddleware(doorChannelEdit))

adminRouter.post('/doorGlassList', asyncTryCatchMiddleware(doorGlassList))

adminRouter.get('/doorSizeList', asyncTryCatchMiddleware(doorSizeForGlass))

adminRouter.put('/doorGlassEdit', asyncTryCatchMiddleware(doorGlassEdit))

adminRouter.put('/doorGlassActiveDeactive/:id', asyncTryCatchMiddleware(doorGlassActivateDeactivate))

adminRouter.post('/doorCategoryAndHingesList', asyncTryCatchMiddleware(doorCategoryAndHingesList))

adminRouter.put('/doorCategoryEnableDisable/:id', asyncTryCatchMiddleware(doorCategoryEnableDisable))

adminRouter.put('/doorHingesActiveDeactive/:id', asyncTryCatchMiddleware(doorHingesActiveDeactive))

adminRouter.post('/handleSideList', asyncTryCatchMiddleware(handleSideList))

adminRouter.put('/handleSidesActiveDeactive/:id', asyncTryCatchMiddleware(handleSidesActiveDeactive))

adminRouter.post('/handleAdd', textureImage, asyncTryCatchMiddleware(handleVariantAdd))

adminRouter.put('/handleEdit', textureImage, asyncTryCatchMiddleware(handleVariantEdit))

adminRouter.post('/handleVariantList', asyncTryCatchMiddleware(handleVariantList))

adminRouter.put('/handleVariantUpdate', asyncTryCatchMiddleware(updateHandleVarient))

adminRouter.put('/handleVariantActiveDeactive/:id', asyncTryCatchMiddleware(handleVariantActiveDeactive))

adminRouter.put('/handleVariantDefault/:id', asyncTryCatchMiddleware(handleVariantDefault))

// adminRouter.get('/filmDetail', asyncTryCatchMiddleware(filmDetail))

// adminRouter.put('/filmEnableDisable', asyncTryCatchMiddleware(filmEnableDisable))

// adminRouter.put('/filmUpdate', asyncTryCatchMiddleware(filmUpdate))

adminRouter.post('/addFilm', filmImage, asyncTryCatchMiddleware(addFilm))

adminRouter.post('/filmList', asyncTryCatchMiddleware(filmList))

adminRouter.get('/filmDetail/:id', asyncTryCatchMiddleware(filmDetail))

adminRouter.put('/filmEnableDisable', asyncTryCatchMiddleware(filmEnableDisable))

adminRouter.post('/filmUpdate', filmImage, asyncTryCatchMiddleware(filmUpdate))

adminRouter.delete('/deleteFilm/:id', asyncTryCatchMiddleware(deleteFilm))

adminRouter.put('/filmActivateDeactivate', asyncTryCatchMiddleware(filmActivateDeactivate))

adminRouter.get('/productWeb/list', asyncTryCatchMiddleware(productListForWebsite))

adminRouter.post('/texture/add', textureImage, asyncTryCatchMiddleware(textureAPI))

adminRouter.get('/texture/detail/:id', asyncTryCatchMiddleware(textureDetail))

adminRouter.post('/pdf', asyncTryCatchMiddleware(imageAndPdfGenerator))

adminRouter.post('/orderList', asyncTryCatchMiddleware(ordersList))

adminRouter.get('/orderDetails/:id', asyncTryCatchMiddleware(orderDetails))

adminRouter.get('/getTolerance', asyncTryCatchMiddleware(getTolerance))

adminRouter.post('/setTolerance', asyncTryCatchMiddleware(updateTolerance))

adminRouter.post('/addItem', asyncTryCatchMiddleware(addToCart))

adminRouter.post('/cart', asyncTryCatchMiddleware(cartList))

adminRouter.get('/removeFromcart/:id', asyncTryCatchMiddleware(removeFromCart))

adminRouter.get('/activateDeactivateFilms', asyncTryCatchMiddleware(allFilmActivateDeactivate))

module.exports = adminRouter