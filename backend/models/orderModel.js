import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "product",
        },
        name: String,
        price: Number,
        quantity: Number,
        size: String,
      },
    ],

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    address: {
      firstName: String,
      lastName: String,
      email: String,
      name: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      zipcode: String,
      pincode: String,
      country: String,
    },

    status: {
      type: String,
      enum: [
        "Order Placed",
        "Packing",
        "Processing",
        "Shipped",
        "Out for Delivery",
        "Out for delivery",
        "Delivered",
        "Cancelled",
      ],
      default: "Order Placed",
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "Stripe", "Razorpay"],
    },
    payment: {
      type: Boolean,
      default: false,
      index: true,
    },
    transactionId: String,
    date: {
      type: Number,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// indexes
orderSchema.index({ userId: 1, createdAt: -1 });

const orderModel =
  mongoose.models.order || mongoose.model("order", orderSchema);

export default orderModel;
