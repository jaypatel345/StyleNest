/**
 * Premium Natural Voice AI Service for StyleNest
 * Uses Free Studio-Quality Neural Voices (Microsoft Edge Neural Engine)
 * with multi-tier fallbacks (Google TTS & Web Speech API).
 * 100% Free, zero paid subscription required.
 */

// Premium Studio Neural Voices available through the backend streaming API
export const NEURAL_VOICES = [
  {
    id: "en-US-AriaNeural",
    name: "Aria (Natural Studio Stylist)",
    tag: "Studio Neural",
    description: "Ultra-natural, warm luxury fashion stylist (Recommended)",
    isNeural: true
  },
  {
    id: "en-US-JennyNeural",
    name: "Jenny (Warm Conversational)",
    tag: "Studio Neural",
    description: "Friendly, natural shopping companion",
    isNeural: true
  },
  {
    id: "en-US-GuyNeural",
    name: "Guy (Modern Executive)",
    tag: "Studio Neural",
    description: "Polished, crisp contemporary male stylist",
    isNeural: true
  },
  {
    id: "en-GB-SoniaNeural",
    name: "Sonia (British Luxury Concierge)",
    tag: "Studio Neural",
    description: "Sophisticated British concierge tone",
    isNeural: true
  },
  {
    id: "en-US-ChristopherNeural",
    name: "Christopher (Polished Gentleman)",
    tag: "Studio Neural",
    description: "Refined, calm masculine narration",
    isNeural: true
  },
  {
    id: "google-natural",
    name: "Google Assistant (Clear Natural)",
    tag: "Google Cloud",
    description: "Clean, familiar Google assistant voice",
    isNeural: true
  }
];

