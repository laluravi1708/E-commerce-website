const state = {
  token: localStorage.getItem("token") || "",
  user: JSON.parse(localStorage.getItem("user") || "null"),
  products: [],
  cart: JSON.parse(localStorage.getItem("cart") || "[]"),
  authMode: "login"
};

const statuses = ["Placed", "Processing", "Shipped", "Out for Delivery", "Delivered"];

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function money(value) {
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function showSection(id) {
  if ((id === "orders" || id === "checkout" || id === "admin") && !state.token) {
    id = "login";
    toast("Please login first");
  }

  if (id === "admin" && state.user?.role !== "admin") {
    toast("Admin access required");
    id = "products";
  }

  document.querySelectorAll(".section").forEach(section => section.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  if (id === "products") loadProducts();
  if (id === "cart") renderCart();
  if (id === "orders") loadMyOrders();
  if (id === "admin") loadAdmin();
  if (id === "checkout") renderCheckout();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateNav() {
  const loggedIn = Boolean(state.token && state.user);
  document.getElementById("loginNav").classList.toggle("hidden", loggedIn);
  document.getElementById("logoutNav").classList.toggle("hidden", !loggedIn);
  document.getElementById("adminNav").classList.toggle("hidden", state.user?.role !== "admin");
  updateCartCount();
}

function updateCartCount() {
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById("cartCount").textContent = count;
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(state.cart));
  updateCartCount();
}

async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && typeof options.body !== "string") {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

async function loadProducts() {
  try {
    state.products = await api("/api/products");
    renderProducts();
  } catch (error) {
    document.getElementById("productGrid").innerHTML = `<div class="empty">${escapeHTML(error.message)}</div>`;
  }
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  const query = document.getElementById("searchInput").value.toLowerCase().trim();

  const filtered = state.products.filter(product =>
    `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query)
  );

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty">No products found. Admin can add products from the dashboard.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(product => `
    <article class="product-card">
      <div class="product-image">
        ${product.image ? `<img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" onerror="this.style.display='none'">` : "🛍️"}
      </div>
      <div class="product-body">
        <span class="category">${escapeHTML(product.category || "General")}</span>
        <h3>${escapeHTML(product.name)}</h3>
        <p>${escapeHTML(product.description || "Quality product for your everyday needs.")}</p>
        <div class="price">${money(product.price)}</div>
        <div class="stock">${product.stock > 0 ? `${product.stock} available` : "Out of stock"}</div>
        <button class="primary full" ${product.stock <= 0 ? "disabled" : ""} onclick="addToCart('${product._id}')">
          Add to Cart
        </button>
      </div>
    </article>
  `).join("");
}

function addToCart(productId) {
  const product = state.products.find(p => p._id === productId);
  if (!product || product.stock <= 0) return;

  const existing = state.cart.find(item => item.productId === productId);

  if (existing) {
    if (existing.quantity >= product.stock) {
      toast("Maximum available stock reached");
      return;
    }
    existing.quantity++;
  } else {
    state.cart.push({ productId, quantity: 1 });
  }

  saveCart();
  toast(`${product.name} added to cart`);
}

function changeQuantity(productId, amount) {
  const item = state.cart.find(item => item.productId === productId);
  const product = state.products.find(p => p._id === productId);
  if (!item) return;

  item.quantity += amount;

  if (product && item.quantity > product.stock) item.quantity = product.stock;
  if (item.quantity <= 0) state.cart = state.cart.filter(i => i.productId !== productId);

  saveCart();
  renderCart();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter(item => item.productId !== productId);
  saveCart();
  renderCart();
}

function getCartDetails() {
  return state.cart.map(item => {
    const product = state.products.find(p => p._id === item.productId);
    return product ? { ...item, product } : null;
  }).filter(Boolean);
}

function renderCart() {
  const box = document.getElementById("cartContent");
  const details = getCartDetails();

  if (!details.length) {
    box.innerHTML = `<div class="empty"><h3>Your cart is empty</h3><p>Add some products from the catalog.</p><button class="primary" onclick="showSection('products')">Browse Products</button></div>`;
    return;
  }

  const total = details.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  box.innerHTML = `
    <div class="cart-layout">
      <div>
        ${details.map(item => `
          <div class="cart-item">
            <div class="cart-thumb">
              ${item.product.image ? `<img src="${escapeHTML(item.product.image)}" alt="">` : "🛍️"}
            </div>
            <div class="cart-info">
              <h3>${escapeHTML(item.product.name)}</h3>
              <p>${money(item.product.price)} each</p>
            </div>
            <div class="qty">
              <button onclick="changeQuantity('${item.productId}', -1)">−</button>
              <strong>${item.quantity}</strong>
              <button onclick="changeQuantity('${item.productId}', 1)">+</button>
            </div>
            <button class="danger" onclick="removeFromCart('${item.productId}')">Remove</button>
          </div>
        `).join("")}
      </div>
      <aside class="summary">
        <h3>Order Summary</h3>
        <div class="summary-row"><span>Items</span><span>${details.reduce((s,i)=>s+i.quantity,0)}</span></div>
        <div class="summary-row"><span>Subtotal</span><strong>${money(total)}</strong></div>
        <div class="summary-row"><span>Delivery</span><span>Free</span></div>
        <div class="summary-row total"><span>Total</span><span>${money(total)}</span></div>
        <button class="primary full" onclick="startCheckout()">Proceed to Checkout</button>
      </aside>
    </div>
  `;
}

function startCheckout() {
  if (!state.token) {
    toast("Login to continue");
    showSection("login");
    return;
  }
  showSection("checkout");
}

function renderCheckout() {
  const details = getCartDetails();
  const total = details.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  document.getElementById("checkoutSummary").innerHTML = `
    <div class="summary">
      ${details.map(item => `<div class="summary-row"><span>${escapeHTML(item.product.name)} × ${item.quantity}</span><strong>${money(item.product.price * item.quantity)}</strong></div>`).join("")}
      <div class="summary-row total"><span>Total</span><span>${money(total)}</span></div>
    </div>
    <br>
  `;
}

async function placeOrder(event) {
  event.preventDefault();

  if (!state.cart.length) return toast("Your cart is empty");

  try {
    const shippingAddress = document.getElementById("shippingAddress").value;
    const paymentMethod = document.getElementById("paymentMethod").value;

    const order = await api("/api/orders", {
      method: "POST",
      body: {
        items: state.cart,
        shippingAddress,
        paymentMethod
      }
    });

    state.cart = [];
    saveCart();
    event.target.reset();

    toast(`Order placed successfully: #${order._id.slice(-6).toUpperCase()}`);
    showSection("orders");
  } catch (error) {
    toast(error.message);
  }
}

function setAuthMode(mode) {
  state.authMode = mode;
  const register = mode === "register";

  document.getElementById("nameField").classList.toggle("hidden", !register);
  document.getElementById("authTitle").textContent = register ? "Create your account" : "Welcome back";
  document.getElementById("authSubmit").textContent = register ? "Create Account" : "Login";
  document.getElementById("loginTab").classList.toggle("active", !register);
  document.getElementById("registerTab").classList.toggle("active", register);
  document.getElementById("authMessage").textContent = "";
}

async function submitAuth(event) {
  event.preventDefault();

  const name = document.getElementById("authName").value;
  const email = document.getElementById("authEmail").value;
  const password = document.getElementById("authPassword").value;
  const message = document.getElementById("authMessage");

  try {
    const endpoint = state.authMode === "register" ? "/api/auth/register" : "/api/auth/login";
    const body = state.authMode === "register" ? { name, email, password } : { email, password };
    const data = await api(endpoint, { method: "POST", body });

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("token", state.token);
    localStorage.setItem("user", JSON.stringify(state.user));

    updateNav();
    event.target.reset();
    toast(`Welcome, ${state.user.name}!`);
    showSection("home");
  } catch (error) {
    message.textContent = error.message;
    message.style.color = "#dc3545";
  }
}

function logout() {
  state.token = "";
  state.user = null;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  updateNav();
  toast("Logged out successfully");
  showSection("home");
}

async function loadMyOrders() {
  const box = document.getElementById("ordersContent");

  try {
    const orders = await api("/api/orders/my");

    if (!orders.length) {
      box.innerHTML = `<div class="empty"><h3>No orders yet</h3><p>Your placed orders will appear here.</p></div>`;
      return;
    }

    box.innerHTML = orders.map(orderCard).join("");
  } catch (error) {
    box.innerHTML = `<div class="empty">${escapeHTML(error.message)}</div>`;
  }
}

function orderCard(order) {
  const currentIndex = statuses.indexOf(order.status);

  return `
    <div class="order-card">
      <div class="order-top">
        <div>
          <strong>Order #${escapeHTML(order._id.slice(-8).toUpperCase())}</strong>
          <p class="small-note">${new Date(order.createdAt).toLocaleString("en-IN")}</p>
        </div>
        <span class="status">${escapeHTML(order.status)}</span>
      </div>
      <p><strong>Items:</strong> ${order.items.map(i => `${escapeHTML(i.name)} × ${i.quantity}`).join(", ")}</p>
      <p><strong>Total:</strong> ${money(order.total)}</p>
      <p><strong>Address:</strong> ${escapeHTML(order.shippingAddress)}</p>
      ${order.status !== "Cancelled" ? `
        <div class="progress">
          ${statuses.map((status, index) => `
            <div class="progress-step ${index <= currentIndex ? "done" : ""}">
              <div class="progress-dot"></div>${status}
            </div>
          `).join("")}
        </div>
        ${["Placed", "Processing"].includes(order.status) ? `<button class="danger" onclick="cancelOrder('${order._id}')">Cancel Order</button>` : ""}
      ` : `<p><strong>This order was cancelled.</strong></p>`}
    </div>
  `;
}

async function cancelOrder(orderId) {
  if (!confirm("Cancel this order?")) return;

  try {
    await api(`/api/orders/${orderId}/cancel`, { method: "PUT" });
    toast("Order cancelled");
    loadMyOrders();
  } catch (error) {
    toast(error.message);
  }
}

async function loadAdmin() {
  if (state.user?.role !== "admin") return;

  try {
    const [products, orders] = await Promise.all([
      api("/api/products"),
      api("/api/orders")
    ]);

    state.products = products;
    renderAdminProducts(products);
    renderAdminOrders(orders);
  } catch (error) {
    toast(error.message);
  }
}

function renderAdminProducts(products) {
  const box = document.getElementById("adminProducts");

  if (!products.length) {
    box.innerHTML = `<div class="empty">No products yet.</div>`;
    return;
  }

  box.innerHTML = products.map(product => `
    <div class="admin-product">
      <div>
        <strong>${escapeHTML(product.name)}</strong><br>
        <small>${money(product.price)} • Stock: ${product.stock}</small>
      </div>
      <div class="admin-actions">
        <button class="secondary" onclick="editProduct('${product._id}')">Edit</button>
        <button class="danger" onclick="deleteProduct('${product._id}')">Delete</button>
      </div>
    </div>
  `).join("");
}

function renderAdminOrders(orders) {
  const box = document.getElementById("adminOrders");

  if (!orders.length) {
    box.innerHTML = `<div class="empty">No orders yet.</div>`;
    return;
  }

  box.innerHTML = orders.map(order => `
    <div class="admin-order">
      <strong>#${escapeHTML(order._id.slice(-8).toUpperCase())}</strong>
      <span> — ${escapeHTML(order.user?.name || "User")}</span>
      <p>${order.items.map(i => `${escapeHTML(i.name)} × ${i.quantity}`).join(", ")} | <strong>${money(order.total)}</strong></p>
      <select onchange="updateOrderStatus('${order._id}', this.value)">
        ${["Placed", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled"].map(status =>
          `<option ${order.status === status ? "selected" : ""}>${status}</option>`
        ).join("")}
      </select>
    </div>
  `).join("");
}

async function saveProduct(event) {
  event.preventDefault();

  try {
    const id = document.getElementById("editProductId").value;
    const body = {
      name: document.getElementById("productName").value,
      description: document.getElementById("productDescription").value,
      category: document.getElementById("productCategory").value,
      price: Number(document.getElementById("productPrice").value),
      stock: Number(document.getElementById("productStock").value),
      image: document.getElementById("productImage").value
    };

    await api(id ? `/api/products/${id}` : "/api/products", {
      method: id ? "PUT" : "POST",
      body
    });

    resetProductForm();
    toast(id ? "Product updated" : "Product added");
    loadAdmin();
    loadProducts();
  } catch (error) {
    document.getElementById("productMessage").textContent = error.message;
  }
}

function editProduct(id) {
  const product = state.products.find(p => p._id === id);
  if (!product) return;

  document.getElementById("editProductId").value = product._id;
  document.getElementById("productName").value = product.name;
  document.getElementById("productDescription").value = product.description || "";
  document.getElementById("productCategory").value = product.category || "";
  document.getElementById("productPrice").value = product.price;
  document.getElementById("productStock").value = product.stock;
  document.getElementById("productImage").value = product.image || "";
  document.getElementById("productFormTitle").textContent = "Edit Product";
  document.getElementById("cancelEdit").classList.remove("hidden");
  window.scrollTo({ top: document.getElementById("admin").offsetTop, behavior: "smooth" });
}

function resetProductForm() {
  document.getElementById("productForm").reset();
  document.getElementById("editProductId").value = "";
  document.getElementById("productFormTitle").textContent = "Add Product";
  document.getElementById("cancelEdit").classList.add("hidden");
  document.getElementById("productMessage").textContent = "";
}

async function deleteProduct(id) {
  if (!confirm("Delete this product?")) return;

  try {
    await api(`/api/products/${id}`, { method: "DELETE" });
    toast("Product deleted");
    loadAdmin();
    loadProducts();
  } catch (error) {
    toast(error.message);
  }
}

async function updateOrderStatus(id, status) {
  try {
    await api(`/api/orders/${id}/status`, {
      method: "PUT",
      body: { status }
    });
    toast("Order status updated");
    loadAdmin();
  } catch (error) {
    toast(error.message);
  }
}

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
}

async function init() {
  updateNav();
  await loadProducts();
}

init();
