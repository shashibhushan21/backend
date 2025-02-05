import {ApiError} from "../utils/ApiError.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {

  //get user details from frontend
  //validate - not empty, email format, password 
  //check if user already exists
  //check for image, check avatar
  //uplod then to cloudinary, avtar
  // create user object - create entry in db
  // remove password and return token field from response
  //check for user creation
  //return success response

  const {fullName, email, username, password} = req.body;
    console.log(fullName, email, username, password);

    // if(!fullName || !email || !username || !password){
    //     res.status(400);
    //     throw new Error("All fields are required");
    // }
    if(
        [fullName, email, username, password].some((field)=>
            field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required");
    }

   const existingUser = await User.findOne({
        $or:[
            {email},
            {username}
        ]
    })
    if(existingUser){
        throw new ApiError(409, "User already exists");
    }
    
   const avtarLocalPath = req.files?.avatar[0]?.path;

  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avtarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }
 const avatar = await uploadOnCloudinary(avtarLocalPath);
 const coverImage = await uploadOnCloudinary(coverImageLocalPath);

 if (!avatar) {
    throw new ApiError(400, "Avatar upload failed");
}

const user = await User.create({
    fullName,
    avtar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
})

const createdUser = await user.findById(user._id).select(
    "-password -refreshToken"
)

if (!createdUser) {
    throw new ApiError(500, "Somthing went wrong User creation failed");
}

return res.status(201).json(
    new ApiResponse(200, createdUser, 
    "User created successfully"));

// user.findByIdAndUpdate(user._id, {
//     $set: {
//         watchHistory: []
//     }
})



export { registerUser }