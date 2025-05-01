const model = require('../model/notificationsModel');

async function getNotificationsById(id) {
    try {
        return model.getNotificationsById(id);
    }
    catch (err) {
        throw err;
    }
};

async function getUnreadNotificationsCount(id) {
    try {
        return model.getUnreadNotificationsCount(id);;
    }
    catch (err) {
        throw err;
    }
}

async function addNotification(user_id, text, type, entityType, entityId, link) {
    try {
        return await model.addNotification(user_id, text, type, entityType, entityId, link);
    } catch (err) {
        throw err;
    }
}


module.exports = { getNotificationsById, getUnreadNotificationsCount, addNotification };