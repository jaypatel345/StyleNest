import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export const ALLOWED_VOICES = {
  "en-US-AriaNeural": { name: "Aria", tag: "Natural Studio Stylist", gender: "Female" },
  "en-US-JennyNeural": { name: "Jenny", tag: "Warm Conversational", gender: "Female" },
  "en-US-GuyNeural": { name: "Guy", tag: "Modern Executive", gender: "Male" },
  "en-GB-SoniaNeural": { name: "Sonia", tag: "British Luxury Concierge", gender: "Female" },
  "en-US-ChristopherNeural": { name: "Christopher", tag: "Polished Gentleman", gender: "Male" }
};

const cleanTextForTts = (text) => {
  if (!text) return "";
  let cleaned = text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // markdown links
    .replace(/https?:\/\/\S+/gi, "") // urls
    .replace(/#{1,6}\s*(.+)/g, "$1.") // headers
    .replace(/^[\s*-]+\s*(.+)/gm, "$1.") // bullet points
    .replace(/[*_~`]/g, "") // formatting symbols
    .replace(/\$(\d+)/g, "$1 dollars") // currency
    .replace(/\bSN-(\d{4,6})\b/g, (m, d) => "S N " + d.split("").join(" ")) // order ID
    .replace(/\+?1-212-456-7890/g, "1 2 1 2, 4 5 6, 7 8 9 0") // phone
    .replace(/(\d+)%/g, "$1 percent")
    .replace(/[\u{1F600}-\u{1F6FF}|[\u{1F300}-\u{1F5FF}|[\u{1F900}-\u{1F9FF}|[\u{2600}-\u{26FF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  // Condense long lists/monologues to first 2-3 natural sentences
  if (cleaned.length > 320) {
    const sentences = cleaned.split(/(?<=[.?!])\s+/);
    if (sentences.length > 3) {
      cleaned = sentences.slice(0, 3).join(" ");
      if (!cleaned.endsWith(".")) cleaned += ".";
    }
  }

  return cleaned.slice(0, 420);
};

export const getTtsVoices = (req, res) => {
  const voiceList = Object.entries(ALLOWED_VOICES).map(([id, info]) => ({
    id,
    name: `${info.name} (${info.tag})`,
    tag: info.tag,
    gender: info.gender
  }));
  return res.json({ success: true, voices: voiceList });
};

export const handleTts = async (req, res) => {
  try {
    const rawText = req.query.text || req.body?.text || "";
    const requestedVoice = req.query.voice || req.body?.voice || "en-US-AriaNeural";
    const rateParam = req.query.rate || req.body?.rate || "+0%";

    const cleanText = cleanTextForTts(rawText);
    if (!cleanText) {
      return res.status(400).json({ success: false, message: "Text is required" });
    }

    const voice = ALLOWED_VOICES[requestedVoice] ? requestedVoice : "en-US-AriaNeural";

    let rate = "+0%";
    if (typeof rateParam === "string" && (rateParam.endsWith("%") || rateParam.startsWith("+") || rateParam.startsWith("-"))) {
      rate = rateParam;
    }

    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(cleanText, { rate });

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");

      audioStream.pipe(res);

      audioStream.on("error", (streamErr) => {
        console.warn("[TTS] Edge stream error:", streamErr?.message);
        if (!res.headersSent) {
          fallbackGoogleTts(cleanText, res);
        }
      });
      return;
    } catch (edgeErr) {
      console.warn("[TTS] Edge TTS error, trying Google fallback:", edgeErr?.message);
      return fallbackGoogleTts(cleanText, res);
    }
  } catch (error) {
    console.error("[TTS] General error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: "TTS failed" });
    }
  }
};

const fallbackGoogleTts = async (text, res) => {
  try {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.slice(0, 180))}&tl=en&client=tw-ob`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (!response.ok) {
      throw new Error(`Google TTS status ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.end(buffer);
  } catch (fallbackErr) {
    console.error("[TTS] Google fallback failed:", fallbackErr?.message);
    if (!res.headersSent) {
      return res.status(502).json({ success: false, message: "TTS services unavailable" });
    }
  }
};
