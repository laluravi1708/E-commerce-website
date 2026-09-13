const express = require("express");
const Product = require("../models/Product");
const { auth, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch {
    res.status(500).json({ message: "Could not load products" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch {
    res.status(400).json({ message: "Invalid product ID" });
  }
});

router.post("/", auth, adminOnly, async (req, res) => {
  try {
    const { name, description, category, price, image, stock } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ message: "Name and price are required" });
    }

    const product = await Product.create({
      name,
      description,
      category,
      price: Number(price),
      image,
      stock: Number(stock ?? 10)
    });

    res.status(201).json(product);
  } catch {
    res.status(400).json({ message: "Could not create product" });
  }
});

router.put("/:id", auth, adminOnly, async (req, res) => {
  try {
    const allowed = ["name", "description", "category", "price", "image", "stock"];
    const update = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const product = await Product.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    });

    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch {
    res.status(400).json({ message: "Could not update product" });
  }
});

router.delete("/:id", auth, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch {
    res.status(400).json({ message: "Could not delete product" });
  }
});

module.exports = router;
