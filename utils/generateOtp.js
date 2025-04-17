const generateOtp = () => {
  return 1234;
  return Math.floor(1000 + Math.random() * 9000).toString();
};

module.exports = { generateOtp };
