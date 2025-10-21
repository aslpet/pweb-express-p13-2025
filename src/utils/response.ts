import { Response } from 'express';
import { ApiResponse, PaginatedResponse, PaginationMeta } from '../types';

export class ResponseHelper {
  static success<T>(res: Response, data: T, message?: string, statusCode = 200) {
    return res.status(statusCode).json({
      status: 'success',
      message,
      data
    } as ApiResponse<T>);
  }

  static error(res: Response, message: string, statusCode = 500) {
    return res.status(statusCode).json({
      status: 'error',
      message
    } as ApiResponse);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    meta: PaginationMeta,
    statusCode = 200
  ) {
    return res.status(statusCode).json({
      status: 'success',
      data,
      meta
    } as PaginatedResponse<T>);
  }
}