import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, index: true },
  slug: { type: String, required: true, unique: true, index: true },
  price: { type: Number, required: true },
  compareAtPrice: { type: Number },
  description: { type: String, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true, index: true },
  tags: { type: [String], default: [], index: true },
  stock: { type: Number, required: true, default: 0 },
  reservedStock: { type: Number, required: true, default: 0 },
  availableStock: { type: Number, required: true, default: 0 },
  soldCount: { type: Number, required: true, default: 0 },
  lowStockThreshold: { type: Number, required: true, default: 5 },
  reservationEnabled: { type: Boolean, required: true, default: true },
  reservationHours: { type: Number, required: true, default: 3 },
  inventoryStatus: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out Of Stock'],
    default: 'Out Of Stock'
  }
}, { timestamps: true });

// Pre-validate hook to generate slug before validation runs
ProductSchema.pre('validate', function (next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  next();
});

// Pre-save middleware to dynamically compute availability status
ProductSchema.pre('save', function (next) {
  this.availableStock = Math.max(0, this.stock - this.reservedStock);
  if (this.availableStock > this.lowStockThreshold) {
    this.inventoryStatus = 'In Stock';
  } else if (this.availableStock > 0) {
    this.inventoryStatus = 'Low Stock';
  } else {
    this.inventoryStatus = 'Out Of Stock';
  }
  next();
});

const Product = mongoose.model('Product', ProductSchema);
export default Product;
