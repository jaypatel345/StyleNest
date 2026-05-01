import express from "express";
import {
  loginUser,
  registerUser,
  adminLogin,
} from "../controllers/userController.js";
import { rateLimiter } from "../middleware/rateLimiter.js";
import { ipKey } from "../middleware/keyGenerators.js";

const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", rateLimiter(ipKey), loginUser);
userRouter.post("/admin", adminLogin);

export default userRouter;
