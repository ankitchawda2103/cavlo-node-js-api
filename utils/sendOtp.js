// const client = require('../config/twilio');

// const sendOtp = async (phone_number, otp) => {
//   try {
//     await client.messages.create({
//       body: `Your OTP code is ${otp}`,
//       from: process.env.TWILIO_PHONE_NUMBER,
//       to: phone_number,
//     });
//     return true;
//   } catch (error) {
//     console.error('Error sending OTP:', error);
//     return false;
//   }
// };

// module.exports = { sendOtp };
