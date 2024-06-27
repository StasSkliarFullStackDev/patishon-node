const multer = require('multer');
const path = require('path')

const multerForProduct = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, `public/productImages`)
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + path.extname(file.originalname))
        }
    })
})

const multerForFilm = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, `public/filmImages`)
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + path.extname(file.originalname))
        }
    })
})

const multerForTexture = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, `public/texture`)
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + path.extname(file.originalname))
        }
    })
})


module.exports.productImage = multerForProduct.single('productImage')
module.exports.filmImage = multerForFilm.single('image')
module.exports.textureImage = multerForTexture.single('image')