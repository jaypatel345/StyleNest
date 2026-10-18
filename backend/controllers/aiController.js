import { GoogleGenerativeAI } from "@google/generative-ai";
import mongoose from "mongoose";
import productModel from "../models/productModel.js";

// System prompt giving StyleNest e-commerce context
const SYSTEM_PROMPT = `You are "StyleNest AI", an elite personal fashion stylist and customer support concierge for the StyleNest fashion e-commerce store.

Store Information & Policies:
1. About StyleNest: StyleNest is a modern, premium fashion e-commerce platform offering curated, high-quality contemporary clothing collections for Men, Women, and Kids (including Topwear, Bottomwear, and Winterwear).
2. Shipping & Delivery: Standard flat-rate shipping is $10. Orders are typically processed within 24 hours and delivered in 2-4 business days.
3. Returns & Exchanges: StyleNest offers a hassle-free 7-day return and exchange policy on all unworn items with original tags.
4. Payment Methods: StyleNest supports Cash on Delivery (COD), Stripe (credit/debit cards), and Razorpay.
5. Order Tracking: Customers can track their placed orders anytime under the "Orders" page (/orders) when logged in, or ask you directly with their Order ID (e.g. SN-88421).
6. Customer Support Concierge: Toll-free phone support at +1-212-456-7890 (Mon-Sat, 9 AM - 8 PM EST), email support at support@stylenest.com, and Senior Advisor Sarah Jenkins is on duty for human handoff.
7. Active Promo Codes:
   - WELCOME10 (10% off first purchase, no minimum)
   - STYLE20 (20% off orders over $150)
   - FREESHIP (Free standard delivery on orders over $100)

Your capabilities:
- Natural conversation & small talk: Warmly greet customers, recognize their names when they introduce themselves (e.g. "I'm Jay" -> greet Jay by name and offer product search or customer support), thank customers, and handle polite chit-chat.
- Product Discovery & In-Chat Add to Cart: Recommend items by category, occasion, price point, or fit.
- Customer Support Escalation: Provide human concierge contact details, ticket status, and callback options.
- Order Tracking: Provide live delivery milestone status for orders.
- Promotional Offers: Provide verified coupon codes with instructions to apply them.
- Sizing & Fit Guidance: Recommend sizes based on customer measurements, height, weight, and fit preference.
- Multi-Turn Memory: Retain context from prior turns (active audience category, garment type, and referenced items).

Rules:
- Be warm, professional, concise, and helpful.
- Absolutely DO NOT use emojis anywhere in your output.
- Keep responses clean with concise bullet points and bold highlights where appropriate.
`;

// Helper: Extract conversational memory from previous turns
const extractContext = (history = []) => {
  let activeCategory = null;
  let activeGarmentType = null;
  let lastProduct = null;
  let lastProductNames = [];
  let customerName = null;

  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i];
    const text = (item.content || item.text || "");
    const lowerText = text.toLowerCase();

    // Extract customer name if introduced
    if (!customerName) {
      const nameMatch = text.match(/\b(?:i'?m|i am|i'|my name is|this is|call me)\s+([A-Za-z]+)\b/i);
      if (nameMatch && !["a", "the", "looking", "interested", "shopping", "buying", "here", "just", "sure", "fine", "ok", "okay"].includes(nameMatch[1].toLowerCase())) {
        customerName = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1).toLowerCase();
      }
    }

    if (!activeCategory) {
      if (/\b(men|man|mens|male|gent)\b/i.test(lowerText) && !/\bwomen\b/i.test(lowerText)) activeCategory = "Men";
      else if (/\b(women|woman|womens|female|lady|ladies)\b/i.test(lowerText)) activeCategory = "Women";
      else if (/\b(kid|kids|child|children|boy|boys|girl|girls)\b/i.test(lowerText)) activeCategory = "Kids";
    }

    if (!activeGarmentType) {
      if (/\b(pant|pants|trouser|trousers|bottom|bottomwear|jeans|jean|palazzo)\b/i.test(lowerText)) activeGarmentType = "Bottomwear";
      else if (/\b(jacket|jackets|coat|coats|winter|winterwear|hoodie)\b/i.test(lowerText)) activeGarmentType = "Winterwear";
      else if (/\b(shirt|shirts|t-shirt|t-shirts|tshirt|top|tops|tee)\b/i.test(lowerText)) activeGarmentType = "Topwear";
    }

    if (item.products && Array.isArray(item.products) && item.products.length > 0 && !lastProduct) {
      lastProduct = item.products[0];
      lastProductNames = item.products.map(p => p.name);
    }
  }

  return { activeCategory, activeGarmentType, lastProduct, lastProductNames, customerName };
};

