import { Request, Response, NextFunction } from 'express';

function notFound(req: Request, res: Response, next: NextFunction) {
  const error = new Error(`Not found - ${req.originalUrl}`);
  (error as any).statusCode = 404;
  next(error);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.statusCode || res.statusCode >= 400 ? res.statusCode : 500;
  const code = err.statusCode || statusCode || 500;
  res.status(code).json({
    success: false,
    message: err.message || "Server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}

export { notFound, errorHandler };
