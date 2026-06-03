import Product from '../models/product.model.js';
import Notification from '../models/notification.model.js';
import { logEvent } from '../utils/logger.js';
import { triggerPassiveCleanup } from '../services/reservation.service.js';
import { encodeCursor, decodeCursor } from '../utils/cursor.js';

// V1 Product Listings API (Cursor-based Pagination)
export const getProducts = async (req, res, next) => {
  try {
    await triggerPassiveCleanup();

    const limit = parseInt(req.query.limit) || 12;
    const { cursor, category, search } = req.query;

    const query = {};

    if (category) {
      query.category = String(category);
    }

    if (search) {
      query.$or = [
        { title: { $regex: String(search), $options: 'i' } },
        { description: { $regex: String(search), $options: 'i' } }
      ];
    }

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded && decoded.id) {
        // Query products with ID less than the cursor (sorting by _id: -1)
        query._id = { $lt: decoded.id };
      }
    }

    // Fetch limit + 1 to determine hasMore
    const products = await Product.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1);

    const hasMore = products.length > limit;
    if (hasMore) {
      products.pop();
    }

    const nextCursor = products.length > 0
      ? encodeCursor({ id: products[products.length - 1]._id })
      : null;

    res.json({
      products,
      nextCursor,
      hasMore
    });
  } catch (error) {
    next(error);
  }
};

// Legacy Product Listings API (Unpaginated for Backward Compatibility)
export const getProductsLegacy = async (req, res, next) => {
  try {
    await triggerPassiveCleanup();
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    next(error);
  }
};

// Product Details API
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    next(error);
  }
};

// Admin Product Create
export const createProduct = async (req, res, next) => {
  try {
    const { title, sku, price, compareAtPrice, description, image, category, tags, stock, lowStockThreshold, reservationEnabled, reservationHours } = req.body;

    const product = new Product({
      title,
      sku,
      price,
      compareAtPrice,
      description,
      image,
      category,
      tags: tags || [],
      stock: stock || 0,
      lowStockThreshold: lowStockThreshold || 5,
      reservationEnabled: reservationEnabled !== false,
      reservationHours: reservationHours || 0.25
    });

    const createdProduct = await product.save();
    logEvent('info', 'PRODUCT_CRUD', `Product created: ${createdProduct.title} (SKU: ${createdProduct.sku})`);
    res.status(201).json(createdProduct);
  } catch (error) {
    next(error);
  }
};

// Admin Product Update
export const updateProduct = async (req, res, next) => {
  try {
    const { title, sku, price, compareAtPrice, description, image, category, tags, stock, lowStockThreshold, reservationEnabled, reservationHours } = req.body;

    const product = await Product.findById(req.params.id);
    if (product) {
      const oldStock = product.stock;
      const stockChanged = stock !== undefined && oldStock !== Number(stock);
      
      product.title = title ?? product.title;
      product.sku = sku ?? product.sku;
      product.price = price ?? product.price;
      product.compareAtPrice = compareAtPrice ?? product.compareAtPrice;
      product.description = description ?? product.description;
      product.image = image ?? product.image;
      product.category = category ?? product.category;
      product.tags = tags ?? product.tags;
      product.stock = stock ?? product.stock;
      product.lowStockThreshold = lowStockThreshold ?? product.lowStockThreshold;
      product.reservationEnabled = reservationEnabled ?? product.reservationEnabled;
      product.reservationHours = reservationHours ?? product.reservationHours;

      const updatedProduct = await product.save();

      if (stockChanged) {
        logEvent('info', 'PRODUCT_STOCK', `Admin manually updated stock for "${product.title}" from ${oldStock} to ${product.stock}.`);
        await Notification.create({
          type: 'inventory',
          message: `Product "${product.title}" stock manually updated to ${product.stock} units.`
        });
      }

      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    next(error);
  }
};

// Admin Product Delete
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      await product.deleteOne();
      logEvent('info', 'PRODUCT_CRUD', `Product removed: ${product.title}`);
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    next(error);
  }
};

// Manual Stock Editor API
export const updateProductStock = async (req, res, next) => {
  try {
    const { stock } = req.body;
    if (stock === undefined || isNaN(stock)) {
      return res.status(400).json({ message: 'Invalid stock count value' });
    }

    const product = await Product.findById(req.params.id);
    if (product) {
      const oldStock = product.stock;
      product.stock = Number(stock);
      await product.save();

      logEvent('info', 'PRODUCT_STOCK_EDIT', `Admin manually updated stock for ${product.title} from ${oldStock} to ${product.stock}.`);

      await Notification.create({
        type: 'inventory',
        message: `Admin manually edited stock of "${product.title}" from ${oldStock} to ${product.stock}.`
      });

      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    next(error);
  }
};
