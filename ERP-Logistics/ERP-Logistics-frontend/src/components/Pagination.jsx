import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [5, 10, 20, 50],
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (validPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(validPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipses if many pages
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (validPage > 3) pages.push('...');
      const start = Math.max(2, validPage - 1);
      const end = Math.min(totalPages - 1, validPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (validPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-white border-t border-gray-100 text-xs font-medium text-gray-600">
      {/* Items info & Rows per page picker */}
      <div className="flex items-center gap-4">
        <span>
          Showing <strong className="text-gray-900 font-semibold">{startItem}</strong> to{' '}
          <strong className="text-gray-900 font-semibold">{endItem}</strong> of{' '}
          <strong className="text-gray-900 font-semibold">{totalItems}</strong> entries
        </span>
        {onItemsPerPageChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-gray-400">Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="px-2 py-1 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-gray-700 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page Navigation Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(validPage - 1)}
          disabled={validPage <= 1}
          className="p-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageNumbers().map((num, idx) =>
          num === '...' ? (
            <span key={`dots-${idx}`} className="px-2 text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={num}
              type="button"
              onClick={() => onPageChange(num)}
              className={`min-w-[30px] h-[30px] px-2 rounded-lg text-xs font-semibold transition ${
                validPage === num
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {num}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(validPage + 1)}
          disabled={validPage >= totalPages}
          className="p-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
