import React from 'react';
import { Search, XCircle, RotateCcw } from 'lucide-react';

export default function FilterBar({
  searchQuery,
  onSearchChange,
  selectedRegion,
  onRegionChange,
  selectedCity,
  onCityChange,
  selectedStyle,
  onStyleChange,
  regions = [],
  cities = [],
  styles = [],
  onReset,
  hasActiveFilters,
}) {
  return (
    <div className="p-3 border-b border-neutral-200 bg-neutral-50/70 space-y-2.5">
      
      {/* 1. Поисковая строка с крестиком сброса */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 text-neutral-400 pointer-events-none" size={15} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Поиск по названию, автору, году, стилю..."
          className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-neutral-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400 transition"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 text-neutral-400 hover:text-neutral-700 transition"
            title="Очистить поиск"
          >
            <XCircle size={15} />
          </button>
        )}
      </div>

      {/* 2. Три выпадающих списка: Регион, Город, Стиль */}
      <div className="grid grid-cols-3 gap-2">
        {/* Регион */}
        <select
          value={selectedRegion}
          onChange={(e) => onRegionChange(e.target.value)}
          className="text-xs bg-white border border-neutral-250 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-neutral-700 truncate"
        >
          <option value="">Все регионы</option>
          {regions.map((reg) => (
            <option key={reg} value={reg}>
              {reg}
            </option>
          ))}
        </select>

        {/* Город */}
        <select
          value={selectedCity}
          onChange={(e) => onCityChange(e.target.value)}
          className="text-xs bg-white border border-neutral-250 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-neutral-700 truncate"
        >
          <option value="">Все города</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>

        {/* Стиль */}
        <select
          value={selectedStyle}
          onChange={(e) => onStyleChange(e.target.value)}
          className="text-xs bg-white border border-neutral-250 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-neutral-700 truncate"
        >
          <option value="">Все стили</option>
          {styles.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Кнопка сброса */}
      {hasActiveFilters && (
        <div className="flex justify-end pt-0.5">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 transition underline underline-offset-2"
          >
            <RotateCcw size={12} />
            Сбросить все фильтры
          </button>
        </div>
      )}

    </div>
  );
}