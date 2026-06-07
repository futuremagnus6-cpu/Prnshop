import { cartApi } from '../api/cart';

const CART_KEY = 'prandhara_cart';

// Get cart from localStorage
export const getLocalCart = () => {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
};

// Save cart to localStorage and dispatch event
export const saveLocalCart = (items) => {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('cartUpdated'));
  return items;
};

// Get cart count
export const getCartCount = () => {
  const cart = getLocalCart();
  return cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
};

// Add item to local cart (merges with existing)
export const addToLocalCart = (product) => {
  const cart = getLocalCart();
  const existing = cart.find((item) => item._id === product._id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      _id: product._id,
      name: product.name,
      sellingPrice: product.sellingPrice,
      mrp: product.mrp,
      image: product.images?.[0] || '',
      quantity: 1,
      stock: product.stockQuantity,
      category: product.category,
    });
  }
  return saveLocalCart(cart);
};

// Update item quantity
export const updateLocalCartQty = (productId, delta) => {
  const cart = getLocalCart().map((item) => {
    if (item._id === productId) {
      return { ...item, quantity: Math.max(1, (item.quantity || 1) + delta) };
    }
    return item;
  });
  return saveLocalCart(cart);
};

// Remove item from cart
export const removeFromLocalCart = (productId) => {
  const cart = getLocalCart().filter((item) => item._id !== productId);
  return saveLocalCart(cart);
};

// Convert local cart items to backend format
const toBackendItems = (items) =>
  items.map((item) => ({
    product: item._id,
    name: item.name || '',
    sellingPrice: item.sellingPrice || 0,
    mrp: item.mrp || 0,
    image: item.image || '',
    quantity: item.quantity || 1,
    stock: item.stock || 0,
  }));

// Sync local cart to backend (for authenticated users)
export const syncCartToBackend = async () => {
  try {
    const items = getLocalCart();
    if (items.length === 0) {
      await cartApi.clearCart();
    } else {
      await cartApi.syncCart(toBackendItems(items));
    }
  } catch {
    // Silent fail - cart still works locally
  }
};

// Load cart from backend and merge with local (backend takes precedence for same items)
export const loadCartFromBackend = async () => {
  try {
    const data = await cartApi.getCart();
    if (data.items && data.items.length > 0) {
      // Convert backend format to local format
      const backendItems = data.items.map((item) => {
        const product = item.product || {};
        return {
          _id: product._id || item.product,
          name: item.name || product.name || '',
          sellingPrice: item.sellingPrice || product.sellingPrice || 0,
          mrp: item.mrp || product.mrp || 0,
          image: item.image || (product.images && product.images[0]) || '',
          quantity: item.quantity || 1,
          stock: item.stock || product.stockQuantity || 0,
          category: product.category || null,
        };
      });

      // Merge with local cart: combine items, backend overrides quantity for same products
      const localItems = getLocalCart();
      const mergedMap = new Map();

      // Add local items first
      localItems.forEach((item) => {
        mergedMap.set(item._id, item);
      });

      // Backend items override quantities
      backendItems.forEach((item) => {
        if (item._id) {
          const existing = mergedMap.get(item._id);
          if (existing) {
            mergedMap.set(item._id, { ...existing, quantity: Math.max(existing.quantity, item.quantity) });
          } else {
            mergedMap.set(item._id, item);
          }
        }
      });

      const merged = Array.from(mergedMap.values());
      saveLocalCart(merged);
      return merged;
    }
    return getLocalCart();
  } catch {
    return getLocalCart();
  }
};
