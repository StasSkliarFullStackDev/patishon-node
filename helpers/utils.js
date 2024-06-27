const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
module.exports.verifyJwt = (token) => {
    try {
        const tokenDetail = jwt.verify(token, process.env.SECRET_KEY)
        return tokenDetail
    }
    catch (err) {
        return false;
    }
}

module.exports.paginationData = (totalCount, LIMIT, OFFSET) => {
    let totalPages = Math.ceil(totalCount / LIMIT);
    let currentPage = Math.floor(OFFSET / LIMIT);
    let prevPage = (currentPage - 1) > 0 ? (currentPage - 1) * LIMIT : 0;
    let nextPage = (currentPage + 1) <= totalPages ? (currentPage + 1) * LIMIT : 0;

    return {
        totalCount,
        nextPage,
        prevPage,
        currentPage: currentPage + 1
    }
}

module.exports.compare = async (password, dataPassword) => {
    let checkPassword = await bcrypt.compare(password, dataPassword);
    return checkPassword
}

module.exports.hash = async (newPassword) => {
    const hash = await bcrypt.hash(newPassword, parseInt(process.env.SALT))
    return hash
}

module.exports.randomAlphaNumericCode = () => Math.random().toString(36).slice(2).toUpperCase().slice(0, 6)

module.exports.parseToMongoObjectID = string => mongoose.Types.ObjectId(string);

module.exports.createErrorResponse = (message) => {
    return {
        success: false,
        message,
    }
}

module.exports.createSuccessResponse = (message, data = null, success = true) => {
    return { success, message, data };
}

module.exports.escapeSpecialCharacter = (text) => {
    if (text) {
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }
    else {
        return '';
    }
}

module.exports.paginationData = (totalCount, LIMIT, OFFSET) => {
    let totalPages = Math.ceil(totalCount / LIMIT);
    let currentPage = Math.floor(OFFSET / LIMIT);
    let prevPage = (currentPage - 1) > 0 ? (currentPage - 1) * LIMIT : 0;
    let nextPage = (currentPage + 1) <= totalPages ? (currentPage + 1) * LIMIT : 0;

    return {
        totalCount,
        nextPage,
        prevPage,
        totalCount,
        currentPage: currentPage + 1
    }
}

module.exports.isNotNullAndUndefined = value => value !== undefined && value !== null && value != '';

module.exports.hasNoValue = e => e === null || e === undefined || e === '' ? true : false;

module.exports.isvalidId = (id) => mongoose.Types.ObjectId.isValid(id)
