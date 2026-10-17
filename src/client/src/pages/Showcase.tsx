import React from 'react';
import { useShowcase } from '../hooks/useShowcase';
import { ShowcaseCard } from '../components/showcase/ShowcaseCard';
import {
  ShowcaseCategoryFilter,
  ShowcaseEmptyState,
  ShowcaseHeader,
} from '../components/showcase/ShowcaseSections';

export const Showcase: React.FC = () => {
  const {
    filtered,
    loading,
    categoryFilter,
    setCategoryFilter,
    loadShowcase,
    copySalesPitch,
    copyDirectLink,
  } = useShowcase();

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      <ShowcaseHeader loading={loading} onRefresh={loadShowcase} />

      <ShowcaseCategoryFilter value={categoryFilter} onChange={setCategoryFilter} />

      {/* Grid de Proyectos */}
      {filtered.length === 0 ? (
        <ShowcaseEmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filtered.map((p) => (
            <ShowcaseCard
              key={p.id}
              p={p}
              onCopySalesPitch={copySalesPitch}
              onCopyDirectLink={copyDirectLink}
            />
          ))}
        </div>
      )}
    </div>
  );
};
