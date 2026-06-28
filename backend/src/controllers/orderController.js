const Order = require('../models/Order');
const Product = require('../models/Product');
const Alert = require('../models/Alert');
const Dealer = require('../models/Dealer');
const Customer = require('../models/Customer');
const InventoryLog = require('../models/InventoryLog');
const { paginate, generateInvoiceNumber } = require('../utils/helpers');
const {
  sendOrderConfirmationEmail,
  sendPaymentConfirmationEmail,
} = require('../utils/email');
const logger = require('../utils/logger');

// @desc    Check if transaction ID already exists in any order
// @route   GET /api/orders/check-transaction/:txnId
const checkTransactionId = async (req, res, next) => {
  try {
    const { txnId } = req.params;
    if (!txnId) {
      return res.status(400).json({ exists: false, message: 'Transaction ID is required' });
    }
    const existing = await Order.findOne({
      'payments.transactionId': txnId
    });
    res.json({ exists: !!existing });
  } catch (error) {
    next(error);
  }
};

// @desc    Create POS order
// @route   POST /api/orders/pos
const createPOSOrder = async (req, res, next) => {
  try {
    const { dealer, customers, items, payments, discount, notes } = req.body;

    // Check for duplicate transaction IDs in payments
    if (payments && payments.length > 0) {
      for (const payment of payments) {
        if (payment.transactionId && payment.transactionId.trim()) {
          const existingTxn = await Order.findOne({
            'payments.transactionId': payment.transactionId.trim()
          });
          if (existingTxn) {
            return res.status(409).json({
              message: `Transaction ID "${payment.transactionId}" already exists in order #${existingTxn.invoiceNumber}`,
              exists: true,
              transactionId: payment.transactionId,
              existingOrder: existingTxn.invoiceNumber,
            });
          }
        }
      }
    }

    // Validate and process each item - reduce stock
    const processedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ message: `Product ${item.product} not found` });
      if (product.stockQuantity < item.quantity)
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });

      const totalPrice = item.quantity * product.sellingPrice;
      const gstAmount = totalPrice * ((product.gst || 0) / 100);

      processedItems.push({
        product: product._id,
        productName: product.name,
        batchNumber: product.batchNumber,
        quantity: item.quantity,
        mrp: product.mrp,
        sellingPrice: product.sellingPrice,
        gst: product.gst || 0,
        totalPrice: totalPrice + gstAmount,
      });
    }

    // Calculate totals
    const subtotal = processedItems.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
    const totalGst = processedItems.reduce((sum, item) => sum + (item.totalPrice - item.sellingPrice * item.quantity), 0);
    const grandTotal = processedItems.reduce((sum, item) => sum + item.totalPrice, 0) - (discount || 0);

    // Process customers
    const processedCustomers = [];
    if (customers && customers.length > 0) {
      for (const c of customers) {
        const customerData = {
          customerName: c.name,
          customerId: c.customerId || undefined,
          customerPhone: c.phone,
          products: [],
          totalAmount: 0,
        };

        if (c.customerId) {
          const existingCustomer = await Customer.findOne({ customerId: c.customerId });
          if (existingCustomer) {
            customerData.customer = existingCustomer._id;
            existingCustomer.totalOrders += 1;
            await existingCustomer.save();
          }
        } else {
          // Generate alert for missing customer ID
          await Alert.create({
            type: 'missing_customer_id',
            message: `Customer "${c.name}" has no Customer ID`,
            severity: 'warning',
            relatedTo: { model: 'Customer' },
          });
        }

        // Generate preorder alert for each customer without ID
        if (!c.customerId) {
          await Alert.create({
            type: 'preorder_created',
            message: `Pre-order created for "${c.name}" — Customer ID not provided, requires confirmation`,
            severity: 'warning',
            relatedTo: { model: 'Order' },
          });
        }

        processedCustomers.push(customerData);
      }
    }

    // Auto-save or update dealer in Dealers collection
    let dealerRef = dealer;
    if (!dealerRef && req.body.dealerName && req.body.dealerPhone) {
      // Try to find existing dealer by phone
      const existingDealer = await Dealer.findOne({ phone: req.body.dealerPhone });
      if (existingDealer) {
        dealerRef = existingDealer._id;
        // Update name and address if they differ
        if (existingDealer.name !== req.body.dealerName || existingDealer.address?.street !== req.body.dealerAddress) {
          existingDealer.name = req.body.dealerName;
          existingDealer.address = {
            ...existingDealer.address,
            street: req.body.dealerAddress || existingDealer.address?.street,
          };
          await existingDealer.save();
        }
      } else {
        // Create new dealer from order details
        const newDealer = await Dealer.create({
          name: req.body.dealerName,
          phone: req.body.dealerPhone,
          address: {
            street: req.body.dealerAddress || '',
          },
          addedBy: req.user._id,
        });
        dealerRef = newDealer._id;
      }
    }

    // Update dealer total purchases
    if (dealerRef) {
      await Dealer.findByIdAndUpdate(dealerRef, { $inc: { totalPurchases: grandTotal } });
    }

    // Reduce stock
    for (const item of processedItems) {
      const product = await Product.findById(item.product);
      const before = product.stockQuantity;
      product.stockQuantity -= item.quantity;
      product.totalSold = (product.totalSold || 0) + item.quantity;
      await product.save();

      await InventoryLog.create({
        product: product._id,
        productName: product.name,
        changeType: 'sale',
        quantityChange: -item.quantity,
        quantityBefore: before,
        quantityAfter: product.stockQuantity,
      });

      // Check low stock alert
      if (product.stockQuantity <= product.lowStockThreshold) {
        await Alert.create({
          type: 'low_stock',
          message: `Low stock: ${product.name} (${product.stockQuantity} remaining)`,
          severity: 'warning',
          relatedTo: { model: 'Product', id: product._id },
        });
      }
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 5)
      .toUpperCase()}`;

    // Calculate total paid and determine payment status
    const totalPaid = (payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    let paymentStatus = 'pending';
    if (totalPaid >= grandTotal) {
      paymentStatus = 'paid';
    } else if (totalPaid > 0 && totalPaid < grandTotal) {
      paymentStatus = 'partial';
    }

    const order = await Order.create({
      invoiceNumber,
      orderType: 'pos',
      status: 'preorder',
      dealer: dealerRef || dealer,
      dealerName: req.body.dealerName,
      dealerPhone: req.body.dealerPhone,
      dealerAddress: req.body.dealerAddress,
      customers: processedCustomers,
      items: processedItems,
      subtotal,
      totalGst,
      discount: discount || 0,
      grandTotal,
      payments: payments || [],
      paymentStatus,
      notes,
      processedBy: req.user._id,
    });

    // Create alert for partial/pending payment
    if (paymentStatus === 'partial') {
      const dueAmount = grandTotal - totalPaid;
      await Alert.create({
        type: 'payment_pending',
        message: `Partial payment for order #${invoiceNumber} — ₹${dueAmount.toFixed(2)} still pending`,
        severity: 'warning',
        relatedTo: { model: 'Order', id: order._id },
      });
    } else if (paymentStatus === 'pending') {
      await Alert.create({
        type: 'payment_pending',
        message: `Payment pending for order #${invoiceNumber} — ₹${grandTotal.toFixed(2)} due`,
        severity: 'warning',
        relatedTo: { model: 'Order', id: order._id },
      });
    }

    // Send POS order confirmation email
    const dealerName = req.body.dealerName || '';
    const dealerEmail = req.body.dealerEmail || '';
    sendOrderConfirmationEmail({
      order,
      customerName: dealerName,
      customerEmail: dealerEmail,
    }).catch((err) =>
      logger.error('Failed to send POS order confirmation email', { error: err.message, orderId: order._id })
    );

    res.status(201).json({ message: 'Order created', order });
  } catch (error) {
    next(error);
  }
};

