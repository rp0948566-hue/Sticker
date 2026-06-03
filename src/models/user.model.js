import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  authSalt: { type: String, required: true, default: () => Math.random().toString(36).substring(2) }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
export default User;