class VoiceAiService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isSpeaking = false;
    this.currentAudio = null;
    this.backendUrl =
      typeof window !== "undefined" && window.location.hostname.includes("localhost")
        ? "http://localhost:4000"
        : "https://style-nest-backend-seven.vercel.app";

    this.speechSynthesis = typeof window !== "undefined" ? window.speechSynthesis : null;
    this.hasRecognitionSupport = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    this.hasSynthesisSupport = typeof window !== "undefined" && Boolean(window.speechSynthesis);

    this.selectedVoiceId = typeof window !== "undefined" ? localStorage.getItem("stylenest_voice_id") || "en-US-AriaNeural" : "en-US-AriaNeural";
    this.speechSpeed = typeof window !== "undefined" ? parseFloat(localStorage.getItem("stylenest_voice_speed") || "1.0") : 1.0;
    this.currentCallbacks = null;

    if (this.hasRecognitionSupport) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";
    }
  }

  setBackendUrl(url) {
    if (url) {
      this.backendUrl = url.replace(/\/+$/, "");
    }
  }

  getAvailableVoices() {
    return NEURAL_VOICES;
  }

  getSelectedVoice() {
    const match = NEURAL_VOICES.find(v => v.id === this.selectedVoiceId);
    return match || NEURAL_VOICES[0];
  }

  setVoice(voiceId) {
    this.selectedVoiceId = voiceId;
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("stylenest_voice_id", voiceId);
      }
    } catch (e) {}
  }

  setSpeed(speed) {
    const num = Math.min(Math.max(speed, 0.8), 1.25);
    this.speechSpeed = num;
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("stylenest_voice_speed", String(num));
      }
    } catch (e) {}
  }

  /**
   * Formats raw markdown & e-commerce text into smooth, human conversational speech
   */
  cleanTextForSpeech(text) {
    if (!text) return "";

    let cleaned = text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // markdown links
      .replace(/https?:\/\/\S+/gi, "") // urls
      .replace(/#{1,6}\s*(.+)/g, "$1.") // headings
      .replace(/^[\s*-]+\s*(.+)/gm, "$1.") // bullet points
      .replace(/[*_~`]/g, "") // styling symbols
      .replace(/\$(\d+)/g, "$1 dollars") // currency
      .replace(/\bSN-(\d{4,6})\b/g, (m, d) => "S N " + d.split("").join(" ")) // tracking code
      .replace(/\+?1-212-456-7890/g, "1 2 1 2, 4 5 6, 7 8 9 0")
      .replace(/(\d+)%/g, "$1 percent")
      .replace(/[\u{1F600}-\u{1F6FF}|[\u{1F300}-\u{1F5FF}|[\u{1F900}-\u{1F9FF}|[\u{2600}-\u{26FF}]/gu, "")
      .replace(/\s+/g, " ")
      .trim();

    // Condense long lists into 2-3 natural sentences
    if (cleaned.length > 280) {
      const sentences = cleaned.split(/(?<=[.?!])\s+/);
      if (sentences.length > 3) {
        cleaned = sentences.slice(0, 3).join(" ");
        if (!cleaned.endsWith(".")) cleaned += ".";
      }
    }

    return cleaned.slice(0, 380);
  }

  /**
   * Speak text out loud using Studio Neural Audio
   */
  speak(text, { onStart, onEnd, onError, voiceId, speed } = {}) {
    this.stopSpeaking();

    const cleaned = this.cleanTextForSpeech(text);
    if (!cleaned) return;

    const chosenVoice = voiceId || this.selectedVoiceId || "en-US-AriaNeural";
    const chosenSpeed = speed || this.speechSpeed || 1.0;

    this.currentCallbacks = { onStart, onEnd, onError };
    this.isSpeaking = true;

    // Convert speed float to Edge TTS rate string (+10%, +0%, -10%)
    let rateStr = "+0%";
    if (chosenSpeed >= 1.08) rateStr = "+10%";
    else if (chosenSpeed <= 0.92) rateStr = "-10%";

    // Handle Google Natural Voice
    if (chosenVoice === "google-natural") {
      this.playGoogleTts(cleaned);
      return;
    }

    // Determine Backend TTS API URL
    const baseUrl =
      this.backendUrl ||
      (typeof window !== "undefined" && window.location.hostname.includes("localhost")
        ? "http://localhost:4000"
        : "https://style-nest-backend-seven.vercel.app");
    if (baseUrl) {
      const ttsUrl = `${baseUrl}/api/ai/tts?text=${encodeURIComponent(cleaned)}&voice=${encodeURIComponent(chosenVoice)}&rate=${encodeURIComponent(rateStr)}`;
      this.playAudioUrl(ttsUrl, cleaned);
      return;
    }

    // Direct Google Fallback if no backend configured
    this.playGoogleTts(cleaned);
  }

  /**
   * Plays streaming audio from URL
   */
  playAudioUrl(url, originalText) {
    try {
      const audio = new Audio(url);
      this.currentAudio = audio;
      audio.playbackRate = this.speechSpeed;

      audio.onplay = () => {
        this.isSpeaking = true;
        if (this.currentCallbacks?.onStart) this.currentCallbacks.onStart();
      };

      audio.onended = () => {
        this.isSpeaking = false;
        this.currentAudio = null;
        if (this.currentCallbacks?.onEnd) this.currentCallbacks.onEnd();
      };

      audio.onerror = (e) => {
        console.warn("[VoiceAI] Neural audio load failed, falling back to Google TTS:", e);
        this.playGoogleTts(originalText);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("[VoiceAI] Audio autoplay prevented or error:", err);
          this.playGoogleTts(originalText);
        });
      }
    } catch (e) {
      this.playGoogleTts(originalText);
    }
  }

  /**
   * Google Translate TTS fallback (100% Free public audio stream)
   */
  playGoogleTts(text) {
    try {
      const chunk = text.slice(0, 180);
      const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=en&client=tw-ob`;
      const audio = new Audio(googleUrl);
      this.currentAudio = audio;
      audio.playbackRate = this.speechSpeed;

      audio.onplay = () => {
        this.isSpeaking = true;
        if (this.currentCallbacks?.onStart) this.currentCallbacks.onStart();
      };

      audio.onended = () => {
        this.isSpeaking = false;
        this.currentAudio = null;
        if (this.currentCallbacks?.onEnd) this.currentCallbacks.onEnd();
      };

      audio.onerror = (e) => {
        console.warn("[VoiceAI] Google TTS failed, falling back to Web Speech:", e);
        this.playWebSpeech(text);
      };

      const p = audio.play();
      if (p !== undefined) {
        p.catch(() => this.playWebSpeech(text));
      }
    } catch (e) {
      this.playWebSpeech(text);
    }
  }

  /**
   * Web Speech API ultimate fallback
   */
  playWebSpeech(text) {
    if (!this.hasSynthesisSupport || !this.speechSynthesis) {
      this.isSpeaking = false;
      if (this.currentCallbacks?.onEnd) this.currentCallbacks.onEnd();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = this.speechSpeed;

      utterance.onstart = () => {
        this.isSpeaking = true;
        if (this.currentCallbacks?.onStart) this.currentCallbacks.onStart();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        if (this.currentCallbacks?.onEnd) this.currentCallbacks.onEnd();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        if (this.currentCallbacks?.onError) this.currentCallbacks.onError();
      };

      this.speechSynthesis.speak(utterance);
    } catch (e) {
      this.isSpeaking = false;
    }
  }

  /**
   * Stop all active speaking audio
   */
  stopSpeaking() {
    this.isSpeaking = false;

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }

    if (this.speechSynthesis) {
      try {
        this.speechSynthesis.cancel();
      } catch (e) {}
    }
  }

  /**
   * Preview voice sample
   */
  previewVoice(voiceId, onEnd) {
    this.speak(
      "Hello! I am your StyleNest fashion concierge. I can recommend outfits, check sizes, and track your orders.",
      {
        voiceId: voiceId || this.selectedVoiceId,
        onEnd: () => {
          if (onEnd) onEnd();
        }
      }
    );
  }

  /**
   * Speech-to-Text Voice Recognition
   */
  startListening({ onInterim, onFinal, onError, onEnd }) {
    if (!this.hasRecognitionSupport || !this.recognition) {
      if (onError) onError(new Error("Voice input is not supported in this browser. Try Chrome, Edge, or Safari."));
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