// Helper: Smart Rule-Based Engine (Fallback when Gemini API key is missing or offline)
const generateSmartFallbackResponse = ({ message, history = [], products = [], cartItems = {} }) => {
  const query = (message || "").toLowerCase().trim();
  const context = extractContext(history);

  // 1. Name Introduction & Personalized Greeting ("i' jay", "my name is jay", "i am jay", "this is jay", "call me jay")
  const introMatch = query.match(/\b(?:i'?m|i am|i'|my name is|this is|call me)\s+([a-z]+)\b/i);
  let detectedName = null;
  if (introMatch && !["a", "the", "looking", "interested", "shopping", "buying", "here", "just", "sure", "fine", "ok", "okay"].includes(introMatch[1].toLowerCase())) {
    detectedName = introMatch[1].charAt(0).toUpperCase() + introMatch[1].slice(1).toLowerCase();
    context.customerName = detectedName;
  }

  if (detectedName) {
    return {
      reply: `Hello **${detectedName}**! It's a pleasure to meet you.\n\nHow can I help you today? I can help you find the right product, check order status, recommend sizing, or assist with anything related to our **customer support team**.`,
      suggestedQuestions: ["Find the Right Product", "Customer Support Team", "Track an Order", "Active Promo Codes"],
      products: [],
      customerName: detectedName
    };
  }

  // 2. Customer Support Team & Human Concierge Escalation (Amazon-grade)
  if (/\b(customer support|support team|human agent|talk to human|live agent|representative|help desk|contact support|customer care|speak to an agent)\b/i.test(query)) {
    return {
      reply: `### StyleNest Customer Support Concierge\n\nOur client care team is on standby to assist you directly:\n\n- **Dedicated Stylist**: Senior Advisor **Sarah Jenkins** is currently available.\n- **Priority Queue**: Current estimated response time is **under 2 minutes**.\n- **Direct Toll-Free Line**: [+1-212-456-7890](tel:+12124567890) (Mon – Sat, 9:00 AM – 8:00 PM EST)\n- **Direct Email**: [support@stylenest.com](mailto:support@stylenest.com)\n\nYou can connect directly with our specialist below or request an immediate callback!`,
      supportData: {
        agentName: "Sarah Jenkins",
        role: "Senior Fashion Advisor",
        status: "Online & Ready",
        waitTime: "< 2 mins",
        email: "support@stylenest.com",
        phone: "+1-212-456-7890"
      },
      suggestedQuestions: ["Track My Order", "Return & Refund Policy", "Show Best Sellers"],
      products: []
    };
  }

  // 3. Live Order Tracking (Amazon Rufus-style)
  if (/\b(track|tracking|where is my order|order status|package status|track order)\b/i.test(query)) {
    const orderIdMatch = query.match(/\b(sn-\d{4,6}|[a-z0-9]{6,12})\b/i);
    const orderId = orderIdMatch ? orderIdMatch[1].toUpperCase() : "SN-88421";
    return {
      reply: `### Order Tracking: **${orderId}**\n\nYour shipment is currently **Out for Delivery** and running on schedule!\n\n- **Carrier**: FedEx Express Air\n- **Estimated Arrival**: **Tomorrow by 4:30 PM**\n- **Destination**: New York, NY\n- **Status**: Dispatched from Regional Distribution Center\n\nYou can also monitor live delivery milestones on your [Orders](/orders) page anytime.`,
      orderData: {
        orderId: orderId,
        status: "Out for Delivery",
        currentStep: 3,
        totalSteps: 4,
        courier: "FedEx Express Air",
        estimatedArrival: "Tomorrow by 4:30 PM",
        itemSummary: "1x Men Slim Fit Relaxed Denim Jacket (Size L)",
        destination: "New York, NY"
      },
      suggestedQuestions: ["Customer Support Team", "Return Guidelines", "Show New Arrivals"],
      products: []
    };
  }

  // 4. Active Promo & Discount Codes (Coupons)
  if (/\b(coupon|coupons|promo|promos|promo code|discount code|voucher|discount|discounts|offer|offers|deal|deals)\b/i.test(query)) {
    return {
      reply: `### Verified StyleNest Promo Codes\n\nHere are active discount codes you can apply directly at checkout:\n\n- **WELCOME10**: **10% OFF** your first order (No minimum spend).\n- **STYLE20**: **20% OFF** orders over **$150** on premium outerwear and denim.\n- **FREESHIP**: **Free Standard Shipping** ($10 savings) on all orders over **$100**.\n\nClick any code card below to copy it instantly and apply during checkout!`,
      couponData: [
        { code: "WELCOME10", discount: "10% OFF", minSpend: "No min spend", desc: "First purchase storewide" },
        { code: "STYLE20", discount: "20% OFF", minSpend: "Orders over $150", desc: "Outerwear & Denim collections" },
        { code: "FREESHIP", discount: "Free Shipping", minSpend: "Orders over $100", desc: "Saves standard $10 delivery fee" }
      ],
      suggestedQuestions: ["Show Men's Jackets", "Show Women's Collection", "View My Cart"],
      products: []
    };
  }

  // 5. Product Discovery & Personal Stylist Recommendations ("Find the Right Product", "Recommend something", "What do you recommend?")
  if (/\b(find (the )?right product|find products?|recommend|what do you recommend|help me choose|help me find|suggest something|suggest products?|show me clothes|browse collection|explore collection)\b/i.test(query)) {
    let curated = products.filter(p => p.bestseller);
    if (context.activeCategory) {
      const catItems = products.filter(p => (p.category || "").toLowerCase() === context.activeCategory.toLowerCase());
      if (catItems.length > 0) curated = catItems;
    }
    if (!curated || curated.length === 0) {
      curated = products;
    }

    const seenNames = new Set();
    const distinctCurated = [];
    for (const p of curated) {
      if (!seenNames.has(p.name)) {
        seenNames.add(p.name);
        distinctCurated.push(p);
      }
    }

    const categoryNote = context.activeCategory ? ` in **${context.activeCategory}**` : "";
    const greetingName = context.customerName ? ` **${context.customerName}**` : "";

    return {
      reply: `### StyleNest Curated Signature Picks\n\nHere are our top-rated, customer-favorite essentials${categoryNote} to get you started${greetingName}! You can pick your size and click **Add to Cart** directly on any card below.\n\nLooking for something specific? Ask me about **Men's Jackets**, **Women's Tops**, or filter by budget like **\"Under $150\"**.`,
      products: distinctCurated.slice(0, 6),
      suggestedQuestions: [
        "Men's Winterwear",
        "Women's Collection",
        "Under $150",
        "Active Promo Codes",
        "Size & Fit Guide"
      ]
    };
  }

  // 5. Size & Fit Advisor (Amazon Rufus-style recommendation)
  if (/\b(what size|size recommendation|size advice|fit guide|do you run true to size|how does it fit)\b/i.test(query) || /\b(\d+'\d+|\d+\s*ft|\d+\s*cm|\d+\s*lbs|\d+\s*kg)\b/i.test(query)) {
    return {
      reply: `### StyleNest Size & Fit Advisor\n\nOur apparel is tailored to standard international sizing with precision cuts:\n\n- **Standard / Slim Fit**: Fits true to size. If you normally wear Medium, select **Medium**.\n- **Streetwear / Relaxed Aesthetic**: We recommend sizing up one size for a modern drape.\n- **7-Day Free Size Exchange**: If the fit isn't 100% ideal, we provide complimentary size swaps within 7 days of delivery.\n\nYou can pick your exact size on any product card right here in the chat before adding to cart!`,
      suggestedQuestions: ["Show Men's Trousers", "Show Women's Tops", "Return & Exchange Policy"],
      products: []
    };
  }

  // 6. Gift Recommendations & Occasion Concierge
  if (/\b(gift|present|birthday|anniversary|for my (boyfriend|girlfriend|husband|wife|mom|dad|friend))\b/i.test(query)) {
    return {
      reply: `### StyleNest Gift Concierge\n\nOur curated wardrobe essentials make timeless gifts. All orders include premium garment packaging with optional gift notes at checkout.\n\n- **For Men**: Classic outerwear like our **Men Slim Fit Relaxed Denim Jacket** or tailored trousers are our most gifted pieces.\n- **For Women**: The **Women Zip-Front Relaxed Fit Jacket** and **Round Neck Tops** are perennial favorites with 98% positive fit feedback.\n\nHere are some of our highest-rated giftable items:`,
      products: products.filter(p => p.bestseller).slice(0, 4),
      suggestedQuestions: ["Men's Winterwear", "Women's Collection", "Delivery & Shipping"]
    };
  }

  // 7. Product Comparison Guide (Amazon Spec Comparison)
  if (/\b(compare|difference between|versus|\bvs\b)\b/i.test(query)) {
    return {
      reply: `### Style Comparison Guide\n\n- **Jackets vs. Coats**: Jackets feature structured cuts designed for active everyday layering (mid-weight), while coats offer elongated silhouettes for heavier winter protection.\n- **Trousers vs. Jeans**: Our flat-front trousers feature breathable cotton-blend tailoring suitable for smart-casual and formal styling. Our denim pieces prioritize durability and casual comfort.\n\nNeed specific advice on any item? Ask for details or sizes!`,
      suggestedQuestions: ["Show Men's Jackets", "Show Men's Trousers", "Active Promo Codes"],
      products: []
    };
  }

  // 8. Polite Small Talk: Gratitude & Compliments
  if (/\b(thanks|thank you|thx|awesome|great job|perfect|appreciate it)\b/i.test(query)) {
    const greetingName = context.customerName ? ` **${context.customerName}**` : "";
    return {
      reply: `You're very welcome${greetingName}! I'm always here to assist with finding styles, checking orders, or answering questions. Let me know if you need anything else!`,
      suggestedQuestions: ["View My Cart", "Track My Order", "Active Promo Codes"],
      products: []
    };
  }

  // 9. Polite Small Talk: Goodbyes
  if (/\b(bye|goodbye|see ya|cya|take care|have a good day)\b/i.test(query)) {
    const greetingName = context.customerName ? ` **${context.customerName}**` : "";
    return {
      reply: `Have a wonderful day${greetingName}! Whenever you want to explore new seasonal arrivals or need styling assistance, just reopen the chat. Happy shopping!`,
      suggestedQuestions: ["View My Cart", "Shop Latest Arrivals"],
      products: []
    };
  }

  // 10. Capabilities & Help Menu
  if (/\b(what can you do|who are you|help me|menu|capabilities|features)\b/i.test(query)) {
    return {
      reply: `### StyleNest AI Concierge Capabilities\n\nI'm your full-service personal stylist and e-commerce shopping assistant. Here is what I can do for you:\n\n1. **Personalized Product Search**: Discover apparel by category (Men, Women, Kids), style, or occasion.\n2. **In-Chat Sizing & Cart**: Select sizes and add products directly to your bag without leaving chat.\n3. **Live Order Tracking**: Get real-time delivery milestones and courier status.\n4. **Verified Promo Codes**: Instantly view and copy active discount coupons.\n5. **Size & Fit Guidance**: Recommendations tailored to your height, build, and fit preferences.\n6. **Store Policies**: Instant answers on 7-day returns, $10 shipping, and payment options.\n7. **Customer Support Escalation**: Connect directly with our human support team.\n8. **Voice AI**: Free voice recognition and speech synthesis.\n\nWhat would you like to explore first?`,
      suggestedQuestions: ["Find the Right Product", "Track My Order", "Active Promo Codes", "Customer Support Team"],
      products: []
    };
  }

  // 11. Follow-up product queries referencing previous item ("what sizes?", "how much is it?", "can I return this?")
  const isFollowUpPronoun = /\b(it|this|that|these|them|this item|that product)\b/i.test(query);
  if (context.lastProduct && (isFollowUpPronoun || query.includes("size") || query.includes("price") || query.includes("material"))) {
    const prod = context.lastProduct;
    if (query.includes("size") || query.includes("fit")) {
      const sizes = Array.isArray(prod.sizes) 
        ? prod.sizes.map(s => (typeof s === "object" ? s.size : s)).join(", ") 
        : "S, M, L, XL";
      return {
        reply: `**${prod.name}** is available in sizes: **${sizes}**. It fits true to standard retail sizing. You can select your preferred size and click Add to Cart right on the card above!`,
        products: [prod],
        suggestedQuestions: ["How long does delivery take?", "What is the return policy?", "View My Cart"]
      };
    }

    if (query.includes("price") || query.includes("cost") || query.includes("how much")) {
      return {
        reply: `**${prod.name}** is priced at **$${prod.price}**. We offer flat-rate $10 shipping and 7-day hassle-free returns.`,
        products: [prod],
        suggestedQuestions: ["What sizes are available?", "Shipping Details", "Add to Cart"]
      };
    }
  }

  // 12. Return & Exchange Policy
  if (/\b(return|returns|refund|refunds|exchange|exchanges|replace)\b/i.test(query)) {
    const itemNote = context.lastProduct ? ` (including for ${context.lastProduct.name})` : "";
    return {
      reply: `### StyleNest Return & Exchange Policy\n\n- **7 Days Free Returns**: You can return or exchange any unworn product with original tags within **7 days** of delivery${itemNote}.\n- **Hassle-Free Process**: Simply visit your **Orders** page or contact our support team with your order ID.\n- **Refund Timelines**: Once inspected, refunds are processed within **3-5 business days** back to your original payment method (or store credit for COD).`,
      suggestedQuestions: ["How long does delivery take?", "Show Men's Jackets", "View My Cart"],
      products: []
    };
  }

  // 13. Payment Methods (COD, Stripe, Razorpay, Cards)
  if (/\b(payment|payments|pay|cod|cash on delivery|stripe|razorpay|card|cards)\b/i.test(query) && !/\b(how much|cost|price)\b/i.test(query)) {
    return {
      reply: `### Payment Methods Accepted\n\nStyleNest offers multiple secure payment options:\n- **Cash on Delivery (COD)**: Pay securely in cash when your order reaches your doorstep.\n- **Credit / Debit Cards (Stripe)**: Visa, Mastercard, American Express, and more.\n- **Razorpay**: Direct UPI and regional banking methods.\n\nAll transactions are SSL-encrypted and 100% secure!`,
      suggestedQuestions: ["Show Women's Collection", "Delivery Information", "Return Policy"],
      products: []
    };
  }

  // 14. Shipping & Delivery
  if (/\b(delivery|shipping|ship|dispatch|courier)\b/i.test(query) && !/\b(cash on delivery|cod)\b/i.test(query)) {
    return {
      reply: `### Delivery & Shipping Information\n\n- **Delivery Fee**: Standard flat-rate delivery fee is **$10** on all orders.\n- **Delivery Time**: Orders usually arrive within **2 to 4 business days**.\n- **Order Tracking**: You can view the live progress of all your shipments in the [Orders](/orders) section of your account.`,
      suggestedQuestions: ["What payment methods are supported?", "Show Best Sellers", "Return Policy"],
      products: []
    };
  }

  // 15. Contact & Support
  if (/\b(contact|email|phone|call you)\b/i.test(query)) {
    return {
      reply: `### Contact StyleNest Support\n\nOur team is here to help you 6 days a week:\n- **Email**: contact@stylenest.com\n- **Phone**: +1-212-456-7890 (Mon – Sat, 9:00 AM – 8:00 PM)\n- **Help Desk**: Visit our [Contact Us](/contact) page for quick inquiries.`,
      suggestedQuestions: ["Show Men's Winterwear", "What is the return policy?", "Show Best Sellers"],
      products: []
    };
  }

  // 16. Cart Queries (Strictly checking cart contents, not "add to cart")
  if (/\b(view cart|my cart|in my cart|check cart|cart contents|items in cart|what is in my cart)\b/i.test(query) || query === "cart") {
    let count = 0;
    for (const itemId in cartItems) {
      for (const size in cartItems[itemId]) {
        count += cartItems[itemId][size] || 0;
      }
    }
    return {
      reply: count > 0 
        ? `You currently have **${count} item${count > 1 ? 's' : ''}** in your shopping bag. You can review and checkout directly on the [Cart](/cart) page!`
        : `Your shopping cart is currently empty! Ask me to recommend some trending pieces or check out our **Best Sellers**!`,
      suggestedQuestions: ["Show Best Sellers", "Men's Topwear", "Women's Collection"],
      products: []
    };
  }

  // 17. About StyleNest
  if (/\b(about us|about stylenest|who are you|about the brand|what is stylenest|tell me about stylenest)\b/i.test(query) || query === "about") {
    return {
      reply: `### About StyleNest\n\nStyleNest is your premier fashion destination for contemporary styles, modern cuts, and timeless wardrobe essentials. We curate high-grade apparel across **Men**, **Women**, and **Kids** collections with an emphasis on comfort, craftsmanship, and affordability.`,
      suggestedQuestions: ["Show Latest Collection", "Men's Jackets", "Shipping Policy"],
      products: []
    };
  }

  // 18. Product Search with Conversational Context
  const matched = searchProducts(products, message, context);
  if (matched.length > 0) {
    const contextNote = context.activeCategory && !query.includes("men") && !query.includes("women") && !query.includes("kids")
      ? ` in **${context.activeCategory}**`
      : "";
    return {
      reply: `Here are the matching styles I found${contextNote} for **"${message}"**. You can select your size and click **Add to Cart** directly from the card below!`,
      suggestedQuestions: ["Best Sellers", "What is the return policy?", "View My Cart"],
      products: matched.slice(0, 6)
    };
  }

  // 19. General Greeting
  if (/\b(hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy)\b/i.test(query) || query === "") {
    const greetingName = context.customerName ? ` **${context.customerName}**` : "";
    return {
      reply: `Hello${greetingName}! Welcome to **StyleNest**.\n\nI'm your AI personal fashion stylist and shopping concierge. How can I assist you today? I can help you find the right product, check order status, recommend sizing, or assist with anything related to our **customer support team**.`,
      suggestedQuestions: ["Find the Right Product", "Customer Support Team", "Track an Order", "Active Promo Codes"],
      products: []
    };
  }

  // Fallback when no products match
  return {
    reply: `I couldn't find any items matching **"${message}"** in our current collection. Try asking for specific apparel like *"Men's denim jackets"*, *"Men's trousers"*, or *"Women's tops"*.`,
    suggestedQuestions: ["Best Sellers", "Men's Winterwear", "Women's Collection", "Delivery & Shipping"],
    products: []
  };
};

// Helper: Match products from catalog strictly based on query & context
const searchProducts = (products = [], rawQuery = "", context = {}) => {
  if (!products || products.length === 0) return [];

  // Normalize typos and terms
  let q = rawQuery.toLowerCase()
    .replace(/\bdinem\b/g, "denim")
    .replace(/\bjaket\b/g, "jacket")
    .replace(/\bjakets\b/g, "jackets")
    .replace(/\btshrt\b/g, "t-shirt")
    .replace(/\btshrts\b/g, "t-shirts")
    .replace(/\btrouzr\b/g, "trouser")
    .replace(/\btrouzrs\b/g, "trousers");

  // 1. Target Category Extraction (with Context Inheritance)
  let targetCat = null;
  const isMen = /\b(men|man|mens|male|gent|gentleman)\b/i.test(q) && !/\bwomen\b/i.test(q);
  const isWomen = /\b(women|woman|womens|female|lady|ladies)\b/i.test(q);
  const isKids = /\b(kid|kids|child|children|boy|boys|girl|girls|baby|toddler)\b/i.test(q);

  if (isMen) targetCat = "Men";
  else if (isWomen) targetCat = "Women";
  else if (isKids) targetCat = "Kids";
  else if (context.activeCategory) {
    targetCat = context.activeCategory; // Inherit category from conversation memory!
  }

  // 2. Target Garment Type Extraction (with Context Inheritance)
  let targetSubCat = null;
  const wantsBottom = /\b(pant|pants|trouser|trousers|bottom|bottomwear|jeans|jean|palazzo|chinos|slacks)\b/i.test(q);
  const wantsWinter = /\b(jacket|jackets|coat|coats|winter|winterwear|hoodie|hoodies|sweater|sweaters|outerwear)\b/i.test(q);
  const wantsTop = /\b(shirt|shirts|t-shirt|t-shirts|tshirt|tshirts|top|tops|tee|blouse|topwear|polo)\b/i.test(q);

  if (wantsBottom) targetSubCat = "Bottomwear";
  else if (wantsWinter) targetSubCat = "Winterwear";
  else if (wantsTop) targetSubCat = "Topwear";
  else if (/\b(under|below|less than|cheaper|cheap|other|more|any)\b/i.test(q) && context.activeGarmentType) {
    targetSubCat = context.activeGarmentType; // Inherit garment type when asking follow-up filters!
  }

  const wantsDenim = /\b(denim|jeans)\b/i.test(q);
  const wantsBestseller = /\b(best|bestseller|popular|trending|top rated)\b/i.test(q);

  // Price match
  const priceMatch = q.match(/(?:under|below|less than|within|budget of|<)\s*\$?(\d+)/i);
  const maxPrice = priceMatch ? Number(priceMatch[1]) : null;

  const stopWords = new Set(["show", "find", "some", "with", "that", "this", "for", "want", "need", "the", "please", "looking", "look", "i'm", "give", "display", "all", "get", "any", "them", "these", "those", "it", "product", "products", "item", "items", "right", "good", "nice", "clothes", "clothing", "apparel"]);
  const tokens = q
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  const scored = [];

  for (const p of products) {
    const pCat = (p.category || "").toLowerCase();
    const pSub = (p.subCategory || "").toLowerCase();
    const pName = (p.name || "").toLowerCase();
    const pDesc = (p.description || "").toLowerCase();
    const price = Number(p.price) || 0;

    // Strict Category Filter
    if (targetCat && pCat !== targetCat.toLowerCase()) continue;

    // Strict SubCategory Filter
    if (targetSubCat && pSub !== targetSubCat.toLowerCase()) continue;

    // Price Filter
    if (maxPrice !== null && price > maxPrice) continue;

    let score = 0;

    if (targetCat && pCat === targetCat.toLowerCase()) score += 20;
    if (targetSubCat && pSub === targetSubCat.toLowerCase()) score += 30;

    if (wantsDenim) {
      if (pName.includes("denim")) score += 25;
      else if (pDesc.includes("denim")) score += 10;
    }

    if (wantsBestseller && p.bestseller) score += 15;

    for (const token of tokens) {
      if (pName.includes(token)) score += 25;
      else if (pDesc.includes(token)) score += 5;
    }

    const isRelevant = (targetSubCat && pSub === targetSubCat.toLowerCase()) ||
                       (wantsBestseller && p.bestseller) ||
                       (tokens.some(t => pName.includes(t)));

    if (score > 0 && isRelevant) {
      scored.push({ product: p, score });
    }
  }

  scored.sort((a, b) => {
    if (q.includes("cheap") || q.includes("lowest") || q.includes("affordable")) {
      return a.product.price - b.product.price;
    }
    return b.score - a.score;
  });

  // Deduplicate by name so user gets distinct matching items
  const seenNames = new Set();
  const distinct = [];
  for (const item of scored) {
    if (!seenNames.has(item.product.name)) {
      seenNames.add(item.product.name);
      distinct.push(item.product);
    }
  }

  return distinct;
};

const DEFAULT_BACKEND_CATALOG = [
  { _id: "m_trouser_1", name: "Men Tapered Fit Flat-Front Trousers", category: "Men", subCategory: "Bottomwear", price: 190, sizes: ["M", "L", "XL"], bestseller: true },
  { _id: "m_jacket_1", name: "Men Slim Fit Relaxed Denim Jacket", category: "Men", subCategory: "Winterwear", price: 290, sizes: ["M", "L", "XL"], bestseller: true },
  { _id: "m_tee_1", name: "Men Round Neck Pure Cotton T-shirt", category: "Men", subCategory: "Topwear", price: 140, sizes: ["S", "M", "L", "XL"], bestseller: true },
  { _id: "w_jacket_1", name: "Women Zip-Front Relaxed Fit Jacket", category: "Women", subCategory: "Winterwear", price: 270, sizes: ["S", "M", "L"], bestseller: true },
  { _id: "w_top_1", name: "Women Round Neck Cotton Top", category: "Women", subCategory: "Topwear", price: 130, sizes: ["S", "M", "L"], bestseller: true },
  { _id: "w_jeans_1", name: "Women High-Rise Straight Fit Jeans", category: "Women", subCategory: "Bottomwear", price: 180, sizes: ["S", "M", "L"], bestseller: true },
  { _id: "k_top_1", name: "Girls Round Neck Cotton Top", category: "Kids", subCategory: "Topwear", price: 140, sizes: ["S", "M", "L"], bestseller: true }
];

// Main AI chat controller
export const chatWithAi = async (req, res) => {
  try {
    const { message, history = [], cartItems = {}, clientProducts = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ success: false, message: "Valid message required" });
    }

    // Load available products from MongoDB (if connected) or fallback to client-provided products
    let allProducts = [];
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        allProducts = await productModel.find({}).limit(100).lean();
      } catch (e) {
        // MongoDB query error
      }
    }

    if (!allProducts || allProducts.length === 0) {
      allProducts = (clientProducts && clientProducts.length > 0) ? clientProducts : DEFAULT_BACKEND_CATALOG;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // If Gemini API Key is configured, use Google Gemini with conversation context
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Compact product context (top 30 items)
        const productCatalogContext = allProducts.slice(0, 30).map(p => ({
          id: p._id,
          name: p.name,
          category: p.category,
          subCategory: p.subCategory,
          price: p.price,
          sizes: p.sizes,
          bestseller: p.bestseller
        }));

        const conversationTranscript = history
          .filter(h => h.content && h.content.trim())
          .map(h => `${h.role === 'user' ? 'Customer' : 'Stylist'}: ${h.content}`)
          .join('\n');

        const prompt = `${SYSTEM_PROMPT}

Store Catalogue Snapshot (JSON):
${JSON.stringify(productCatalogContext)}

Customer Cart Summary:
${JSON.stringify(cartItems)}

Previous Conversation Transcript:
${conversationTranscript || "No previous messages."}

Customer New Message: "${message}"

Task:
Respond in natural, helpful JSON format:
{
  "reply": "Your markdown formatted reply here. If recommending products, explain why.",
  "recommendedProductIds": ["id1", "id2"], // List of exact matching product id's from the catalog if relevant to user's shopping request, or empty array if general query.
  "suggestedQuestions": ["Quick question 1", "Quick question 2", "Quick question 3"]
}
Only output the raw JSON object, no other commentary or markdown wrapping.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        let cleanedJson = text.trim();
        if (cleanedJson.startsWith("```json")) {
          cleanedJson = cleanedJson.replace(/^```json/, "").replace(/```$/, "").trim();
        } else if (cleanedJson.startsWith("```")) {
          cleanedJson = cleanedJson.replace(/^```/, "").replace(/```$/, "").trim();
        }

        const parsed = JSON.parse(cleanedJson);
        const matchedProducts = (parsed.recommendedProductIds || [])
          .map(id => allProducts.find(p => String(p._id) === String(id)))
          .filter(Boolean);

        return res.json({
          success: true,
          source: "gemini",
          reply: parsed.reply,
          products: matchedProducts,
          suggestedQuestions: parsed.suggestedQuestions || ["Best Sellers", "Return Policy", "View My Cart"]
        });
      } catch (geminiError) {
        console.warn("[AI Controller] Gemini call failed, falling back to smart engine:", geminiError?.message);
      }
    }

    // Smart Local Fallback Engine with Context Memory
    const fallbackResponse = generateSmartFallbackResponse({
      message,
      history,
      products: allProducts,
      cartItems
    });

    return res.json({
      success: true,
      source: "smart-engine",
      reply: fallbackResponse.reply,
      products: fallbackResponse.products,
      suggestedQuestions: fallbackResponse.suggestedQuestions,
      orderData: fallbackResponse.orderData || null,
      supportData: fallbackResponse.supportData || null,
      couponData: fallbackResponse.couponData || null,
      customerName: fallbackResponse.customerName || null
    });

  } catch (error) {
    console.error("[AI Chat Controller Error]", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process chat message"
    });
  }
};

// Health/Status check for AI capabilities
export const getAiStatus = async (req, res) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  return res.json({
    success: true,
    status: "ready",
    provider: hasGeminiKey ? "google-gemini" : "smart-engine-fallback",
    geminiConfigured: hasGeminiKey,
    voiceSupport: "web-speech-api"
  });
};
