import React, { useState, useEffect, useRef, useContext } from "react";
import { ShopContext } from "../context/ShopContext";
import { fetchProducts } from "../utils/fetchProducts";
import { products as fallbackProducts } from "../assets/assets.js";
import { queryLocalAi } from "../utils/aiKnowledge";
import voiceAi from "../utils/voiceAi";
import AiChatProductCard from "./AiChatProductCard";
import ReactMarkdown from "react-markdown";
import axios from "axios";
import {
  Sparkles,
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  ShoppingBag,
  ArrowRight,
  Square,
  MessageCircle,
  Truck,
  Headphones,
  Tag,
  Copy,
  Check,
  CheckCircle2,
  Phone,
  Mail,
  Clock,
  ShieldCheck,
  SlidersHorizontal,
  Play
} from "lucide-react";

const STORAGE_KEY = "stylenest_ai_chat_history_v2";
const VOICE_PREF_KEY = "stylenest_ai_voice_enabled";

const INITIAL_MESSAGE = {
  id: "welcome-msg",
  sender: "assistant",
  text: `Hello! I'm your **StyleNest Personal Stylist & Shopping Concierge**.\n\nI can recommend matching outfits, pick sizes and add to cart, check live order delivery status, share active promo coupons, or connect you directly with our customer support team.\n\n*What can I help you find today?*`,
  products: [],
  suggestedQuestions: [
    "Find the Right Product",
    "Track My Order",
    "Customer Support Team",
    "Active Promo Codes",
    "Size & Fit Guide"
  ],
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
};

