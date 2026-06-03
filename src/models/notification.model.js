import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['order', 'inventory', 'system', 'security_alert'],
    required: true
  },
  title: { type: String },
  message: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  metadata: { type: mongoose.Schema.Types.Mixed },
  // Legacy field — keep for backward compatibility
  read: { type: Boolean, default: false },
  // Canonical field used by security system
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

// Auto-purge notifications older than 30 days to protect database capacity limits
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

// Optimize descending sorts on notifications
NotificationSchema.index({ createdAt: -1 });

// Optimize read filter queries
NotificationSchema.index({ read: 1 });
NotificationSchema.index({ isRead: 1 });
NotificationSchema.index({ type: 1, isRead: 1 });

const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification;
