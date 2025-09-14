// src/components/teacher/Pagination.js
import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) {
        return null; // Don't show if there's only one page
    }

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <nav className="pagination-container">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-button"
            >
                &larr; Prev
            </button>
            {pages.map(page => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                >
                    {page}
                </button>
            ))}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-button"
            >
                Next &rarr;
            </button>
        </nav>
    );
};

export default Pagination;