// @desc    Create online order
// @route   POST /api/orders/online
const createOnlineOrder = async (req, res, next) => {
  try {
    const { items, customerId, prescription, payments } = req.body;

    if (!customerId) return res.status(400).json({ message: 'Customer ID is required for online orders' });

    const customer = await Customer.findOne({ customerId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Process items similar to POS
    const processedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ message: `Product not found` });
      if (product.stockQuantity < item.quantity)
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });

      const totalPrice = item.quantity * product.sellingPrice;
      const gstAmount = totalPrice * ((product.gst || 0) / 100);

      processedItems.push({
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        mrp: product.mrp,
        sellingPrice: product.sellingPrice,
        gst: product.gst || 0,
        totalPrice: totalPrice + gstAmount,
      });
    }

    const subtotal = processedItems.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
    const grandTotal = processedItems.reduce((sum, item) => sum + item.totalPrice, 0);

    const invoiceNumber = `ONL-${Date.now().toString(36).toUpperCase()}`;

    const order = await Order.create({
      invoiceNumber,
      orderType: 'online',
      status: 'pending',
      customers: [
        {
          customer: customer._id,
          customerName: customer.name,
          customerId: customer.customerId,
          customerPhone: customer.phone,
          products: processedItems,
          totalAmount: grandTotal,
        },
      ],
      items: processedItems,
      subtotal,
      grandTotal,
      payments: payments || [],
      paymentStatus: payments && payments.length > 0 ? 'paid' : 'pending',
      prescription: prescription || '',
      processedBy: req.user?._id,
    });

    // Create alert for new online order
    await Alert.create({
      type: 'new_order',
      message: `New online order #${invoiceNumber}`,
      severity: 'info',
      relatedTo: { model: 'Order', id: order._id },
    });

    res.status(201).json({ message: 'Order placed', order });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders
