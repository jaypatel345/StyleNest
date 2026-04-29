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
      name: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: String,
    },

    status: {
      type: String,
      enum: [
        "Order Placed",
        "Processing",
        "Shipped",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
      ],
      default: "Order Placed",
      index: true,
    },

    payment: {
      status: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending",
        index: true,
      },
      method: {
        type: String,
        enum: ["COD", "Stripe", "Razorpay"],
      },
      transactionId: String,
    },
  },
  {
    timestamps: true,
  },
);

// indexes
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ "payment.status": 1 });

const orderModel =
  mongoose.models.order || mongoose.model("order", orderSchema);

export default orderModel;
