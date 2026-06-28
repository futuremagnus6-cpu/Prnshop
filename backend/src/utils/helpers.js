const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const generateSlug = (text) => {
  const slugify = require('slugify');
  return slugify(text, { lower: true, strict: true });
};

const paginate = (page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;
  return { pageNum, limitNum, skip };
};

const generateInvoiceNumber = (prefix = 'INV') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

const generatePDF = async (order) => {
  // Lazy-load pdfkit to avoid requiring it at startup
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  
  // Collect PDF chunks into a buffer
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  
  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
    doc.moveDown(0.5);
    
    // Invoice details
    doc.fontSize(10).font('Helvetica');
    doc.text(`Invoice #: ${order.invoiceNumber || 'N/A'}`, { align: 'left' });
    doc.text(`Date: ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}`);
    doc.text(`Order Type: ${order.orderType || 'N/A'}`);
    doc.moveDown(1);
    
    // Dealer/Customer info
    if (order.dealerName) {
      doc.text(`Supplier: ${order.dealerName}`);
      if (order.dealerPhone) doc.text(`Phone: ${order.dealerPhone}`);
      if (order.dealerAddress) doc.text(`Address: ${order.dealerAddress}`);
      doc.moveDown(0.5);
    }
    
    if (order.customers && order.customers.length > 0) {
      doc.text(`Customer: ${order.customers[0].customerName || 'N/A'}`);
      if (order.customers[0].customerId) doc.text(`ID: ${order.customers[0].customerId}`);
      if (order.customers[0].customerPhone) doc.text(`Phone: ${order.customers[0].customerPhone}`);
      doc.moveDown(0.5);
    }
    
    // Items table header
    doc.moveDown(0.5);
    doc.fontSize(8).font('Helvetica-Bold');
    const tableTop = doc.y;
    const col1 = 50, col2 = 200, col3 = 300, col4 = 370, col5 = 450;
    
    doc.text('Product', col1, tableTop, { width: 140 });
    doc.text('Qty', col2, tableTop, { width: 50, align: 'center' });
    doc.text('Rate', col3, tableTop, { width: 60, align: 'right' });
    doc.text('GST', col4, tableTop, { width: 50, align: 'right' });
    doc.text('Total', col5, tableTop, { width: 70, align: 'right' });
    
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(8);
    
    // Items
    let y = doc.y;
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        if (y > 720) {
          doc.addPage();
          y = 50;
        }
        doc.text(item.productName || 'N/A', col1, y, { width: 140 });
        doc.text(String(item.quantity || 0), col2, y, { width: 50, align: 'center' });
        doc.text(`₹${(item.sellingPrice || 0).toFixed(2)}`, col3, y, { width: 60, align: 'right' });
        doc.text(`${item.gst || 0}%`, col4, y, { width: 50, align: 'right' });
        doc.text(`₹${(item.totalPrice || 0).toFixed(2)}`, col5, y, { width: 70, align: 'right' });
        y += 16;
      }
    }
    
    // Totals
    y += 10;
    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(`Subtotal: ₹${(order.subtotal || 0).toFixed(2)}`, { align: 'right' });
    if (order.totalGst) doc.text(`GST: ₹${order.totalGst.toFixed(2)}`, { align: 'right' });
    if (order.discount) doc.text(`Discount: -₹${order.discount.toFixed(2)}`, { align: 'right' });
    doc.text(`Grand Total: ₹${(order.grandTotal || 0).toFixed(2)}`, { align: 'right' });
    
    // Footer
    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica');
    doc.text('Thank you for your business!', { align: 'center' });
    
    doc.end();
  });
};

module.exports = {
  generateToken,
  generateRefreshToken,
  generateResetToken,
  generateSlug,
  paginate,
  generateInvoiceNumber,
  generatePDF,
};