// @route   GET /api/orders
const getOrders = async (req, res, next) => {
  try {
    const { page, limit, status, type, search, startDate, endDate } = req.query;
    const { pageNum, limitNum, skip } = paginate(page, limit);

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.orderType = type;
    if (search) {
      filter['customers.customerName'] = { $regex: search, $options: 'i' };
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('dealer', 'name phone gstNumber address')
        .populate('customers.customer', 'customerId name phone')
        .populate('processedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(filter),
    ]);

    res.json({
      orders,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('dealer', 'name phone address')
      .populate('customers.customer', 'name customerId phone')
      .populate('processedBy', 'name');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ order });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const updateFields = { status };
    // Set status timestamps for order tracking
    if (status === 'confirmed') updateFields.confirmedAt = new Date();
    if (status === 'shipped') updateFields.shippedAt = new Date();
    if (status === 'delivered') updateFields.deliveredAt = new Date();
    if (status === 'cancelled' || status === 'rejected') updateFields.cancelledAt = new Date();

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { returnDocument: 'after' }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Send email if order is confirmed, shipped, or delivered
    if (status === 'confirmed' || status === 'shipped' || status === 'delivered') {
      const customerName = order.customers?.[0]?.customerName || '';
      sendOrderConfirmationEmail({
        order,
        customerName,
      }).catch((err) =>
        logger.error('Failed to send order status email', { error: err.message, orderId: order._id, status })
      );
    }

    // If rejected or cancelled, restore stock
    if (status === 'rejected' || status === 'cancelled') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stockQuantity: item.quantity, totalSold: -item.quantity },
        });

        // Check if the product is now low stock after restoration
        const product = await Product.findById(item.product);
        if (product && product.stockQuantity <= product.lowStockThreshold) {
          await Alert.create({
            type: 'low_stock',
            message: `Low stock: ${product.name} (${product.stockQuantity} remaining)`,
            severity: 'warning',
            relatedTo: { model: 'Product', id: product._id },
          });
        }
      }
    }

    res.json({ message: `Order ${status}`, order });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending orders
// @route   GET /api/orders/pending
const getPendingOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ status: 'pending' })
      .populate('dealer', 'name phone gstNumber address')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my orders (for the logged-in user)
// @route   GET /api/orders/my
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ processedBy: req.user._id })
      .populate('dealer', 'name phone address gstNumber')
      .populate('customers.customer', 'customerId name phone')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order stats
