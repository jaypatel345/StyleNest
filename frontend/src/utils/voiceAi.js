/**
 * Voice AI Utility using Web Speech API (100% Free, Zero Setup, Browser-Native)
 * Handles Speech-to-Text (STT) and Text-to-Speech (TTS)
 */

class VoiceAiService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isSpeaking = false;
    this.speechSynthesis = typeof window !== "undefined" ? window.speechSynthesis : null;
    this.hasRecognitionSupport = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    this.hasSynthesisSupport = typeof window !== "undefined" && Boolean(window.speechSynthesis);

    if (this.hasRecognitionSupport) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";
    }
  }

  /**
   * Start listening to user voice input
   * @param {Object} options
   * @param {Function} options.onInterim - Called with live partial transcript
   * @param {Function} options.onFinal - Called with completed final transcript
   * @param {Function} options.onError - Called on error
   * @param {Function} options.onEnd - Called when recognition stops
   */
  startListening({ onInterim, onFinal, onError, onEnd }) {
    if (!this.hasRecognitionSupport || !this.recognition) {
      if (onError) onError(new Error("Voice recognition is not supported in this browser. Try Chrome, Edge, or Safari."));
      return false;
    }

    try {
      this.recognition.abort(); // Cancel any existing session
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

  /**
   * Cleans markdown characters and emojis from text for smooth natural speech
   */
  cleanTextForSpeech(text) {
    if (!text) return "";
    return text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) -> text
      .replace(/[#*_`~>]/g, "") // remove markdown formatting symbols
      .replace(/[\u{1F600}-\u{1F6FF}|[\u{1F300}-\u{1F5FF}|[\u{1F900}-\u{1F9FF}|[\u{2600}-\u{26FF}]/gu, "") // emojis
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Speak text out loud using natural browser voice
   */
  speak(text, { onStart, onEnd, onError } = {}) {
    if (!this.hasSynthesisSupport || !this.speechSynthesis) return;

    // Stop any ongoing speech
    this.stopSpeaking();

    const clean = this.cleanTextForSpeech(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "en-US";
    utterance.rate = 1.05; // slightly faster natural conversational rate
    utterance.pitch = 1.0;

    // Choose the best voice available
    const voices = this.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha") || v.name.includes("Daniel") || v.name.includes("Ava")) && 
      v.lang.startsWith("en")
    ) || voices.find(v => v.lang.startsWith("en"));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    utterance.onerror = (err) => {
      this.isSpeaking = false;
      if (onError) onError(err);
    };

    this.speechSynthesis.speak(utterance);
  }

  stopSpeaking() {
    if (this.speechSynthesis) {
      try {
        this.speechSynthesis.cancel();
      } catch (e) {}
      this.isSpeaking = false;
    }
  }
}

export const voiceAi = new VoiceAiService();
export default voiceAi;
