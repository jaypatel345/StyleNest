import { products as localProducts } from "../assets/assets.js";

export const STYLENEST_KNOWLEDGE = {
  storeName: "StyleNest",
  shipping: {
    fee: 10,
    currency: "$",
    deliveryTime: "2 to 4 business days",
    carrier: "Express Courier & Local Postal Partners",
    trackingUrl: "/orders",
    policyText: "StyleNest charges a standard flat-rate delivery fee of $10 on all orders. Shipments are packaged with care and typically reach your doorstep within 2 to 4 business days. You can track your shipment anytime under your Orders page."
  },
  returns: {
    periodDays: 7,
    conditions: "Unworn, unwashed, with original tags intact",
    refundTime: "3 to 5 business days after inspection",
    exchangeAvailable: true,
    policyText: "We offer a 7-day hassle-free return and exchange policy. As long as the garment is unworn, unwashed, and still has its original tags attached, you can initiate a return or exchange directly from your Orders page or by reaching out to customer support."
  },
  payments: {
    methods: [
      { name: "Cash on Delivery (COD)", desc: "Pay with cash directly to the courier upon delivery." },
      { name: "Stripe", desc: "Pay securely with Visa, MasterCard, American Express, and international cards." },
      { name: "Razorpay", desc: "Instant UPI, debit cards, and net banking support." }
    ],
    policyText: "StyleNest accepts Cash on Delivery (COD), Stripe credit/debit card payments, and Razorpay. All card payments are 256-bit SSL encrypted for maximum security."
  },
  contact: {
    email: "contact@stylenest.com",
    phone: "+1-212-456-7890",
    hours: "Monday - Saturday, 9:00 AM - 8:00 PM EST",
    pageUrl: "/contact"
  },
  about: {
    description: "StyleNest is a contemporary fashion brand dedicated to modern apparel, premium everyday essentials, and trendsetting seasonal collections for Men, Women, and Kids. We believe in high craftsmanship, comfortable fabrics, and accessible fashion.",
    pageUrl: "/about"
  },
  sizing: {
    sizes: ["S", "M", "L", "XL", "XXL"],
    advice: "Our clothing fits true to standard international sizing. If you prefer a relaxed or oversized streetwear fit, we recommend sizing up one size. For slim-fit items, your usual size is optimal."
  },
  coupons: [
    { code: "WELCOME10", discount: "10% OFF", minSpend: "No min spend", desc: "First purchase storewide" },
    { code: "STYLE20", discount: "20% OFF", minSpend: "Orders over $150", desc: "Outerwear & Denim collections" },
    { code: "FREESHIP", discount: "Free Shipping", minSpend: "Orders over $100", desc: "Saves standard $10 delivery fee" }
  ],
  supportTeam: {
    agentName: "Sarah Jenkins",
    role: "Senior Fashion Advisor",
    status: "Online & Ready",
    waitTime: "< 2 mins",
    email: "support@stylenest.com",
    phone: "+1-212-456-7890"
  }
};

// Extract conversational context (memory) from previous messages in the session
export const extractContext = (history = []) => {
  let activeCategory = null; // "Men", "Women", "Kids"
  let activeGarmentType = null; // "Bottomwear", "Winterwear", "Topwear"
  let lastProduct = null;
  let lastProductNames = [];
  let customerName = null;

  // Traverse in reverse (from most recent message backwards)
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

    // Determine category discussed
    if (!activeCategory) {
      if (/\b(men|man|mens|male|gent)\b/i.test(lowerText) && !/\bwomen\b/i.test(lowerText)) activeCategory = "Men";
      else if (/\b(women|woman|womens|female|lady|ladies)\b/i.test(lowerText)) activeCategory = "Women";
      else if (/\b(kid|kids|child|children|boy|boys|girl|girls)\b/i.test(lowerText)) activeCategory = "Kids";
    }

    // Determine garment type discussed
    if (!activeGarmentType) {
      if (/\b(pant|pants|trouser|trousers|bottom|bottomwear|jeans|jean|palazzo)\b/i.test(lowerText)) activeGarmentType = "Bottomwear";
      else if (/\b(jacket|jackets|coat|coats|winter|winterwear|hoodie)\b/i.test(lowerText)) activeGarmentType = "Winterwear";
      else if (/\b(shirt|shirts|t-shirt|t-shirts|tshirt|top|tops|tee)\b/i.test(lowerText)) activeGarmentType = "Topwear";
    }

    // Capture products recommended in previous assistant messages
    if (item.products && Array.isArray(item.products) && item.products.length > 0 && !lastProduct) {
      lastProduct = item.products[0];
      lastProductNames = item.products.map(p => p.name);
    }
  }

  return { activeCategory, activeGarmentType, lastProduct, lastProductNames, customerName };
};

