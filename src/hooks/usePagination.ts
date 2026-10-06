import { useState, useMemo, useEffect } from 'react';

// Hook de paginação client-side: fatio os dados já carregados.
// Reset para página 1 quando os dados mudam (filtro/busca).
export function usePagination<T>(
  items: T[],
  pageSize: number = 20,
  filterKey?: string,
) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Reset quando o filtro/busca muda
  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  // Clamp se a página atual excede o total
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  const paginatedWithTotal = {
    items: paginated,
    page: safePage,
    totalItems: items.length,
    totalPages,
    setPage,
  };
  return paginatedWithTotal;
}
