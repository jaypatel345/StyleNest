import { v2 as cloudinary } from "cloudinary";
import productModel from "../models/productModel.js";
import redis from "../config/redis.js";

const cacheDebugEnabled = process.env.CACHE_DEBUG === "true";
const productsCacheTtlSeconds =
  Number(process.env.PRODUCTS_CACHE_TTL_SECONDS) || 600;

const invalidateProductsListCache = async () => {
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        "stylenest:products:page:*",
        "COUNT",
        200,
      );
      cursor = nextCursor;
      if (keys?.length) await redis.del(...keys);
    } while (cursor !== "0");

    if (cacheDebugEnabled) console.log("[cache] invalidated products list");
  } catch (error) {
    if (cacheDebugEnabled) console.log("[cache] invalidate products failed:", error?.message);
  }
};

// function for add product
const addProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      subCategory,
      sizes,
      bestseller,
    } = req.body;

    const image1 = req.files.image1 && req.files.image1[0];
    const image2 = req.files.image2 && req.files.image2[0];
    const image3 = req.files.image3 && req.files.image3[0];
    const image4 = req.files.image4 && req.files.image4[0];

    const images = [image1, image2, image3, image4].filter(
      (item) => item !== undefined,
    );

    let imagesUrl = await Promise.all(
      images.map(async (item) => {
        let result = await cloudinary.uploader.upload(item.path, {
          resource_type: "image",
        });
        return result.secure_url;
      }),
    );

    const productData = {
      name,
      description,
      category,
      price: Number(price),
      subCategory,
      bestseller: bestseller === "true" ? true : false,
      sizes: JSON.parse(sizes),
      image: imagesUrl,
      date: Date.now(),
    };

    // console.log(productData);

    const product = new productModel(productData);
    await product.save();

    await invalidateProductsListCache();

    res.json({ success: true, message: "Product Added" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// function for list product
const listProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const cacheKey = `stylenest:products:page:${page}:limit:${limit}`;

    // 1. Check cache
    let cachedData = null;
    try {
      cachedData = await redis.get(cacheKey);
    } catch (e) {
      if (cacheDebugEnabled) console.log("[cache] redis get failed:", e?.message);
    }

    if (cachedData) {
      console.log("Cache HIT");
      return res.json({
        success: true,
        source: "cache",
        products: JSON.parse(cachedData),
      });
    }
    console.log("Cache MISS");
    
    // 2. Fetch from DB (add pagination)
    const products = await productModel
      .find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    // 3. Store in Redis (10 min)
    try {
      await redis.setex(cacheKey, productsCacheTtlSeconds, JSON.stringify(products));
    } catch (e) {
      if (cacheDebugEnabled) console.log("[cache] redis setex failed:", e?.message);
    }

    res.json({
      success: true,
      source: "db",
      products,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// function for removing product
const removeProduct = async (req, res) => {
  try {
    await productModel.findByIdAndDelete(req.body.id);
    await invalidateProductsListCache();
    res.json({ success: true, message: "Product Removed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// function for single product info
const singleProduct = async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await productModel.findById(productId);
    res.json({ success: true, product });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export { listProducts, addProduct, removeProduct, singleProduct };
