import {Router} from 'express';
import { registerUser } from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';


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

export default router;