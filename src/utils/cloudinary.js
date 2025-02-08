import { v2 as cloudinary } from "cloudinary";

import fs from "fs";



cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        // Upload file on cloudinary
        const responce = await cloudinary.uploader.upload
        (localFilePath, {
            resource_type: "auto",
        })
        //file has been uploaded successfully
        // console.log("File uploaded on cloudinary",
        //     responce.url);
        fs.unlinkSync(localFilePath); // delete locally saved temporary file
        return responce
        // console.log(responce);
    }
    catch (error) {
        fs.unlinkSync(localFilePath); // delete locally saved temporary file as the uplod operation got failed
        return null;
    }
}
// export default uploadOnCloudinary;

export { uploadOnCloudinary }