import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from "stripe";
import razorpay from "razorpay";
import redis from "../config/redis.js";

const currency = "inr";
const deliveryCharge = 10;

const cacheDebugEnabled = process.env.CACHE_DEBUG === "true";
const ordersCacheTtlSeconds = Number(process.env.ORDERS_CACHE_TTL_SECONDS) || 120;

const normalizeId = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  return value.toString();
};

const allOrdersCacheKey = () => "stylenest:orders:all";
const userOrdersCacheKey = (userId) =>
  `stylenest:orders:user:${normalizeId(userId)}`;

const safeRedisGet = async (key) => {
  try {
    return await redis.get(key);
  } catch (error) {
    if (cacheDebugEnabled) console.log("[redis:get] failed:", key, error?.message);
    return null;
  }
};

const safeRedisSetex = async (key, ttlSeconds, value) => {
  try {
    await redis.setex(key, ttlSeconds, value);
  } catch (error) {
    if (cacheDebugEnabled) console.log("[redis:setex] failed:", key, error?.message);
  }
};

const safeRedisDel = async (...keys) => {
  const keysToDelete = keys.filter(Boolean);
  if (keysToDelete.length === 0) return;
  try {
    await redis.del(...keysToDelete);
  } catch (error) {
    if (cacheDebugEnabled) console.log("[redis:del] failed:", keysToDelete, error?.message);
  }
};

const invalidateOrderCaches = async (userId) => {
  const keys = [allOrdersCacheKey(), userId ? userOrdersCacheKey(userId) : null];
  if (cacheDebugEnabled) console.log("[cache] invalidate:", keys.filter(Boolean));
  await safeRedisDel(...keys);
};

// gateway initialize
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const razorpayInstance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Placing orders using COD Method
const placeOrder = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;

    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: "COD",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    await userModel.findByIdAndUpdate(userId, { cartData: {} });

    await invalidateOrderCaches(userId);

    res.json({ success: true, message: "Order Placed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Placing orders using Stripe Method
const placeOrderStripe = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;
    const { origin } = req.headers;

    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: "Stripe",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    await invalidateOrderCaches(userId);

    const line_items = items.map((item) => ({
      price_data: {
        currency: currency,
        product_data: {
          name: item.name,
        },
        unit_amount: item.price * 100,
      },
      quantity: item.quantity,
    }));

    line_items.push({
      price_data: {
        currency: currency,
        product_data: {
          name: "Delivery Charges",
        },
        unit_amount: deliveryCharge * 100,
      },
      quantity: 1,
    });

    const session = await stripe.checkout.sessions.create({
      success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
      cancel_url: `${origin}/verify?success=false&orderId=${newOrder._id}`,
      line_items,
      mode: "payment",
    });

    res.json({ success: true, session_url: session.url });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Verify Stripe
const verifyStripe = async (req, res) => {
  const { orderId, success, userId } = req.body;

  try {
    if (success === "true") {
      await orderModel.findByIdAndUpdate(orderId, { payment: true });
      await userModel.findByIdAndUpdate(userId, { cartData: {} });
      await invalidateOrderCaches(userId);
      res.json({ success: true });
    } else {
      await orderModel.findByIdAndDelete(orderId);
      await invalidateOrderCaches(userId);
      res.json({ success: false });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Placing orders using Razorpay Method
const placeOrderRazorpay = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;

    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: "Razorpay",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    await invalidateOrderCaches(userId);

    const options = {
      amount: amount * 100,
      currency: currency.toUpperCase(),
      receipt: newOrder._id.toString(),
    };

    await razorpayInstance.orders.create(options, (error, order) => {
      if (error) {
        console.log(error);
        return res.json({ success: false, message: error });
      }
      res.json({ success: true, order });
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const verifyRazorpay = async (req, res) => {
  try {
    const { userId, razorpay_order_id } = req.body;

    const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);
    if (orderInfo.status === "paid") {
      await orderModel.findByIdAndUpdate(orderInfo.receipt, { payment: true });
      await userModel.findByIdAndUpdate(userId, { cartData: {} });
      await invalidateOrderCaches(userId);
      res.json({ success: true, message: "Payment Successful" });
    } else {
      res.json({ success: false, message: "Payment Failed" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// All Orders data for Admin Panel
const allOrders = async (req, res) => {
  try {
    const cacheKey = allOrdersCacheKey();

    if (cacheDebugEnabled) {
      console.log("[cache] get:", cacheKey);
    }

    const cachedData = await safeRedisGet(cacheKey);

    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (cacheDebugEnabled) console.log("[cache] allOrders HIT");
        return res.json({
          success: true,
          source: "cache",
          orders: Array.isArray(parsed) ? parsed : [],
        });
      } catch (e) {
        await safeRedisDel(cacheKey);
      }
    }

    if (cacheDebugEnabled) console.log("[cache] allOrders MISS");

    const orders = await orderModel.find({}).sort({ createdAt: -1 }).lean();

    await safeRedisSetex(cacheKey, ordersCacheTtlSeconds, JSON.stringify(orders));

    res.json({ success: true, source: "db", orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const userOrders = async (req, res) => {
  try {
    const userId = req.userId || req.body.userId;

    const cacheKey = userOrdersCacheKey(userId);

    if (cacheDebugEnabled) {
      console.log("[cache] userOrders userId:", userId);
      console.log("[cache] get:", cacheKey);
    }

    const cachedData = await safeRedisGet(cacheKey);

    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (cacheDebugEnabled) console.log("[cache] userOrders HIT");
        return res.json({
          success: true,
          source: "cache",
          orders: Array.isArray(parsed) ? parsed : [],
        });
      } catch (e) {
        await safeRedisDel(cacheKey);
      }
    }

    if (cacheDebugEnabled) console.log("[cache] userOrders MISS");

    const normalizedUserId = normalizeId(userId);
    const orders = await orderModel
      .find({ userId: normalizedUserId })
      .sort({ createdAt: -1 })
      .lean();

    await safeRedisSetex(cacheKey, ordersCacheTtlSeconds, JSON.stringify(orders));

    res.json({ success: true, source: "db", orders });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    const order = await orderModel.findByIdAndUpdate(
      orderId,
      { status },
      { new: true },
    );

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    await invalidateOrderCaches(order.userId);

    res.json({ success: true, message: "Status Updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export {
  verifyRazorpay,
  verifyStripe,
  placeOrder,
  placeOrderStripe,
  placeOrderRazorpay,
  allOrders,
  userOrders,
  updateStatus,
};
