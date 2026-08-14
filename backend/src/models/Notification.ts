import mongoose, { Schema, Model } from "mongoose";

type NotificationKind = "ARRIVAL_5MI" | "STATUS" | "DOC" | "EXCEPTION" | "SYSTEM" | "ASSIGNMENT";

interface INotification {
  _id: string;
  loadId?: string;
  companyId?: string;
  userId?: string;
  kind: NotificationKind;
  title?: string;
  body?: string;
  at?: string;
  read?: boolean;
  pinned?: boolean;
}

type NotificationModel = Model<INotification>;

const notificationSchema = new Schema<INotification, NotificationModel>(
  {
    _id: { type: String, required: true },
    loadId: String,
    companyId: { type: String, index: true }, // Add companyId for proper filtering
    userId: String, // Optional: specific user notification
    kind: {
      type: String,
      enum: ["ARRIVAL_5MI", "STATUS", "DOC", "EXCEPTION", "SYSTEM", "ASSIGNMENT"],
      required: true,
    },
    title: String,
    body: String,
    at: String,
    read: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
  },
  { versionKey: false, _id: false, timestamps: true }
);

const Notification = mongoose.model<INotification, NotificationModel>("Notification", notificationSchema);

export default Notification;
