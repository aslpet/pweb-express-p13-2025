import { PaginationQuery, PaginationMeta } from '../types';

export class PaginationHelper {
  static getPaginationParams(query: PaginationQuery) {
    const page = Math.max(1, parseInt(query.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10')));
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  static createMeta(
    page: number,
    limit: number,
    total: number
  ): PaginationMeta {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }
}