// @route   GET /api/orders/stats
const getOrderStats = async (req, res, next) => {
  try {
    const [totalOrders, totalRevenue, pendingOrders, todayOrders] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([
        { $match: { status: { $in: ['confirmed', 'delivered'] } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
    ]);

    res.json({
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      pendingOrders,
      todayOrders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pre-orders (POS orders awaiting confirmation)
// @route   GET /api/orders/pre-orders
const getPreOrders = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const { pageNum, limitNum, skip } = paginate(page, limit);

    const filter = { orderType: 'pos', status: 'preorder' };

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('dealer', 'name phone gstNumber address')
        .populate('customers.customer', 'customerId name phone')
        .populate('processedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(filter),
    ]);

    res.json({
      orders,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm a pre-order (move to confirmed status)
// @route   PUT /api/orders/:id/confirm
const confirmPreOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'preorder') return res.status(400).json({ message: 'Order is not in pre-order status' });

    // Validate payment — order must be fully paid
    if (order.paymentStatus !== 'paid') {
      const dueAmount = (order.grandTotal || 0) - ((order.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0));
      return res.status(400).json({
        message: `Cannot confirm pre-order #${order.invoiceNumber}: Payment is not complete. ₹${dueAmount.toFixed(2)} still due.`,
        paymentStatus: order.paymentStatus,
        dueAmount,
      });
    }

    // Validate customer IDs — all customers must have a Customer ID
    const missingIdCustomers = (order.customers || []).filter(c => !c.customerId && !c.customer?.customerId);
    if (missingIdCustomers.length > 0) {
      const names = missingIdCustomers.map(c => `"${c.customerName || c.customer?.name || 'Unknown'}"`).join(', ');
      return res.status(400).json({
        message: `Cannot confirm pre-order #${order.invoiceNumber}: Customer ID missing for ${names}. Please edit the pre-order to add Customer IDs first.`,
        missingCustomers: missingIdCustomers,
      });
    }

    order.status = 'confirmed';
    order.confirmedAt = new Date();
    await order.save();

    // Resolve any related preorder alerts
    await Alert.updateMany(
      { type: 'preorder_created', 'relatedTo.model': 'Order', isResolved: false },
      { isResolved: true }
    );

    // Send confirmation email
    const customerName = order.customers?.[0]?.customerName || '';
    sendOrderConfirmationEmail({
      order,
      customerName,
    }).catch((err) =>
      logger.error('Failed to send pre-order confirmation email', { error: err.message, orderId: order._id })
    );

    res.json({ message: 'Pre-order confirmed successfully', order });
  } catch (error) {
    next(error);
  }
};

// @desc    Update/edit a pre-order
// @route   PUT /api/orders/:id/pre-order
const updatePreOrder = async (req, res, next) => {
  try {
    const { customers, discount, notes, dealerName, dealerPhone, payments: newPayments } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'preorder') return res.status(400).json({ message: 'Order is not in pre-order status' });

    // Update customers if provided
    if (customers && customers.length > 0) {
      const processedCustomers = [];
      for (const c of customers) {
        const customerData = {
          customerName: c.name || c.customerName,
          customerId: c.customerId || undefined,
          customerPhone: c.phone || c.customerPhone,
          products: [],
          totalAmount: 0,
        };

        if (c.customerId) {
          const existingCustomer = await Customer.findOne({ customerId: c.customerId });
          if (existingCustomer) {
            customerData.customer = existingCustomer._id;
          }
        }

        processedCustomers.push(customerData);
      }
      order.customers = processedCustomers;
    }

    // Update discount if provided
    if (discount !== undefined) {
      order.discount = discount;
      // Recalculate grand total
      order.grandTotal = order.subtotal + (order.totalGst || 0) - discount;
    }

    if (notes !== undefined) order.notes = notes;
    if (dealerName !== undefined) order.dealerName = dealerName;
    if (dealerPhone !== undefined) order.dealerPhone = dealerPhone;

    // Add new payments if provided (append to existing payments)
    if (newPayments && newPayments.length > 0) {
      // Validate each new payment has a method and amount
      const validPayments = newPayments.filter(p => p.method && Number(p.amount) > 0);
      if (validPayments.length > 0) {
        order.payments = [
          ...(order.payments || []),
          ...validPayments.map(p => ({
            method: p.method,
            amount: Number(p.amount),
            transactionId: p.transactionId || '',
            reference: p.reference || '',
          })),
        ];

        // Recalculate payment status
        const totalPaid = order.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        if (totalPaid >= order.grandTotal) {
          order.paymentStatus = 'paid';
          // Resolve payment_pending alerts
          await Alert.updateMany(
            { type: 'payment_pending', isResolved: false },
            { isResolved: true }
          );
        } else if (totalPaid > 0) {
          order.paymentStatus = 'partial';
        } else {
          order.paymentStatus = 'pending';
        }
      }
    }

    await order.save();

    // If customer IDs are now provided, resolve alerts
    const hasCustomerIds = order.customers.every((c) => c.customerId);
    if (hasCustomerIds) {
      await Alert.updateMany(
        { type: 'preorder_created', isResolved: false },
        { isResolved: true }
      );
    }

    res.json({ message: 'Pre-order updated', order });
  } catch (error) {
    next(error);
  }
};

// @desc    Create web checkout order (from customer-facing site)
// @route   POST /api/orders
const createWebOrder = async (req, res, next) => {
  try {
    const { items, customer, payment, prescription, subtotal, gst, grandTotal, shipping, razorpay } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    if (!customer || !customer.name || !customer.phone) {
      return res.status(400).json({ message: 'Customer name and phone are required' });
    }

    // Process items - validate stock
    const processedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ message: `Product not found: ${item.name}` });
      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }

      const totalPrice = item.quantity * product.sellingPrice;
      const gstAmount = totalPrice * ((product.gst || 0) / 100);

      processedItems.push({
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        mrp: product.mrp,
        sellingPrice: product.sellingPrice,
        gst: product.gst || 0,
        totalPrice: totalPrice + gstAmount,
      });
    }

    const invoiceNumber = `WEB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const isPaid = payment?.method === 'razorpay' && razorpay?.razorpay_payment_id;
    const customerId = customer.customerId || '';

    // Build customer entry — look up existing customer if ID provided
    const customerEntry = {
      customerName: customer.name,
      customerPhone: customer.phone,
      products: processedItems,
      totalAmount: grandTotal || subtotal,
    };
    if (customerId) {
      customerEntry.customerId = customerId;
      const existingCustomer = await Customer.findOne({ customerId });
      if (existingCustomer) {
        customerEntry.customer = existingCustomer._id;
        existingCustomer.totalOrders += 1;
        await existingCustomer.save();
      }
    }

    const orderData = {
      invoiceNumber,
      orderType: 'online',
      status: 'pending', // All online orders start as pending for admin confirmation
      customers: [customerEntry],
      items: processedItems,
      subtotal: subtotal || processedItems.reduce((s, i) => s + i.sellingPrice * i.quantity, 0),
      totalGst: gst || 0,
      grandTotal: grandTotal || processedItems.reduce((s, i) => s + i.totalPrice, 0),
      paymentStatus: isPaid ? 'paid' : 'pending',
      payments: payment
        ? [
            {
              method: payment.method === 'razorpay' ? 'upi' : payment.method === 'cod' ? 'cash' : payment.method,
              amount: grandTotal || 0,
              transactionId: razorpay?.razorpay_payment_id || payment.transactionId || '',
              reference: razorpay?.razorpay_order_id || '',
            },
          ]
        : [],
      prescription: prescription || '',
      razorpayOrderId: razorpay?.razorpay_order_id || '',
      razorpayPaymentId: razorpay?.razorpay_payment_id || '',
      razorpaySignature: razorpay?.razorpay_signature || '',
      shipping: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        pincode: customer.pincode || '',
        courierPartner: 'Blue Dart',
        shippingCost: 499,
      },
      processedBy: req.user?._id,
    };

    // Do NOT reduce stock yet — stock is reduced when admin confirms the order

    const order = await Order.create(orderData);

    // Alert for new pending order (admin needs to confirm)
    await Alert.create({
      type: 'new_order',
      message: `New web order #${invoiceNumber} — ₹${(orderData.grandTotal || 0).toFixed(2)} (pending confirmation)`,
      severity: 'info',
      relatedTo: { model: 'Order', id: order._id },
    });

    // If customer ID is missing, generate alert like POS does
    if (!customerId) {
      await Alert.create({
        type: 'preorder_created',
        message: `Order #${invoiceNumber} — Customer ID not provided, requires confirmation`,
        severity: 'warning',
        relatedTo: { model: 'Order', id: order._id },
      });
    }

    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (error) {
    next(error);
  }
};

// @desc    Update shipping/tracking info
// @route   PUT /api/orders/:id/shipping
const updateShipping = async (req, res, next) => {
  try {
    const { trackingNumber, estimatedDelivery, status } = req.body;
    const updateFields = { 'shipping.trackingNumber': trackingNumber || '' };

    if (estimatedDelivery) {
      updateFields['shipping.estimatedDelivery'] = new Date(estimatedDelivery);
    }

    if (status === 'shipped') {
      updateFields.status = 'shipped';
      updateFields.shippedAt = new Date();
      updateFields['shipping.shippedAt'] = new Date();
    }

    if (status === 'delivered') {
      updateFields.status = 'delivered';
      updateFields.deliveredAt = new Date();
      updateFields['shipping.deliveredAt'] = new Date();
    }

    const order = await Order.findByIdAndUpdate(req.params.id, updateFields, { returnDocument: 'after' });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    res.json({ message: 'Shipping updated', order });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkTransactionId,
  createPOSOrder,
  createOnlineOrder,
  createWebOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  updateShipping,
  getPendingOrders,
  getMyOrders,
  getOrderStats,
  getPreOrders,
  confirmPreOrder,
  updatePreOrder,
};
