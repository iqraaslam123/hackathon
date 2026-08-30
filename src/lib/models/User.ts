import mongoose, { Schema, type Model, type InferSchemaType } from "mongoose";

export const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: { type: String, default: null },
    emailOtpHash: { type: String, default: null },
    emailOtpExpires: { type: Date, default: null },
    resetTokenHash: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null },
    googleId: { type: String, default: null },
    provider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
    },
    role: {
      type: String,
      enum: ["customer", "agent", "admin"],
      default: "customer",
      index: true,
    },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type UserType = InferSchemaType<typeof userSchema>;

const UserModel: Model<UserType> =
  (mongoose.models.User as Model<UserType>) ||
  mongoose.model<UserType>("User", userSchema);

export default UserModel;
