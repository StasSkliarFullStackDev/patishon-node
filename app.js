const express = require('express')
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
const logger = require('morgan');
require('dotenv').config()
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const { customCORSHandler, escapeSpecialCharacter } = require('./helpers/utils')

// app.use(customCORSHandler);
app.use(logger('dev'));
const port = process.env.PORT || 3000;
const fs = require('fs');
app.use('/public', express.static('public', { index: false, extensions: ['jpg', 'jpeg', 'png'] }));
let keys = ['productImages', 'filmImages', 'texture']
if (!fs.existsSync('./public')) {
    fs.mkdirSync('./public')
    for (i of keys) {
        if (!fs.existsSync(`./public/${i}`)) {
            fs.mkdirSync(`./public/${i}`);
        }
    }
} else {
    for (i of keys) {
        if (!fs.existsSync(`./public/${i}`)) {
            fs.mkdirSync(`./public/${i}`);
        }
    }
}
const MONOGO_CONNECT_URL = process.env.MONGO_CONNECT_URL;
const mongoDbOptions = {
    useNewUrlParser: true
}
mongoose.connect(MONOGO_CONNECT_URL, mongoDbOptions, (err) => {
    if (err) console.log(`Database not connected::::::=>${err}`)
    else console.log(`Database connected::: ${MONOGO_CONNECT_URL}`)
})

app.use((req, res, next) => {
    if (req.body.email) req.body.email = (req.body.email).toLowerCase();
    let offset = req.body.offset
    let limit = req.body.limit
    if (offset) req.body.offset = offset ? parseInt(offset) : 0
    if (limit) req.body.limit = limit ? parseInt(limit) : 10
    // if (req.body.search && req.body.search != '') req.body.search = escapeSpecialCharacter(req.body.search);
    next();
})

const v1 = require('./routes/v1/index')
app.use('/api/v1', v1);
app.use((req, res) => {
    return res.status(400).send('API NOT FOUND')
});
app.listen(port, function () {
    console.log(`Server listing on PORT ${port}`);
});