// Client-side smart search & matching engine with conversation memory
export const queryLocalAi = ({ message, history = [], catalog = [], cartItems = {} }) => {
  const query = (message || "").toLowerCase().trim();
  const products = catalog && catalog.length > 0 ? catalog : localProducts;
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
      reply: `### StyleNest Customer Support Concierge\n\nOur client care team is on standby to assist you directly:\n\n- **Dedicated Stylist**: Senior Advisor **${STYLENEST_KNOWLEDGE.supportTeam.agentName}** is currently available.\n- **Priority Queue**: Current estimated response time is **${STYLENEST_KNOWLEDGE.supportTeam.waitTime}**.\n- **Direct Toll-Free Line**: [${STYLENEST_KNOWLEDGE.supportTeam.phone}](tel:${STYLENEST_KNOWLEDGE.supportTeam.phone.replace(/[^0-9+]/g, '')}) (Mon – Sat, 9:00 AM – 8:00 PM EST)\n- **Direct Email**: [${STYLENEST_KNOWLEDGE.supportTeam.email}](mailto:${STYLENEST_KNOWLEDGE.supportTeam.email})\n\nYou can connect directly with our specialist below or request an immediate callback!`,
      supportData: STYLENEST_KNOWLEDGE.supportTeam,
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
      couponData: STYLENEST_KNOWLEDGE.coupons,
      suggestedQuestions: ["Show Men's Jackets", "Show Women's Collection", "View My Cart"],
      products: []
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

  // 11. Follow-up product query referencing the previously displayed item ("how much is it", "what size", "tell me more about this")
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

  // 12. Returns & Exchange
  if (/\b(return|returns|refund|refunds|exchange|exchanges|replace)\b/i.test(query)) {
    const itemContext = context.lastProduct ? ` (including for ${context.lastProduct.name})` : "";
    return {
      reply: `### StyleNest Return & Exchange Policy\n\n- **7-Day Guarantee**: Enjoy a hassle-free **7-day return and exchange** window from delivery${itemContext}.\n- **Eligibility**: Items must be unused, unwashed, and in original condition with tags attached.\n- **How to Initiate**: Head to your [Orders](/orders) page or reach out to our team at **${STYLENEST_KNOWLEDGE.contact.email}**.\n- **Refunds**: Credited within **3-5 business days** post-inspection!`,
      products: [],
      suggestedQuestions: ["How much is shipping?", "Show Best Sellers", "View My Cart"]
    };
  }

  // 13. Payment Methods
  if (/\b(payment|payments|pay|cod|cash on delivery|stripe|razorpay|card|cards)\b/i.test(query) && !/\b(how much|cost|price)\b/i.test(query)) {
    return {
      reply: `### Secure Payment Options\n\nStyleNest offers convenient and secure payment methods:\n- **Cash on Delivery (COD)**: Pay when your order arrives.\n- **Stripe**: Credit and debit cards (Visa, MasterCard, Amex).\n- **Razorpay**: Direct UPI and Net Banking.\n\nAll digital transactions are encrypted with 256-bit SSL protection!`,
      products: [],
      suggestedQuestions: ["Delivery Fee", "Show Women's Collection", "Return Policy"]
    };
  }

  // 14. Shipping & Delivery
  if (/\b(delivery|shipping|ship|dispatch|courier)\b/i.test(query) && !/\b(cash on delivery|cod)\b/i.test(query)) {
    return {
      reply: `### Delivery & Shipping Details\n\n- **Flat Shipping Fee**: **$${STYLENEST_KNOWLEDGE.shipping.fee}** on all standard orders.\n- **Delivery Speed**: Delivered in **${STYLENEST_KNOWLEDGE.shipping.deliveryTime}**.\n- **Order Tracking**: Keep tabs on your shipment progress anytime on the [Orders](/orders) page.`,
      products: [],
      suggestedQuestions: ["Payment Methods", "Show Men's Jackets", "Return Policy"]
    };
  }

  // 15. Cart Check (Strictly checking cart contents, not "add to cart")
  if (/\b(view cart|my cart|in my cart|check cart|cart contents|items in cart|what is in my cart)\b/i.test(query) || query === "cart") {
    let count = 0;
    for (const itemId in cartItems) {
      for (const size in cartItems[itemId]) {
        count += cartItems[itemId][size] || 0;
      }
    }
    return {
      reply: count > 0
        ? `You have **${count} item${count > 1 ? 's' : ''}** currently in your shopping cart! You can view and checkout on the [Cart](/cart) page.`
        : `Your shopping bag is currently empty. Would you like to explore our **Latest Collection** or **Best Sellers**?`,
      products: count === 0 ? products.filter(p => p.bestseller).slice(0, 3) : [],
      suggestedQuestions: ["Show Best Sellers", "Men's Jackets", "Women's Topwear"]
    };
  }

  // 16. Contact & Support
  if (/\b(contact|email|phone|call you)\b/i.test(query)) {
    return {
      reply: `### Contact StyleNest Support\n\nNeed assistance with an order or styling advice?\n- **Email**: [${STYLENEST_KNOWLEDGE.contact.email}](mailto:${STYLENEST_KNOWLEDGE.contact.email})\n- **Phone**: ${STYLENEST_KNOWLEDGE.contact.phone}\n- **Hours**: ${STYLENEST_KNOWLEDGE.contact.hours}\n- **Contact Page**: Visit our [Contact Us](/contact) page.`,
      products: [],
      suggestedQuestions: ["Track my order", "Show Best Sellers", "Return Policy"]
    };
  }

  // 17. About StyleNest
  if (/\b(about us|about stylenest|who are you|about the brand|what is stylenest|tell me about stylenest)\b/i.test(query) || query === "about") {
    return {
      reply: `### About StyleNest\n\n${STYLENEST_KNOWLEDGE.about.description}\n\nDiscover our full story on the [About Us](/about) page.`,
      products: [],
      suggestedQuestions: ["Show Latest Collections", "Best Sellers", "Shipping Info"]
    };
  }

  // 18. Product Search with Context Awareness
  const matches = searchProducts(products, message, context);
  if (matches.length > 0) {
    const searchTopic = query.replace(/(show|me|find|look|looking|for|can|you|the|please|what about)/gi, "").trim();
    const contextNote = context.activeCategory && !query.includes("men") && !query.includes("women") && !query.includes("kids")
      ? ` in **${context.activeCategory}**`
      : "";
    return {
      reply: `Here are the matching styles I found${contextNote} for **"${searchTopic || message}"**. Select your size and click **Add to Cart** directly!`,
      products: matches.slice(0, 6),
      suggestedQuestions: ["Best Sellers", "What's in my cart?", "Return Policy"]
    };
  }

  // 19. General Greetings
  if (/\b(hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy)\b/i.test(query) || query === "") {
    const greetingName = context.customerName ? ` **${context.customerName}**` : "";
    return {
      reply: `Hello${greetingName}! Welcome to **StyleNest**.\n\nI'm your AI personal fashion stylist and shopping concierge. How can I assist you today? I can help you find the right product, check order status, recommend sizing, or assist with anything related to our **customer support team**.`,
      products: [],
      suggestedQuestions: ["Find the Right Product", "Customer Support Team", "Track an Order", "Active Promo Codes"]
    };
  }

  // Fallback (When no products match the query)
  return {
    reply: `I couldn't find any items matching **"${message}"** in our current collection. Try asking for specific styles like *"Men's denim jackets"*, *"Men's trousers"*, *"Women's tops"*, or browse our Best Sellers.`,
    products: [],
    suggestedQuestions: ["Best Sellers", "Winter Jackets", "Women's Collection", "Shipping & Delivery"]
  };
};

export const searchProducts = (products = [], rawQuery = "", context = {}) => {
  if (!products || products.length === 0) return [];

  // Normalize typos and synonyms
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

  // Price match (e.g., under 100, < 200, below 50)
  const priceMatch = q.match(/(?:under|below|less than|within|budget of|<)\s*\$?(\d+)/i);
  const maxPrice = priceMatch ? Number(priceMatch[1]) : null;

  const stopWords = new Set(["show", "find", "some", "with", "that", "this", "for", "want", "need", "the", "please", "looking", "look", "i'm", "give", "display", "all", "get", "any", "them", "these", "those", "it"]);
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

  // Deduplicate by product name so user sees distinct items
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
