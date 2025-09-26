import React from 'react';
import styles from './Pagination.module.css';

interface PaginationProps {
  currentIndex: number;
  totalItems: number;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({ 
  currentIndex, 
  totalItems, 
  onPrevious, 
  onNext,
  className = ''
}) => {
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalItems - 1;

  return (
    <div className={`${styles.pagination} ${className}`}>
      <button 
        className={`${styles.paginationButton} ${isFirst ? styles.disabled : ''}`}
        onClick={onPrevious}
        disabled={isFirst}
        title="Предыдущий раздел"
      >
        ← Назад
      </button>
      
      <div className={styles.paginationInfo}>
        <span className={styles.currentPage}>{currentIndex + 1}</span>
        <span className={styles.separator}>из</span>
        <span className={styles.totalPages}>{totalItems}</span>
      </div>
      
      <button 
        className={`${styles.paginationButton} ${isLast ? styles.disabled : ''}`}
        onClick={onNext}
        disabled={isLast}
        title="Следующий раздел"
      >
        Вперёд →
      </button>
    </div>
  );
};

export default Pagination;
