import mongoose from 'mongoose';

export const USER_ROLES = ['ADMIN', 'STAFF', 'KITCHEN', 'CUSTOMER'];

const addressSchema = new mongoose.Schema(
  {
    label:       { type: String, default: 'Home', trim: true },
    addressText: { type: String, required: true, trim: true },
    landmark:    { type: String, default: '', trim: true },
    lat:         { type: Number, default: null },
    lng:         { type: Number, default: null }
  },
  { _id: true, timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    email:        { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone:        { type: String, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role:         { type: String, enum: USER_ROLES, required: true },
    isActive:     { type: Boolean, default: true },
    // Customer-specific
    addresses:    { type: [addressSchema], default: [] }
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const user = this.toObject();
  delete user.passwordHash;
  return user;
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  }
});

export default mongoose.model('User', userSchema);
