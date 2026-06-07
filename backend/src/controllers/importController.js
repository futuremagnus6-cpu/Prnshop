const Product = require('../models/Product');
const Category = require('../models/Category');
const axios = require('axios');
const csv = require('csv-parse/sync');
const path = require('path');
const fs = require('fs');
const cheerio = require('cheerio');
const { generateSlug } = require('../utils/helpers');

// @desc    Import products from external source (URL or file upload)
// @route   POST /api/import/products
const importProducts = async (req, res, next) => {
  try {
    let externalProducts = [];
    let sourceName = '';

    // Option 1: File upload (CSV or JSON)
    if (req.files && req.files.length > 0) {
      const file = req.files[0];
      const ext = path.extname(file.originalname).toLowerCase();
      const content = fs.readFileSync(file.path, 'utf-8');
      sourceName = file.originalname;

      // Clean up temp file after reading
      try { fs.unlinkSync(file.path); } catch {}

      if (ext === '.csv') {
        const records = csv.parse(content, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
        externalProducts = records.map((r) => ({
          name: r.name || r.product_name || r.ProductName || r.title || '',
          price: parseFloat(r.price || r.selling_price || r.SellingPrice || r.Price || 0),
          mrp: parseFloat(r.mrp || r.MRP || r.original_price || 0),
          sellingPrice: parseFloat(r.selling_price || r.sellingPrice || r.price || r.Price || 0),
          stock: parseInt(r.stock || r.stock_quantity || r.StockQuantity || r.quantity || 0, 10),
          category: r.category || r.Category || '',
          barcode: r.barcode || r.Barcode || r.sku || r.SKU || '',
          description: r.description || r.Description || r.details || '',
          manufacturer: r.manufacturer || r.Manufacturer || r.brand || r.Brand || '',
          image: r.image || r.Image || r.image_url || r.ImageUrl || '',
          expiryDate: r.expiry_date || r.expiryDate || r.ExpiryDate || '',
          batchNumber: r.batch_number || r.batchNumber || r.BatchNumber || '',
          gst: parseFloat(r.gst || r.GST || r.tax || r.Tax || 0),
        }));
      } else if (ext === '.json') {
        const data = JSON.parse(content);
        const items = Array.isArray(data) ? data : data.products || data.items || data.data || [];
        externalProducts = items.map((r) => ({
          name: r.name || r.product_name || r.title || '',
          price: parseFloat(r.price || r.selling_price || 0),
          mrp: parseFloat(r.mrp || r.MRP || r.original_price || r.price || 0),
          sellingPrice: parseFloat(r.selling_price || r.sellingPrice || r.price || 0),
          stock: parseInt(r.stock || r.stock_quantity || r.quantity || 0, 10),
          category: r.category || '',
          barcode: r.barcode || r.sku || '',
          description: r.description || r.details || '',
          manufacturer: r.manufacturer || r.brand || '',
          image: r.image || r.image_url || '',
          expiryDate: r.expiry_date || r.expiryDate || '',
          batchNumber: r.batch_number || r.batchNumber || '',
          gst: parseFloat(r.gst || r.GST || r.tax || 0),
        }));
      } else {
        return res.status(400).json({ message: 'Unsupported file format. Please upload CSV or JSON.' });
      }
    }
    // Option 2: URL to scrape
    else if (req.body.url) {
      const url = req.body.url.trim();
      sourceName = url;

      const response = await axios.get(url, { timeout: 30000 });
      const rawData = response.data;
      const contentType = response.headers['content-type'] || '';

      // Determine if response is HTML
      const isHtml = contentType.includes('text/html') || (typeof rawData === 'string' && /<\s*!?\s*html/i.test(rawData));

      if (isHtml && typeof rawData === 'string') {
        // --- Scrape products from HTML page using cheerio ---
        const $ = cheerio.load(rawData);

        // Search for common product table patterns
        // Pattern 1: Bootstrap grid with product-name and pricing table (myriyansh.com style)
        const productCards = $('.productdiv, .product-card, .product-item, .product, [class*="product"]').filter(function () {
          return $(this).find('table').length > 0 || $(this).find('[class*="price"]').length > 0;
        }).toArray();

        if (productCards.length > 0) {
          // Extract from product card grid
          externalProducts = productCards.map((el) => {
            const $el = $(el);
            // Try various product name selectors
            const name = $el.find('.product_name, .product-name, .product-title, h2, h3, h4, .name, .title').first().text().trim()
              .replace(/\s+/g, ' ');

            // Extract image
            const img = $el.find('img').first().attr('src') || '';
            const image = img.startsWith('http') ? img : (img ? new URL(img, url).href : '');

            // Extract pricing from tables with MRP/DP/SP columns
            let mrp = 0, sellingPrice = 0, stock = 0;
            const $table = $el.find('table').first();
            const headerCells = $table.find('tr').first().find('td, th').map((_, c) => $(c).text().trim().toUpperCase()).get();
            const valueCells = $table.find('tr').eq(1).find('td').map((_, c) => $(c).text().trim()).get();

            headerCells.forEach((header, i) => {
              const val = parseFloat(valueCells[i]) || 0;
              if (header === 'MRP') mrp = val;
              else if (header === 'SP' || header === 'SELLING PRICE' || header === 'SELLING PRICE') sellingPrice = val;
              else if (header === 'DP' || header === 'DEALER PRICE') {
                // Use DP as selling price if no SP found
                if (!valueCells.find((_, j) => headerCells[j] === 'SP')) sellingPrice = val;
              }
              else if (header === 'STOCK' || header === 'QTY' || header === 'QUANTITY') stock = val;
            });

            return { name, image, mrp, sellingPrice, stock, barcode: '', description: '', category: '', manufacturer: '', gst: 0 };
          }).filter(p => p.name);
        } else {
          // Pattern 2: Look for standalone <table> elements with pricing data
          const tables = $('table').filter(function () {
            const text = $(this).text();
            return /mrp/i.test(text) || /price/i.test(text);
          }).toArray();

          externalProducts = tables.map((table) => {
            const $table = $(table);
            const rows = $table.find('tr').toArray();
            if (rows.length < 2) return null;

            const headers = $(rows[0]).find('td, th').map((_, c) => $(c).text().trim().toUpperCase()).get();
            const nameEl = $table.closest('div, section, article').find('.product_name, .product-name, .product-title, h2, h3, h4, .name, .title').first();
            const name = nameEl.text().trim().replace(/\s+/g, ' ') || '';
            const img = $table.closest('div, section, article').find('img').first().attr('src') || '';
            const image = img.startsWith('http') ? img : (img ? new URL(img, url).href : '');

            let mrp = 0, sellingPrice = 0, stock = 0;
            $(rows).slice(1).each((_, row) => {
              $(row).find('td').each((i, cell) => {
                const val = parseFloat($(cell).text().trim()) || 0;
                const header = headers[i] || '';
                if (header === 'MRP') mrp = val;
                else if (header === 'SP' || header === 'SELLING PRICE' || header === 'SELLING PRICE') sellingPrice = val;
                else if (header === 'DP' || header === 'DEALER PRICE') {
                  if (!headers.find(h => h === 'SP')) sellingPrice = val;
                }
                else if (header === 'STOCK' || header === 'QTY' || header === 'QUANTITY') stock = val;
              });
            });

            return name ? { name, image, mrp, sellingPrice, stock, barcode: '', description: '', category: '', manufacturer: '', gst: 0 } : null;
          }).filter(Boolean);
        }

        // Pattern 3: Fallback — scan entire page for product-like text patterns
        if (externalProducts.length === 0) {
          // Look for patterns like "NAME" followed by MRP/price values
          const bodyText = $('body').text();
          const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);
          
          // Try to find repeating patterns of name + price
          let i = 0;
          while (i < lines.length) {
            const line = lines[i];
            // Skip header-like lines
            if (/^(mrp|dp|sp|price|product|name|our|welcome|home|about|contact)/i.test(line) || line.length < 3) {
              i++;
              continue;
            }
            // Look ahead up to 6 lines for numeric values
            let values = [];
            let scanPos = i + 1;
            while (scanPos < lines.length && scanPos < i + 6 && values.length < 3) {
              const num = parseFloat(lines[scanPos]);
              if (!isNaN(num) && lines[scanPos].trim() === String(num)) {
                values.push(num);
              } else if (/^(mrp|dp|sp|rs|₹)/i.test(lines[scanPos])) {
                // skip header labels
              } else {
                break; // non-numeric content — likely end of this product
              }
              scanPos++;
            }
            if (values.length >= 2 && line.length > 2) {
              externalProducts.push({
                name: line.replace(/\s+/g, ' ').trim(),
                image: '',
                mrp: values[0] || 0,
                sellingPrice: values[1] || 0,
                stock: parseInt(values[2]) || 0,
                barcode: '', description: '', category: '', manufacturer: '', gst: 0,
              });
              i = scanPos;
            } else {
              i++;
            }
          }
        }

        if (externalProducts.length === 0) {
          return res.status(400).json({
            message: 'Could not find product data in the HTML page. The page may use an unsupported structure.',
          });
        }
      } else if (typeof rawData === 'object') {
        const items = Array.isArray(rawData) ? rawData : rawData.products || rawData.items || rawData.data || [];
        externalProducts = items.map((r) => ({
          name: r.name || r.product_name || r.title || '',
          price: parseFloat(r.price || r.selling_price || 0),
          mrp: parseFloat(r.mrp || r.MRP || r.original_price || r.price || 0),
          sellingPrice: parseFloat(r.selling_price || r.sellingPrice || r.price || 0),
          stock: parseInt(r.stock || r.stock_quantity || r.quantity || 0, 10),
          category: r.category || '',
          barcode: r.barcode || r.sku || '',
          description: r.description || r.details || '',
          manufacturer: r.manufacturer || r.brand || '',
          image: r.image || r.image_url || '',
          expiryDate: r.expiry_date || r.expiryDate || '',
          batchNumber: r.batch_number || r.batchNumber || '',
          gst: parseFloat(r.gst || r.GST || r.tax || 0),
        }));
      } else {
        // Try to parse JSON string
        try {
          const parsed = JSON.parse(rawData);
          const items = Array.isArray(parsed) ? parsed : parsed.products || parsed.items || parsed.data || [];
          externalProducts = items.map((r) => ({
            name: r.name || r.product_name || r.title || '',
            price: parseFloat(r.price || r.selling_price || 0),
            mrp: parseFloat(r.mrp || r.MRP || r.original_price || r.price || 0),
            sellingPrice: parseFloat(r.selling_price || r.sellingPrice || r.price || 0),
            stock: parseInt(r.stock || r.stock_quantity || r.quantity || 0, 10),
            category: r.category || '',
            barcode: r.barcode || r.sku || '',
            description: r.description || r.details || '',
            manufacturer: r.manufacturer || r.brand || '',
            image: r.image || r.image_url || '',
            expiryDate: r.expiry_date || r.expiryDate || '',
            batchNumber: r.batch_number || r.batchNumber || '',
            gst: parseFloat(r.gst || r.GST || r.tax || 0),
          }));
        } catch {
          return res.status(400).json({
            message: 'Could not parse response. The URL must return a JSON API or an HTML product listing page.',
          });
        }
      }
    } else {
      return res.status(400).json({
        message: 'Please provide either a product URL to import from, or upload a CSV/JSON file.',
      });
    }

    if (!Array.isArray(externalProducts) || externalProducts.length === 0) {
      return res.status(400).json({ message: 'No products found in the provided source.' });
    }

    const results = { imported: 0, skipped: 0, errors: [], skippedDetails: [] };

    // Track duplicates within the current import batch
    const seenBarcodes = new Set();
    const seenNames = new Set();

    for (const ext of externalProducts) {
      try {
        if (!ext.name) {
          results.skipped++;
          results.skippedDetails.push({ name: '(empty)', reason: 'Product name is missing' });
          continue;
        }

        // --- Intra-batch duplicate detection ---
        const barcodeLower = ext.barcode ? ext.barcode.toLowerCase().trim() : '';
        const nameLower = ext.name.toLowerCase().trim();
        let duplicateReason = '';

        if (barcodeLower && seenBarcodes.has(barcodeLower)) {
          duplicateReason = `Duplicate barcode "${ext.barcode}" within the import file`;
        } else if (!barcodeLower && seenNames.has(nameLower)) {
          duplicateReason = `Duplicate name "${ext.name}" within the import file`;
        }

        if (duplicateReason) {
          results.skipped++;
          results.skippedDetails.push({ name: ext.name, reason: duplicateReason });
          continue;
        }

        if (barcodeLower) {
          seenBarcodes.add(barcodeLower);
        }
        seenNames.add(nameLower);

        // --- Cross-DB duplicate detection ---
        // Check by barcode first (most reliable), then by name as fallback
        let existing = null;
        let dbDuplicateReason = '';

        if (ext.barcode) {
          existing = await Product.findOne({ barcode: ext.barcode });
          if (existing) {
            dbDuplicateReason = `Product with barcode "${ext.barcode}" already exists (ID: ${existing._id})`;
          }
        }

        if (!existing) {
          existing = await Product.findOne({ name: ext.name });
          if (existing) {
            dbDuplicateReason = `Product with name "${ext.name}" already exists (ID: ${existing._id})`;
          }
        }

        if (existing) {
          results.skipped++;
          results.skippedDetails.push({ name: ext.name, reason: dbDuplicateReason });
          continue;
        }

        // Find or create a default category
        let category = await Category.findOne({ name: ext.category || 'Imported' });
        if (!category) {
          category = await Category.create({
            name: ext.category || 'Imported',
            slug: (ext.category || 'imported').toLowerCase().replace(/\s+/g, '-'),
          });
        }

        await Product.create({
          name: ext.name,
          slug: generateSlug(ext.name) + '-' + Date.now().toString(36),
          images: ext.image ? [ext.image] : [],
          category: category._id,
          mrp: ext.mrp || ext.price || 0,
          sellingPrice: ext.sellingPrice || ext.price || 0,
          stockQuantity: ext.stock || 0,
          batchNumber: ext.batchNumber || `IMP-${Date.now()}`,
          expiryDate: ext.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          barcode: ext.barcode || '',
          description: ext.description || '',
          manufacturer: ext.manufacturer || '',
          gst: ext.gst || 0,
        });

        results.imported++;
      } catch (err) {
        results.errors.push({ name: ext.name, error: err.message });
      }
    }

    res.json({
      message: `Import completed from "${sourceName}": ${results.imported} imported, ${results.skipped} skipped`,
      results,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { importProducts };
