import React, { useContext, useState } from "react";
import { ShopContext } from "../context/ShopContext";
import { ShoppingBag, Check, ArrowUpRight } from "lucide-react";

const AiChatProductCard = ({ product }) => {
  const { currency, addToCart, navigate } = useContext(ShopContext);

  // Normalize sizes
  const rawSizes = Array.isArray(product.sizes) ? product.sizes : ["S", "M", "L", "XL"];
  const availableSizes = rawSizes
    .map((s) => (typeof s === "object" ? s.size : s))
    .filter(Boolean);
  const defaultSize = availableSizes.length > 0 ? availableSizes[0] : "M";

  const [selectedSize, setSelectedSize] = useState(defaultSize);
  const [isAdded, setIsAdded] = useState(false);

  // Image source handling
  const imageSrc =
    Array.isArray(product.image) && product.image.length > 0
      ? product.image[0]
      : typeof product.image === "string"
      ? product.image
      : "";

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    if (!selectedSize) return;

    await addToCart(product._id, selectedSize);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  };

  const handleViewProduct = (e) => {
    e.stopPropagation();
    navigate(`/product/${product._id}`);
  };

  return (
    <div
      onClick={handleViewProduct}
      className="group relative flex flex-col w-[205px] flex-shrink-0 bg-white border border-neutral-200/80 hover:border-neutral-400/80 rounded-2xl p-2.5 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer text-left select-none"
    >
      {/* Product Image Area */}
      <div className="relative w-full h-44 bg-neutral-100 rounded-xl overflow-hidden">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={product.name}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
            StyleNest
          </div>
        )}

        {/* Minimal Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          {product.bestseller && (
            <span className="bg-black/90 backdrop-blur-xs text-white text-[9px] font-medium tracking-wider uppercase px-2 py-0.5 rounded-full">
              Bestseller
            </span>
          )}
        </div>

        {/* Direct Link Icon */}
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-xs">
          <ArrowUpRight className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Product Meta */}
      <div className="mt-2.5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase tracking-wider font-medium">
            <span>{product.category || "Style"}</span>
            <span>{product.subCategory || ""}</span>
          </div>

          <h4
            title={product.name}
            className="text-xs font-medium text-neutral-900 line-clamp-1 mt-0.5 group-hover:text-black transition-colors"
          >
            {product.name}
          </h4>

          <p className="text-sm font-semibold text-neutral-900 mt-1">
            {currency}
            {product.price}
          </p>
        </div>

        {/* Size Selection */}
        <div className="mt-2.5 pt-2 border-t border-neutral-100" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-neutral-400 font-medium">Size</span>
            <span className="text-[10px] font-semibold text-neutral-700">{selectedSize}</span>
          </div>
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5">
            {availableSizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={`text-[10px] font-medium min-w-[24px] h-6 px-1 rounded-md transition-all flex items-center justify-center ${
                  selectedSize === size
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Add to Cart Button */}
        <button
          type="button"
          onClick={handleAddToCart}
          className={`mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium transition-all duration-200 ${
            isAdded
              ? "bg-emerald-600 text-white"
              : "bg-neutral-900 hover:bg-black text-white active:scale-[0.98] shadow-xs"
          }`}
        >
          {isAdded ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Added to Bag</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Add to Cart</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AiChatProductCard;
