import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      Lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "invalid email"],
    },
    password: { type: String, required: true, select: false },
    cartData: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        quantity: Number,
        size: String,
      },
    ],
  },

  { timestamps: true, minimize: false },
);

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;
