import { Response } from 'express';
import { ApiResponse, PaginatedResponse, PaginationMeta } from '../types';

export class ResponseHelper {
  static success<T>(res: Response, data: T, message: string, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    } as ApiResponse<T>);
  }

  static error(res: Response, message: string, statusCode = 500) {
    return res.status(statusCode).json({
      success: false,
      message
    } as ApiResponse);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    meta: PaginationMeta,
    message: string,
    statusCode = 200
  ) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      meta
    } as PaginatedResponse<T>);
  }
}