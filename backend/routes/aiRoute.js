import express from "express";
import { chatWithAi, getAiStatus } from "../controllers/aiController.js";

const aiRouter = express.Router();

aiRouter.post("/chat", chatWithAi);
aiRouter.get("/status", getAiStatus);

export default aiRouter;