const AiChatWidget = () => {
  const { backendUrl, cartItems, currency } = useContext(ShopContext);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      // Clear legacy storage from older versions
      localStorage.removeItem("stylenest_ai_chat_history");
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [INITIAL_MESSAGE];
  });

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    return localStorage.getItem(VOICE_PREF_KEY) === "true";
  });
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [currentVoiceName, setCurrentVoiceName] = useState(() => voiceAi.selectedVoiceName || "");
  const [currentSpeed, setCurrentSpeed] = useState(() => voiceAi.speechRate || 1.0);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const [catalog, setCatalog] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load products catalog for in-chat search & recommendations
  useEffect(() => {
    let isMounted = true;
    const loadCatalog = async () => {
      try {
        if (backendUrl) {
          const fetched = await fetchProducts(backendUrl, 1, 60);
          if (isMounted && fetched && fetched.length > 0) {
            setCatalog(fetched);
            return;
          }
        }
      } catch (err) {}
      if (isMounted) {
        setCatalog(fallbackProducts || []);
      }
    };

    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, [backendUrl]);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  // Persist voice preference
  useEffect(() => {
    localStorage.setItem(VOICE_PREF_KEY, String(voiceEnabled));
    if (!voiceEnabled) {
      voiceAi.stopSpeaking();
      setIsSpeaking(false);
    }
  }, [voiceEnabled]);

  // Load and listen to available browser voices
  useEffect(() => {
    const updateVoices = () => {
      const list = voiceAi.getAvailableVoices();
      setAvailableVoices(list);
      if (!currentVoiceName && list.length > 0) {
        const best = voiceAi.getBestVoice();
        if (best) setCurrentVoiceName(best.name);
      }
    };

    updateVoices();

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
      };
    }
  }, [currentVoiceName]);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen, interimTranscript]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen]);

  // Listen to open-ai-stylist global events
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-ai-stylist", handleOpen);
    return () => window.removeEventListener("open-ai-stylist", handleOpen);
  }, []);

  // Handle Speech-to-Text Voice Input
  const toggleVoiceInput = () => {
    if (isListening) {
      voiceAi.stopListening();
      setIsListening(false);
      setInterimTranscript("");
      return;
    }

    voiceAi.stopSpeaking();
    setIsSpeaking(false);
    setInterimTranscript("");

    const started = voiceAi.startListening({
      onInterim: (text) => {
        setInterimTranscript(text);
        setInputText(text);
      },
      onFinal: (text) => {
        setInterimTranscript("");
        setInputText(text);
        setIsListening(false);
        handleSendMessage(text);
      },
      onError: () => {
        setIsListening(false);
        setInterimTranscript("");
      },
      onEnd: () => {
        setIsListening(false);
        setInterimTranscript("");
      }
    });

    if (started) {
      setIsListening(true);
    }
  };

  // Speak AI reply
  const speakMessage = (text) => {
    if (!voiceEnabled) return;
    voiceAi.speak(text, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  const [copiedCode, setCopiedCode] = useState(null);

  const handleCopyCoupon = (code) => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code);
      }
    } catch (e) {}
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleStopSpeech = () => {
    voiceAi.stopSpeaking();
    setIsSpeaking(false);
  };

  const handleSelectVoice = (name) => {
    setCurrentVoiceName(name);
    voiceAi.setVoice(name);
  };

  const handleSelectSpeed = (speed) => {
    setCurrentSpeed(speed);
    voiceAi.setRate(speed);
  };

  const handlePreviewVoice = (name) => {
    setIsPreviewing(true);
    voiceAi.previewVoice(name, () => {
      setIsPreviewing(false);
    });
  };

  // Send message
  const handleSendMessage = async (rawText) => {
    const textToSend = (rawText !== undefined ? rawText : inputText).trim();
    if (!textToSend || isTyping) return;

    setInputText("");
    setInterimTranscript("");
    if (isListening) {
      voiceAi.stopListening();
      setIsListening(false);
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      let responseData = null;

      const historyContext = messages.slice(-10).map((m) => ({
        role: m.sender,
        content: m.text,
        products: m.products || []
      }));

      // Try Backend AI Endpoint first
      if (backendUrl) {
        try {
          const res = await axios.post(
            `${backendUrl}/api/ai/chat`,
            {
              message: textToSend,
              history: historyContext,
              cartItems,
              clientProducts: catalog.slice(0, 40)
            },
            { timeout: 8000 }
          );

          if (res.data && res.data.success) {
            responseData = res.data;
          }
        } catch (apiErr) {
          // graceful fallback
        }
      }

      // Local smart engine fallback with conversation history
      if (!responseData) {
        responseData = queryLocalAi({
          message: textToSend,
          history: historyContext,
          catalog,
          cartItems
        });
      }

      const botMessage = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        text: responseData.reply,
        products: responseData.products || [],
        suggestedQuestions: responseData.suggestedQuestions || [],
        orderData: responseData.orderData || null,
        supportData: responseData.supportData || null,
        couponData: responseData.couponData || null,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);

      if (!isOpen) {
        setUnreadCount((c) => c + 1);
      }

      if (voiceEnabled) {
        speakMessage(responseData.reply);
      }
    } catch (err) {
      const errorMessage = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        text: "I'm having trouble connecting right now, but you can explore our latest collection or check your Cart anytime!",
        products: [],
        suggestedQuestions: ["Show Best Sellers", "Return Policy", "Shipping Info"],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChatHistory = () => {
    voiceAi.stopSpeaking();
    setIsSpeaking(false);
    setMessages([INITIAL_MESSAGE]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none">
      {/* Sleek Floating Launcher */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 bg-neutral-950 hover:bg-black text-white px-4 py-3 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.3)] transition-all duration-300 hover:scale-105 active:scale-95 border border-neutral-800"
          aria-label="Open StyleNest AI Stylist"
        >
          <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-white">
            <Sparkles className="w-3.5 h-3.5 text-neutral-200 group-hover:rotate-12 transition-transform" />
          </div>

          <div className="flex flex-col text-left pr-1">
            <span className="text-xs font-medium tracking-tight text-white leading-tight">
              AI Stylist
            </span>
            <span className="text-[10px] text-neutral-400 font-normal leading-tight">
              Concierge
            </span>
          </div>

          {/* Unread badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-neutral-900 text-white text-[10px] font-semibold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Main Chat Window */}
      {isOpen && (
        <div className="w-[94vw] sm:w-[420px] h-[610px] max-h-[86vh] bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] flex flex-col border border-neutral-200/90 overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95">
          {/* Minimalist Luxury Header */}
          <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-neutral-100">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-full bg-neutral-950 flex items-center justify-center text-white shadow-xs">
                <span className="font-serif font-bold text-xs tracking-tight">SN</span>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-neutral-900 tracking-tight">
                    StyleNest Stylist
                  </h3>
                </div>
                <p className="text-[11px] text-neutral-400 font-normal">
                  Personal Fashion & Shopping AI
                </p>
              </div>
            </div>

            {/* Header Tools */}
            <div className="flex items-center gap-1 text-neutral-400">
              {/* Voice Read Aloud Toggle */}
              <button
                type="button"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                title={voiceEnabled ? "Voice narration active (Click to mute)" : "Voice narration off (Click to unmute)"}
                className={`p-2 rounded-full transition-colors ${
                  voiceEnabled
                    ? "text-neutral-900 bg-neutral-100"
                    : "text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Voice & Speech Settings Toggle */}
              <button
                type="button"
                onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                title="Voice & Speech Settings"
                className={`p-2 rounded-full transition-colors ${
                  showVoiceSettings
                    ? "text-neutral-900 bg-neutral-100"
                    : "text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              {/* Reset / Clear Chat */}
              <button
                type="button"
                onClick={clearChatHistory}
                title="Restart conversation"
                className="p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  voiceAi.stopSpeaking();
                  setIsSpeaking(false);
                  setIsOpen(false);
                }}
                title="Close Assistant"
                className="p-2 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 transition-colors ml-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Natural Voice & Speech Settings Drawer */}
          {showVoiceSettings && (
            <div className="bg-neutral-50 border-b border-neutral-200/80 px-4 py-3 animate-in slide-in-from-top-2 text-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-200/60">
                <div className="flex items-center gap-1.5 font-medium text-neutral-800">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Speech & Voice Customization</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVoiceSettings(false)}
                  className="text-neutral-400 hover:text-neutral-700 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {/* Voice Selection */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1">
                    <span>Natural Voice Model</span>
                    <span className="text-[10px] text-neutral-400">Browser Native</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={currentVoiceName}
                      onChange={(e) => handleSelectVoice(e.target.value)}
                      className="flex-1 bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 font-medium focus:outline-none focus:border-neutral-900 shadow-2xs"
                    >
                      {availableVoices.length > 0 ? (
                        availableVoices.map((v) => (
                          <option key={v.name} value={v.name}>
                            {v.name} ({v.tag})
                          </option>
                        ))
                      ) : (
                        <option value="">Default High-Fidelity Voice</option>
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={() => handlePreviewVoice(currentVoiceName)}
                      disabled={isPreviewing}
                      title="Preview Voice Sample"
                      className="flex items-center gap-1 bg-neutral-900 hover:bg-black text-white px-2.5 py-1.5 rounded-lg font-medium text-[11px] shadow-2xs transition disabled:opacity-50"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isPreviewing ? "Playing" : "Preview"}</span>
                    </button>
                  </div>
                </div>

                {/* Speed Controls */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-neutral-500">Speaking Pace</span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: "0.9x", val: 0.9 },
                      { label: "1.0x (Natural)", val: 1.0 },
                      { label: "1.1x", val: 1.1 }
                    ].map((rate) => (
                      <button
                        key={rate.val}
                        type="button"
                        onClick={() => handleSelectSpeed(rate.val)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition ${
                          currentSpeed === rate.val
                            ? "bg-neutral-900 text-white shadow-2xs"
                            : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                        }`}
                      >
                        {rate.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Speaking Status Pill */}
          {isSpeaking && (
            <div className="bg-neutral-900 text-white px-4 py-2 text-xs flex items-center justify-between transition-all">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 h-3">
                  <span className="w-0.5 h-full bg-white animate-voice-1 rounded-full" />
                  <span className="w-0.5 h-full bg-white animate-voice-2 rounded-full" />
                  <span className="w-0.5 h-full bg-white animate-voice-3 rounded-full" />
                  <span className="w-0.5 h-full bg-white animate-voice-4 rounded-full" />
                </div>
                <span className="text-[11px] font-medium text-neutral-200">
                  Stylist is speaking...
                </span>
              </div>
              <button
                type="button"
                onClick={handleStopSpeech}
                className="text-[10px] uppercase tracking-wider font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition"
              >
                <Square className="w-2.5 h-2.5 fill-current" />
                Stop
              </button>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 bg-neutral-50/40">
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      isUser
                        ? "bg-neutral-900 text-white rounded-br-xs shadow-xs"
                        : "bg-white text-neutral-800 border border-neutral-200/70 rounded-tl-xs shadow-xs"
                    }`}
                  >
                    <div className="prose prose-xs max-w-none prose-p:my-1 prose-headings:my-1.5 prose-headings:font-semibold prose-ul:my-1.5 prose-li:my-0.5">
                      <ReactMarkdown
                        components={{
                          a: ({ node, ...props }) => (
                            <a
                              {...props}
                              className="text-neutral-950 underline font-semibold hover:text-neutral-600"
                            />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong
                              {...props}
                              className={isUser ? "text-white font-semibold" : "text-neutral-950 font-semibold"}
                            />
                          )
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>

                    {/* Metadata & Controls */}
                    <div
                      className={`text-[10px] mt-2 flex items-center justify-between ${
                        isUser ? "text-neutral-400" : "text-neutral-400"
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => speakMessage(msg.text)}
                          title="Listen to this message"
                          className="hover:text-neutral-700 transition p-0.5 ml-2"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Attached Live Order Tracking Card */}
                  {!isUser && msg.orderData && (
                    <div className="w-full mt-3 bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center">
                            <Truck className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium">Order Number</span>
                            <p className="text-xs font-semibold text-neutral-900 leading-none">{msg.orderData.orderId}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                          {msg.orderData.status}
                        </span>
                      </div>

                      {/* 4-step Stepper */}
                      <div className="py-3.5">
                        <div className="flex items-center justify-between relative px-2">
                          <div className="absolute left-6 right-6 top-2.5 h-0.5 bg-neutral-100 -z-0" />
                          <div 
                            className="absolute left-6 top-2.5 h-0.5 bg-neutral-900 transition-all duration-500 -z-0"
                            style={{ width: `${((msg.orderData.currentStep || 3) - 1) / 3 * 75}%` }}
                          />
                          {["Placed", "Confirmed", "Shipped", "Out for Delivery"].map((stepLabel, sIdx) => {
                            const stepNum = sIdx + 1;
                            const isDone = stepNum < (msg.orderData.currentStep || 3);
                            const isCurrent = stepNum === (msg.orderData.currentStep || 3);
                            return (
                              <div key={sIdx} className="flex flex-col items-center relative z-10">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all ${
                                  isDone 
                                    ? "bg-neutral-900 text-white" 
                                    : isCurrent 
                                    ? "bg-neutral-900 text-white ring-4 ring-neutral-200" 
                                    : "bg-white border-2 border-neutral-200 text-neutral-400"
                                }`}>
                                  {isDone ? <Check className="w-2.5 h-2.5" /> : stepNum}
                                </div>
                                <span className={`text-[9px] mt-1 font-medium ${isCurrent ? "text-neutral-900 font-semibold" : "text-neutral-400"}`}>
                                  {stepLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Order Details Footer */}
                      <div className="bg-neutral-50 rounded-xl p-2.5 text-[11px] space-y-1 text-neutral-600 border border-neutral-100">
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400">Carrier:</span>
                          <span className="font-medium text-neutral-800">{msg.orderData.courier}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400">Estimated Delivery:</span>
                          <span className="font-semibold text-neutral-900">{msg.orderData.estimatedArrival}</span>
                        </div>
                        {msg.orderData.itemSummary && (
                          <div className="flex items-center justify-between pt-1 border-t border-neutral-200/60 text-[10px] text-neutral-500">
                            <span>Item:</span>
                            <span className="truncate max-w-[200px]">{msg.orderData.itemSummary}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 text-right">
                        <a
                          href="/orders"
                          className="text-[11px] font-medium text-neutral-900 hover:text-neutral-600 underline inline-flex items-center gap-1"
                        >
                          Track full history in Orders <ArrowRight className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Attached Customer Support Concierge Card */}
                  {!isUser && msg.supportData && (
                    <div className="w-full mt-3 bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-medium text-xs">
                              SJ
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-semibold text-neutral-900">{msg.supportData.agentName}</h4>
                              <span className="text-[9px] bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded font-medium">Advisor</span>
                            </div>
                            <p className="text-[10px] text-neutral-400">{msg.supportData.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {msg.supportData.waitTime}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <a
                          href={`tel:${msg.supportData.phone.replace(/[^0-9+]/g, '')}`}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-black text-white text-[11px] font-medium transition shadow-xs"
                        >
                          <Phone className="w-3 h-3" /> Call Concierge
                        </a>
                        <a
                          href={`mailto:${msg.supportData.email}?subject=Customer%20Support%20Inquiry`}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-medium transition border border-neutral-200/60"
                        >
                          <Mail className="w-3 h-3" /> Email Team
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Attached Promo Coupons Card */}
                  {!isUser && msg.couponData && Array.isArray(msg.couponData) && msg.couponData.length > 0 && (
                    <div className="w-full mt-3 space-y-2">
                      <span className="text-[11px] font-semibold text-neutral-800 flex items-center gap-1.5 px-1">
                        <Tag className="w-3.5 h-3.5 text-neutral-900" />
                        Available Promotional Offers
                      </span>
                      <div className="space-y-2">
                        {msg.couponData.map((c, cIdx) => {
                          const isCopied = copiedCode === c.code;
                          return (
                            <div
                              key={cIdx}
                              className="bg-white border-2 border-dashed border-neutral-200 hover:border-neutral-400 rounded-xl p-3 flex items-center justify-between gap-2 transition"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-neutral-900 tracking-wider bg-neutral-100 px-2 py-0.5 rounded">
                                    {c.code}
                                  </span>
                                  <span className="text-[10px] font-semibold bg-neutral-950 text-white px-2 py-0.5 rounded-full">
                                    {c.discount}
                                  </span>
                                </div>
                                <p className="text-[10px] text-neutral-500 mt-1">{c.desc} • <span className="text-neutral-400">{c.minSpend}</span></p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyCoupon(c.code)}
                                className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all ${
                                  isCopied
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-neutral-900 hover:bg-black text-white active:scale-95 shadow-xs"
                                }`}
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3 h-3" /> Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" /> Copy
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Attached In-Chat Product Cards */}
                  {!isUser && msg.products && msg.products.length > 0 && (
                    <div className="w-full mt-3">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-[11px] font-semibold text-neutral-800 flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5 text-neutral-900" />
                          Curated Items ({msg.products.length})
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          Select size & add directly
                        </span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-3 pt-1 custom-scrollbar snap-x">
                        {msg.products.map((prod) => (
                          <div key={prod._id} className="snap-start">
                            <AiChatProductCard product={prod} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Question Chips */}
                  {!isUser && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5 max-w-[95%]">
                      {msg.suggestedQuestions.map((q, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(q)}
                          className="text-[11px] font-medium bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200/80 px-3 py-1.5 rounded-full shadow-2xs transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          <span>{q}</span>
                          <ArrowRight className="w-2.5 h-2.5 text-neutral-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 bg-white border border-neutral-200/70 rounded-2xl rounded-tl-xs px-4 py-3 max-w-[140px] shadow-xs">
                <span className="text-xs text-neutral-400 font-medium">Styling</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Live Voice Input Modal Card (Appears smoothly when mic is active) */}
          {isListening && (
            <div className="px-4 py-3 bg-neutral-900 text-white border-t border-neutral-800 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="flex items-center gap-0.5 h-4 flex-shrink-0">
                  <span className="w-1 h-full bg-white animate-voice-1 rounded-full" />
                  <span className="w-1 h-full bg-white animate-voice-2 rounded-full" />
                  <span className="w-1 h-full bg-white animate-voice-3 rounded-full" />
                  <span className="w-1 h-full bg-white animate-voice-4 rounded-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-neutral-200">
                    Listening to your voice...
                  </p>
                  <p className="text-[11px] text-neutral-400 truncate">
                    {interimTranscript || "Speak your query (e.g. 'Show men jackets')..."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    voiceAi.stopListening();
                    setIsListening(false);
                    if (interimTranscript) handleSendMessage(interimTranscript);
                  }}
                  className="bg-white hover:bg-neutral-100 text-neutral-900 text-xs font-semibold px-3 py-1.5 rounded-full transition"
                >
                  Send
                </button>
                <button
                  type="button"
                  onClick={() => {
                    voiceAi.stopListening();
                    setIsListening(false);
                    setInterimTranscript("");
                  }}
                  className="text-neutral-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Clean Input Toolbar */}
          <div className="p-3.5 bg-white border-t border-neutral-100">
            <div className="flex items-center gap-2 bg-neutral-100/80 hover:bg-neutral-100 focus-within:bg-white focus-within:border-neutral-900 focus-within:ring-2 focus-within:ring-neutral-900/5 rounded-full p-1.5 pl-3 border border-transparent transition-all">
              {/* Mic Button */}
              <button
                type="button"
                onClick={toggleVoiceInput}
                title={isListening ? "Stop listening" : "Tap to speak your query"}
                className={`p-2 rounded-full transition-all ${
                  isListening
                    ? "bg-neutral-900 text-white animate-pulse"
                    : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60"
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about styles, sizes, or store policies..."
                className="flex-1 bg-transparent text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none py-1"
              />

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isTyping}
                title="Send Message"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  inputText.trim() && !isTyping
                    ? "bg-neutral-900 text-white hover:bg-black active:scale-95 shadow-xs"
                    : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Micro-Pills */}
            <div className="mt-2.5 flex items-center justify-between px-1 text-[10px] text-neutral-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                StyleNest Concierge
              </span>
              <span>Free Voice & Chat</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiChatWidget;
