import axios from "axios";
import { products as localProducts } from "../assets/assets.js";

export const fetchProducts = async (backendUrl, page = 1, limit = 10, filters = {}) => {
  try {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));

    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === "") continue;
      params.set(key, String(value));
    }

    if (backendUrl) {
      const res = await axios.get(`${backendUrl}/api/product/list?${params.toString()}`, { timeout: 3000 });
      if (res.data && res.data.success && res.data.products && res.data.products.length > 0) {
        return res.data.products;
      }
    }
  } catch (error) {
    // fallback to localProducts
  }

  const start = (page - 1) * limit;
  return localProducts.slice(start, start + limit);
};

export const fetchProductById = async (backendUrl, productId) => {
  try {
    if (backendUrl) {
      const res = await axios.post(`${backendUrl}/api/product/single`, { productId }, { timeout: 3000 });
      if (res.data && res.data.product) {
        return res.data.product;
      }
    }
  } catch (error) {
    // fallback to localProducts
  }

  return localProducts.find((p) => String(p._id) === String(productId)) || null;
};
