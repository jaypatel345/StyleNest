/**
 * High-Quality Natural Voice AI Service using Web Speech API
 * 100% Free, Zero Setup, Browser-Native with Neural Voice Ranking & Conversational Cadence
 */

// Filter out macOS & Windows archaic/robotic novelty voices
const ROBOTIC_VOICE_NAMES = new Set([
  "albert",
  "bad news",
  "bahh",
  "bells",
  "boing",
  "bubbles",
  "cellos",
  "fred",
  "good news",
  "jester",
  "junior",
  "kathy",
  "organ",
  "superstar",
  "ralph",
  "trinoids",
  "whisper",
  "wobble",
  "zarvox",
  "deranged",
  "hysterical",
  "pipe organ"
]);

// Preference ranking patterns for natural human voices
const NATURAL_VOICE_PATTERNS = [
  // Tier 1: Modern Neural Web Voices (Chrome & Edge)
  { pattern: /microsoft.*(natural|online)/i, weight: 100, tag: "Neural Natural" },
  { pattern: /google.*(natural|neural)/i, weight: 95, tag: "Google Neural" },
  { pattern: /google.*(us|uk).*english/i, weight: 90, tag: "Google Natural" },

  // Tier 2: Apple Siri & Premium / Enhanced Voices (macOS / iOS)
  { pattern: /samantha.*(premium|enhanced)/i, weight: 88, tag: "Apple Premium" },
  { pattern: /ava.*(premium|enhanced)/i, weight: 87, tag: "Apple Premium" },
  { pattern: /allison.*(premium|enhanced)/i, weight: 86, tag: "Apple Premium" },
  { pattern: /daniel.*(premium|enhanced)/i, weight: 85, tag: "Apple Premium" },
  { pattern: /zoe.*(premium|enhanced)/i, weight: 84, tag: "Apple Premium" },
  { pattern: /siri/i, weight: 83, tag: "Apple Siri" },

  // Tier 3: Apple High-Fidelity Standard Voices
  { pattern: /samantha/i, weight: 80, tag: "Warm Stylist" },
  { pattern: /daniel/i, weight: 78, tag: "British Sophisticated" },
  { pattern: /karen/i, weight: 75, tag: "Australian Concierge" },
  { pattern: /serena/i, weight: 74, tag: "UK Elegant" },
  { pattern: /kate/i, weight: 73, tag: "Natural Modern" },
  { pattern: /ava/i, weight: 72, tag: "Natural Warm" },
  { pattern: /allison/i, weight: 71, tag: "Natural Clear" },
  { pattern: /oliver/i, weight: 70, tag: "UK Polished" },
  { pattern: /moira/i, weight: 68, tag: "Irish Warm" },
  { pattern: /tessa/i, weight: 67, tag: "South African Natural" },
  { pattern: /fiona/i, weight: 66, tag: "Scottish Clear" }
];

