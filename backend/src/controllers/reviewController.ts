import { Request, Response } from "express";
import asyncHandler from "../middleware/asyncHandler";
import Review from "../models/Review";

// GET /api/reviews?subjectId=
const getReviews = asyncHandler(async (req: Request, res: Response) => {
  const { subjectId } = req.query;
  const query = subjectId ? { subjectId } : {};
  const reviews = await Review.find(query).sort({ date: -1 });
  res.json({ success: true, data: reviews });
});

export { getReviews };
