import { PaginationQueryDto } from '../dto/pagination-query.dto';

export function resolvePagination(query?: PaginationQueryDto) {
  const page = Math.max(1, query?.page ?? 1);
  const limit = Math.max(1, Math.min(100, query?.limit ?? 10));
  const start = (page - 1) * limit;
  return { page, limit, start };
}

export function paginateArray<T>(items: T[], query?: PaginationQueryDto) {
  const { page, limit, start } = resolvePagination(query);
  const data = items.slice(start, start + limit);

  return {
    data,
    meta: {
      page,
      limit,
      total: items.length,
    },
  };
}
