require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function seedAdmin() {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing in .env");

    await mongoose.connect(process.env.MONGO_URI);

    const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "Admin@123";
    const name = process.env.ADMIN_NAME || "Admin";

    const existing = await User.findOne({ email });

    if (existing) {
      existing.name = name;
      existing.password = await bcrypt.hash(password, 10);
      existing.role = "admin";
      await existing.save();
      console.log(`Admin updated: ${email}`);
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.create({
        name,
        email,
        password: hashedPassword,
        role: "admin"
      });
      console.log(`Admin created: ${email}`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

seedAdmin();
