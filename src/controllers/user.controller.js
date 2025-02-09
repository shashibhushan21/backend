import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
// import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Token generation failed");
    }
}

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

    const { fullName, email, username, password } = req.body;
    // console.log(fullName, email, username, password);

    // if(!fullName || !email || !username || !password){
    //     res.status(400);
    //     throw new Error("All fields are required");
    // }
    if (
        [fullName, email, username, password].some((field) =>
            field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existingUser = await User.findOne({
        $or: [
            { email },
            { username }
        ]
    })
    if (existingUser) {
        throw new ApiError(409, "User already exists");
    }

    const avtarLocalPath = req.files?.avtar[0]?.path;

    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    //   console.log("localPath",avtarLocalPath, coverImageLocalPath);
    if (!avtarLocalPath) {
        throw new ApiError(400, "Avtar file is required");
    }
    const avtar = await uploadOnCloudinary(avtarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    //  console.log("after uplod cloudinary",avtar, coverImage);
    if (!avtar) {
        throw new ApiError(400, "Avtar upload failed");
    }

    const user = await User.create({
        fullName,
        avtar: avtar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    })
    // console.log("user", user);

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Somthing went wrong User creation failed");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser,
            "User created successfully"));


})

const loginUser = asyncHandler(async (req, res) => {

    //ewq body -> data -> email, password
    //get email and password from frontend
    //validate email and password
    //check if user exists
    //compare password
    //generate token
    //return token
    //return success response

    const { email, username, password } = req.body;
    ///email or username dono cahiye to...
    // if(!email && !username){
    //     throw new ApiError(400, "Email or username are required");
    // }

    if (!(username || email)) {
        throw new ApiError(400, "Email or username are required");
    }

    const user = await User.findOne({
        $or: [
            { email: email },
            { username: username }
        ]
    })

    if (!user) {
        throw new ApiError(404, "User dose not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }

    const { refreshToken, accessToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly: true,
        secure: true,
    }
    return res.status(200).cookie
        ("accessToken", accessToken, options).cookie
        ("refreshToken", refreshToken, options).json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User logged in successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
        //    $set: {
        //         refreshToken: null,
        //     } 
            //// ya to upar wala ya niche wala koi bhi ek

            $unset:{
                refreshToken: 1
            }

        }, {
        new: true
    }
    )
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .clearCookie("accessToken", "", options)
        .clearCookie("refreshToken", "", options)
        .json(new ApiResponse(200, {}, "User logged Out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }
    const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    )

    try {
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "INvalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }

        const option = {
            httpOnly: true,
            secure: true,
        }
        const { accessToken, newrefreshToken } = await generateAccessAndRefreshToken(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, option)
            .cookie("refreshToken", newrefreshToken, option)
            .json(new ApiResponse(200,
                { accessToken, refreshToken: newrefreshToken }, "Access token generated successfully"))
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

// const changeCurrentPassword = asyncHandler(async (req, res) => {
//     const { oldPassword, newPassword } = req.body

//     const user = await User.findById(req.user._id)

//     const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

//     if (!isPasswordCorrect) {
//         throw new ApiError(401, "Invalid old password")
//     }

//     user.password = newPassword
//     // user.password = await bcrypt.hash(newPassword, 10);
//     await user.save({ validateBeforeSave: false });

//     return res.status(200)
//         .json(new ApiResponse(200, {}, "Password changed successfully"))

// })

const changeCurrentPassword = asyncHandler(async(req, res) => {
    try {
            const {oldPassword, newPassword} = req.body
    
            // 1. Validate input
            if (!oldPassword || !newPassword) {
                throw new ApiError(400, "Both old and new passwords are required");
            }
            
            // 2. Find user
            const user = await User.findById(req.user?._id)
    
            // 3. Verify old password
            const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
        
            if (!isPasswordCorrect) {
                throw new ApiError(400, "Invalid old Password")
            }
            
    
            // 4. Update password
            user.password = newPassword
            await user.save({validateBeforeSave: false})
        
            return res
            .status(200)
            .json(new ApiResponse(200, {}, "Password changed Successfully"))
    } catch (error) {
        throw new ApiError(400, error?.message || "Password change failed")
    }
    })

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
    return res
        .status(200)
        .json(new ApiResponse(200, user, "current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email, phonenumber } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "fullName and email are required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email,

            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateAvtar = asyncHandler(async (req, res) => {
    const avtarLocalPath = req.file?.path
    console.log(avtarLocalPath)
    if (!avtarLocalPath) {
        throw new ApiError(400, "Avtar is missing")
    }

    const avtar = await uploadOnCloudinary(avtarLocalPath)

    if (!avtar.url) {
        throw new ApiError(400, "Error while uploding on Avtar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id, {
        $set: {
            avtar: avtar.url
        }
    }, {
        new: true
    }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avtar updated successfully"))
})

// const updateAvtar = asyncHandler(async(req, res) => {
    
//     const avatarLocalPath = req.file?.path
    
//     if(!avatarLocalPath) {
//         throw new ApiError(400, "Avatar file is missing")
//     }

//     const avatar = await uploadOnCloudinary(avatarLocalPath)

//     if (!avatar.url) {
//         throw new ApiError(400, "Error while uploading on cloudinary")
//     }

//     const user = await User.findByIdAndUpdate(
//         req.user?._id,
//         {
//             $set:{
//                 avatar: avatar.url
//             }
//         },
//         {new: true}
//     ).select("-password")

//     return res 
//     .status(200)
//     .json(
//         new ApiResponse(200, user, "Avatar updated successfully")
//     )


// })


const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploding on CoberImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id, {
        $set: {
            coverImage: coverImage.url
        }
    }, {
        new: true
    }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "User cover Image updated successfully")
        )

})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: " subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avtar: 1,
                coverImage: 1,
                email: 1,
            }
        }
    ])

    console.log("cannel value", channel)

    if (!channel?.length) {
        throw new ApiError(404, "Channel dose not found");
    }

    return res.status(200).json(new ApiResponse(200, channel[0], "User Channel fetched successfully"))


})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avtar: 1,
                                        coverImage: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:
                        {
                            owner: {
                                $first: "$owner",
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(new ApiResponse (200,user[0].getWatchHistory, 
        "Watch History Retrieved Successfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvtar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory,
}