import express from "express";
import { chatWithAi, getAiStatus } from "../controllers/aiController.js";
import { handleTts, getTtsVoices } from "../controllers/ttsController.js";

const aiRouter = express.Router();

aiRouter.post("/chat", chatWithAi);
aiRouter.get("/status", getAiStatus);
aiRouter.get("/tts", handleTts);
aiRouter.post("/tts", handleTts);
aiRouter.get("/tts/voices", getTtsVoices);

export default aiRouter;
