import mongoose, { Schema, Model } from "mongoose";
import bcrypt from "bcryptjs";

type Role = "SUPER_ADMIN" | "CARRIER_CORP" | "CARRIER_BRANCH" | "BROKER_CORP" | "BROKER_BRANCH" | "SHIPPER_RECEIVER" | "DRIVER";

interface IDriver {
  phone: string; // Required for drivers, must be unique
  photoUrl?: string;
  status: "AVAILABLE" | "ON_LOAD" | "OFF_DUTY" | "INACTIVE";
  carrierId?: string; // For drivers, which carrier they belong to
  addresses?: string[];
  phones?: string[];
  emergencyContacts?: { name: string; phone: string }[];
  licenses?: { state: string; number: string; class: string; expiry: string }[];
  twic?: { number: string; expiry: string };
  passport?: { number: string; expiry: string };
  endorsements?: string[];
  medicalCertExpiry?: string;
  workHistory?: { employer: string; from: string; to: string }[];
  currentTractorId?: string;
  currentTrailerId?: string;
  currentLoadId?: string;
  rating?: number;
  loadsCompleted?: number;
  lastPing?: { lat: number; lng: number; at: string };
}

interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  companyId: string;
  branchIds: string[];
  permissions: string[];
  lastActive?: string;
  avatarUrl?: string;
  
  // Driver-specific data (nested object when role is DRIVER)
  driver?: IDriver;
}

interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

type UserModel = Model<IUser, {}, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    _id: { type: String, required: true }, // e.g. 'usr-1'
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: [
        "SUPER_ADMIN",
        "CARRIER_CORP",
        "CARRIER_BRANCH",
        "BROKER_CORP",
        "BROKER_BRANCH",
        "SHIPPER_RECEIVER",
        "DRIVER",
      ],
      required: true,
      immutable: true,
    },
    companyId: { type: String, required: true, index: true },
    branchIds: [{ type: String }], // may include 'ALL'
    permissions: [String],
    lastActive: String,
    avatarUrl: String,
    
    // Driver-specific data (nested object)
    driver: {
      phone: {
        type: String,
        required: function(this: any) {
          return this.role === "DRIVER";
        },
        trim: true,
      },
      photoUrl: String,
      status: {
        type: String,
        enum: ["AVAILABLE", "ON_LOAD", "OFF_DUTY", "INACTIVE"],
        default: "AVAILABLE",
      },
      carrierId: { type: String, index: true }, // For drivers, which carrier they belong to
      addresses: [String],
      phones: [String],
      emergencyContacts: [{ name: String, phone: String }],
      licenses: [{ state: String, number: String, class: String, expiry: String }],
      twic: { number: String, expiry: String },
      passport: { number: String, expiry: String },
      endorsements: [String],
      medicalCertExpiry: String,
      workHistory: [{ employer: String, from: String, to: String }],
      currentTractorId: String,
      currentTrailerId: String,
      currentLoadId: String,
      rating: { type: Number, default: 5 },
      loadsCompleted: { type: Number, default: 0 },
      lastPing: { lat: Number, lng: Number, at: String },
    },
  },
  { versionKey: false, timestamps: true }
);

userSchema.pre("save", async function (next) {
  const user = this as any;
  if (!user.isModified("password")) return next();
  user.password = await bcrypt.hash(user.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, (this as any).password);
};

// Unique index for driver phone numbers
userSchema.index(
  { "driver.phone": 1 },
  {
    unique: true,
    partialFilterExpression: {
      role: "DRIVER",
      "driver.phone": { $type: "string" },
    },
  }
);

const User = mongoose.model<IUser, UserModel>("User", userSchema);

export default User;
export type { IDriver, IUser, Role };
