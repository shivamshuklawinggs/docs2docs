import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    subjectId: { type: String, required: true, index: true },
    subjectType: { type: String, enum: ["DRIVER", "CARRIER", "BROKER", "SHIPPER"], required: true },
    reviewerName: String,
    reviewerRole: String,
    loadRef: String,
    stars: { type: Number, min: 1, max: 5 },
    comment: String,
    date: String,
    response: String,
  },
  { versionKey: false, timestamps: true }
);

const Review = mongoose.model("Review", reviewSchema);

export default Review;
