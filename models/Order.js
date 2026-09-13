const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name: String,
        price: Number,
        quantity: Number
      }
    ],
    total: { type: Number, required: true },
    paymentMethod: { type: String, default: "Demo Payment" },
    paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Paid" },
    status: {
      type: String,
      enum: ["Placed", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled"],
      default: "Placed"
    },
    shippingAddress: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
