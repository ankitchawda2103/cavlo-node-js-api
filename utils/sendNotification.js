const admin = require('../config/firebaseConfig.js');
const sendNotification = async (fcmToken, title, body) => {
    const message = {
        notification: {
            title,
            body,
        },
        token: fcmToken,
    };
    try {
        await admin.messaging().send(message);
        console.log('Notification sent successfully');
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};
module.exports = { sendNotification };
