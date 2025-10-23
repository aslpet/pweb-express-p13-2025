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
    const totalPages = Math.ceil(total / limit);
    
    return {
      page,
      limit,
      prev_page: page > 1 ? page - 1 : null,
      next_page: page < totalPages ? page + 1 : null
    };
  }
}