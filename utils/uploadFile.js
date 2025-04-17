const multer = require('multer');
const multerS3 = require("multer-s3");
const s3 = require('../config/awsConfig')

const folderName = (fieldname) => {
    let fileType;
    switch (fieldname) {

        case "profile_image":
            fileType = "profile_image";
            break;
        case "category_image":
            fileType = "category";
            break;
        case "background_image":
            fileType = "coupon/background";
            break;
        case "background_image":
            fileType = "coupon/image";
            break;
        case "restaurant_logo":
            fileType = "restaurant/logo";
            break;
        case "item_image":
            fileType = "restaurant/menu/image";
            break;
        default:
            fileType = "unknown";
    }
    return fileType;
};

const uploadImage = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        acl: "public-read",
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {

            // Determine the fileType based on fieldname
            let folder = folderName(file.fieldname);

            // Generate the filename and fullPath
            const fileName = Date.now() + "_" + Math.floor(1000 + Math.random() * 9000).toString() + "." + file.originalname.split('.').pop(); // Extracting file extension;
            const fullPath = `${folder}/${fileName}`;
            // Call the callback with the full path
            cb(null, fullPath);
        },
    }),
});

module.exports = {
    uploadImage
}