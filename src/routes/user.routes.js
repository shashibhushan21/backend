import {Router} from 'express';
import { 
    changeCurrentPassword, 
    getCurrentUser, 
    getUserChannelProfile, 
    getWatchHistory, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    registerUser, 
    updateAccountDetails, 
    updateAvtar, 
    updateCoverImage 
} from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: 'avtar',
            maxCount: 2
        },
        {
            name: 'coverImage',
            maxCount: 2
        },
    ]),
    registerUser
);

router.route("/login").post(loginUser);

//secured routes
router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/change-password").post(verifyJWT, changeCurrentPassword);

router.route("/current-user").get(verifyJWT,getCurrentUser);

router.route("/update-acount").patch(verifyJWT,updateAccountDetails);

router.route("/avtar").patch(verifyJWT,upload.single ('avtar'),updateAvtar);

router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateCoverImage);

router.route("/c/:username").get(verifyJWT,getUserChannelProfile);

router.route("/history").get(verifyJWT,getWatchHistory);

export default router;