import axios from "axios";

export const fetchProducts = async (backendUrl, page = 1, limit = 10, filters = {}) => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  // reserved for later
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }

  const res = await axios.get(`${backendUrl}/api/product/list?${params.toString()}`);
  return res.data.products || [];
};

export const fetchProductById = async (backendUrl, productId) => {
  const res = await axios.post(`${backendUrl}/api/product/single`, { productId });
  return res.data.product || null;
};