class VoiceAiService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isSpeaking = false;
    this.speechSynthesis = typeof window !== "undefined" ? window.speechSynthesis : null;
    this.hasRecognitionSupport = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    this.hasSynthesisSupport = typeof window !== "undefined" && Boolean(window.speechSynthesis);

    this.voices = [];
    this.selectedVoiceName = typeof window !== "undefined" ? localStorage.getItem("stylenest_voice_name") || null : null;
    this.speechRate = typeof window !== "undefined" ? parseFloat(localStorage.getItem("stylenest_voice_rate") || "1.0") : 1.0;
    this.speechPitch = 1.0;
    this.sentenceQueue = [];
    this.isQueueProcessing = false;
    this.currentCallbacks = null;

    if (this.hasRecognitionSupport) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";
    }

    if (this.hasSynthesisSupport) {
      this.initVoices();
    }
  }

  /**
   * Preload and cache browser voices
   */
  initVoices() {
    if (!this.speechSynthesis) return;

    const loadVoices = () => {
      try {
        const available = this.speechSynthesis.getVoices() || [];
        if (available && available.length > 0) {
          this.voices = available;
        }
      } catch (e) {}
    };

    loadVoices();
    if (this.speechSynthesis.onvoiceschanged !== undefined) {
      this.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  /**
   * Returns filtered, scored, high-quality voices available on the user's device
   */
  getAvailableVoices() {
    if (!this.speechSynthesis) return [];
    const rawVoices = this.voices.length > 0 ? this.voices : (this.speechSynthesis.getVoices() || []);

    const filtered = rawVoices.filter((v) => {
      const nameLower = (v.name || "").toLowerCase();
      const isEnglish = (v.lang || "").toLowerCase().startsWith("en");
      if (!isEnglish) return false;
      for (const robotName of ROBOTIC_VOICE_NAMES) {
        if (nameLower.startsWith(robotName) || nameLower === robotName) {
          return false;
        }
      }
      return true;
    });

    // Score and rank
    const scored = filtered.map((v) => {
      let score = 10;
      let tag = "Standard Voice";
      for (const item of NATURAL_VOICE_PATTERNS) {
        if (item.pattern.test(v.name)) {
          score = item.weight;
          tag = item.tag;
          break;
        }
      }
      return {
        voice: v,
        name: v.name,
        lang: v.lang,
        score,
        tag,
        isDefault: v.default
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  /**
   * Selects the single highest quality natural voice
   */
  getBestVoice() {
    const list = this.getAvailableVoices();
    if (list.length === 0) return null;

    if (this.selectedVoiceName) {
      const userChoice = list.find((item) => item.name === this.selectedVoiceName);
      if (userChoice) return userChoice.voice;
    }

    // Default to the highest scored natural voice
    return list[0].voice;
  }

  /**
   * Sets preferred voice by name and persists to localStorage
   */
  setVoice(voiceName) {
    this.selectedVoiceName = voiceName;
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("stylenest_voice_name", voiceName);
      }
    } catch (e) {}
  }

  /**
   * Sets speaking rate (e.g. 0.95 to 1.1)
   */
  setRate(rate) {
    const num = Math.min(Math.max(rate, 0.8), 1.3);
    this.speechRate = num;
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("stylenest_voice_rate", String(num));
      }
    } catch (e) {}
  }

  /**
   * Preview a voice with a warm, natural stylist greeting
   */
  previewVoice(voiceName, onEnd) {
    const originalVoice = this.selectedVoiceName;
    this.selectedVoiceName = voiceName;
    this.speak(
      "Hello! I'm your StyleNest fashion concierge. I can recommend outfits, check sizes, and track your orders.",
      {
        onEnd: () => {
          this.selectedVoiceName = originalVoice;
          if (onEnd) onEnd();
        }
      }
    );
  }

  /**
   * Formats raw markdown & e-commerce text into smooth, human conversational speech
   */
  cleanTextForSpeech(text) {
    if (!text) return "";

    let cleaned = text
      // Strip markdown links [Text](/url) -> Text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove URLs
      .replace(/https?:\/\/\S+/gi, "")
      // Convert headings ### Title -> Title.
      .replace(/#{1,6}\s*(.+)/g, "$1.")
      // Convert bullet points - Item -> Item.
      .replace(/^[\s*-]+\s*(.+)/gm, "$1.")
      // Remove bold/italic markdown characters
      .replace(/[*_~`]/g, "")
      // Expand common currency symbols into spoken words
      .replace(/\$(\d+)/g, "$1 dollars")
      // Expand tracking codes e.g. SN-88421 -> S N 8 8 4 2 1
      .replace(/\bSN-(\d{4,6})\b/g, (match, digits) => {
        return "S N " + digits.split("").join(" ");
      })
      // Expand phone numbers e.g. +1-212-456-7890
      .replace(/\+?1-212-456-7890/g, "1 2 1 2, 4 5 6, 7 8 9 0")
      // Expand percent
      .replace(/(\d+)%/g, "$1 percent")
      // Remove emojis
      .replace(/[\u{1F600}-\u{1F6FF}|[\u{1F300}-\u{1F5FF}|[\u{1F900}-\u{1F9FF}|[\u{2600}-\u{26FF}]/gu, "")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      .trim();

    // If text contains a long list of items, condense to avoid 2-minute robotic monologue
    if (cleaned.length > 280) {
      // Find the first 2-3 natural sentences
      const sentences = cleaned.split(/(?<=[.?!])\s+/);
      if (sentences.length > 3) {
        cleaned = sentences.slice(0, 3).join(" ");
        if (!cleaned.endsWith(".")) cleaned += ".";
      }
    }

    return cleaned;
  }

  /**
   * Speak text out loud using the selected or highest-ranked natural human voice.
   * Splits into natural sentence chunks to eliminate Chrome's 15-second speech cutoff bug.
   */
  speak(text, { onStart, onEnd, onError } = {}) {
    if (!this.hasSynthesisSupport || !this.speechSynthesis) return;

    // Cancel any current audio
    this.stopSpeaking();

    const cleaned = this.cleanTextForSpeech(text);
    if (!cleaned) return;

    // Split text into natural sentence chunks for human-like breath pacing
    const rawSentences = cleaned.split(/(?<=[.?!;:])\s+/).filter(s => s && s.trim().length > 0);
    if (rawSentences.length === 0) return;

    this.sentenceQueue = rawSentences;
    this.currentCallbacks = { onStart, onEnd, onError };
    this.isSpeaking = true;

    if (onStart) onStart();
    this.processQueue();
  }

  /**
   * Internal queue processor for chained natural sentences
   */
  processQueue() {
    if (!this.sentenceQueue || this.sentenceQueue.length === 0) {
      this.isSpeaking = false;
      if (this.currentCallbacks?.onEnd) {
        this.currentCallbacks.onEnd();
      }
      return;
    }

    const nextSentence = this.sentenceQueue.shift();
    const utterance = new SpeechSynthesisUtterance(nextSentence);

    // Tune natural conversational cadence
    utterance.lang = "en-US";
    utterance.rate = this.speechRate; // 1.0 is optimal for natural human pacing
    utterance.pitch = this.speechPitch;

    const chosenVoice = this.getBestVoice();
    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    utterance.onend = () => {
      // Brief natural pause (80ms) between sentences
      setTimeout(() => {
        if (this.isSpeaking) {
          this.processQueue();
        }
      }, 80);
    };

    utterance.onerror = (err) => {
      console.warn("[VoiceAI] utterance error:", err);
      if (this.currentCallbacks?.onError) {
        this.currentCallbacks.onError(err);
      }
      this.stopSpeaking();
    };

    try {
      this.speechSynthesis.speak(utterance);
    } catch (e) {
      this.stopSpeaking();
    }
  }

  /**
   * Stop speaking and clear all pending queue sentences
   */
  stopSpeaking() {
    this.sentenceQueue = [];
    this.isSpeaking = false;
    if (this.speechSynthesis) {
      try {
        this.speechSynthesis.cancel();
      } catch (e) {}
    }
  }

  /**
   * Start listening to user voice input via Web Speech API
   */
  startListening({ onInterim, onFinal, onError, onEnd }) {
    if (!this.hasRecognitionSupport || !this.recognition) {
      if (onError) onError(new Error("Voice recognition is not supported in this browser. Try Chrome, Edge, or Safari."));
      return false;
    }

    try {
      this.recognition.abort();
    } catch (e) {}

    let finalTranscript = "";

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interim += transcript;
        }
      }

      if (onInterim && interim) {
        onInterim(interim);
      }
      if (onFinal && finalTranscript.trim()) {
        onFinal(finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      console.warn("[VoiceAI] recognition error:", event.error);
      if (onError) onError(event);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onEnd) onEnd(finalTranscript.trim());
    };

    try {
      this.recognition.start();
      return true;
    } catch (err) {
      console.warn("[VoiceAI] start error:", err);
      if (onError) onError(err);
      return false;
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isListening = false;
    }
  }
}

export const voiceAi = new VoiceAiService();
export default voiceAi;
