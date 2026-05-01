import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true, trim: true },
    price: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    // Legacy field used by current frontend + order snapshots
    image: [{ type: String }],
    images: [
      {
        url: String,
        publicId: String, // for Cloudinary delete/update
      },
    ],
    category: {
      type: String,
      required: true,
      index: true,
    },

    subCategory: {
      type: String,
      required: true,
      index: true,
    },
    sizes: [
      {
        size: String,
        stock: {
          type: Number,
          default: 0,
        },
      },
    ],
    bestseller: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

//index
productSchema.index({ category: 1, subCategory: 1 });
productSchema.index({ name: "text", description: "text" });

const productModel =
  mongoose.models.product || mongoose.model("product", productSchema);

export default productModel;
