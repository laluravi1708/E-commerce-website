const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { auth, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.post("/", auth, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod = "Demo Payment" } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    if (!shippingAddress?.trim()) {
      return res.status(400).json({ message: "Shipping address is required" });
    }

    const productIds = items.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    let total = 0;
    const orderItems = [];

    for (const item of items) {
      if (!mongoose.isValidObjectId(item.productId)) {
        return res.status(400).json({ message: "Invalid product in cart" });
      }

      const product = products.find(p => p._id.toString() === item.productId);

      if (!product) {
        return res.status(404).json({ message: "A product in your cart no longer exists" });
      }

      const quantity = Math.max(1, Number(item.quantity) || 1);

      if (product.stock < quantity) {
        return res.status(400).json({ message: `${product.name} does not have enough stock` });
      }

      total += product.price * quantity;
      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity
      });
    }

    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      total,
      paymentMethod,
      paymentStatus: "Paid",
      shippingAddress: shippingAddress.trim()
    });

    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    res.status(201).json(await Order.findById(order._id).populate("user", "name email"));
  } catch (error) {
    res.status(500).json({ message: "Could not place order" });
  }
});

router.get("/my", auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch {
    res.status(500).json({ message: "Could not load orders" });
  }
});

router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch {
    res.status(500).json({ message: "Could not load orders" });
  }
});

router.put("/:id/status", auth, adminOnly, async (req, res) => {
  try {
    const allowed = [
      "Placed",
      "Processing",
      "Shipped",
      "Out for Delivery",
      "Delivered",
      "Cancelled"
    ];

    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    ).populate("user", "name email");

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json(order);
  } catch {
    res.status(400).json({ message: "Could not update order status" });
  }
});

router.put("/:id/cancel", auth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (["Shipped", "Out for Delivery", "Delivered", "Cancelled"].includes(order.status)) {
      return res.status(400).json({ message: "This order can no longer be cancelled" });
    }

    order.status = "Cancelled";
    await order.save();

    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }

    res.json(order);
  } catch {
    res.status(400).json({ message: "Could not cancel order" });
  }
});

module.exports = router;
