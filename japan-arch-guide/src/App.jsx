import React, { useState, useEffect, useMemo, useCallback } from 'react';
import MapView from './components/MapView';
import DetailPanel from './components/DetailPanel';
import FilterBar from './components/FilterBar';
import { Compass } from 'lucide-react';

export default function App() {
  const [places, setPlaces] = useState([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);

  // Фильтры
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');

  // Загрузка GeoJSON
  useEffect(() => {
    fetch('/data/architecture_japan.geojson')
      .then((res) => {
        if (!res.ok) throw new Error('Не удалось загрузить GeoJSON');
        return res.json();
      })
      .then((data) => {
        if (data && data.features) {
          setPlaces(data.features);
        }
      })
      .catch((err) => console.error('Ошибка загрузки данных:', err));
  }, []);

  const getCleanStyle = (rawStyle) => {
    return rawStyle ? rawStyle.replace(/\s*\(.*\)/, '').trim() : '';
  };

  // Взаимозависимые списки опций
  const availableRegions = useMemo(() => {
    const set = new Set();
    const query = searchQuery.toLowerCase().trim();

    places.forEach((p) => {
      const props = p.properties || {};
      if (selectedCity && props.city?.trim() !== selectedCity) return;
      if (selectedStyle && !props.style?.toLowerCase().includes(selectedStyle.toLowerCase())) return;
      if (query) {
        const str = `${props.name_ru || ''} ${props.name_en || ''} ${props.name_ja || ''} ${props.architect || ''} ${props.year_built || ''}`.toLowerCase();
        if (!str.includes(query)) return;
      }
      if (props.region) set.add(props.region.trim());
    });

    return Array.from(set).sort();
  }, [places, selectedCity, selectedStyle, searchQuery]);

  const availableCities = useMemo(() => {
    const set = new Set();
    const query = searchQuery.toLowerCase().trim();

    places.forEach((p) => {
      const props = p.properties || {};
      if (selectedRegion && props.region?.trim() !== selectedRegion) return;
      if (selectedStyle && !props.style?.toLowerCase().includes(selectedStyle.toLowerCase())) return;
      if (query) {
        const str = `${props.name_ru || ''} ${props.name_en || ''} ${props.name_ja || ''} ${props.architect || ''} ${props.year_built || ''}`.toLowerCase();
        if (!str.includes(query)) return;
      }
      if (props.city) set.add(props.city.trim());
    });

    return Array.from(set).sort();
  }, [places, selectedRegion, selectedStyle, searchQuery]);

  const availableStyles = useMemo(() => {
    const set = new Set();
    const query = searchQuery.toLowerCase().trim();

    places.forEach((p) => {
      const props = p.properties || {};
      if (selectedRegion && props.region?.trim() !== selectedRegion) return;
      if (selectedCity && props.city?.trim() !== selectedCity) return;
      if (query) {
        const str = `${props.name_ru || ''} ${props.name_en || ''} ${props.name_ja || ''} ${props.architect || ''} ${props.year_built || ''}`.toLowerCase();
        if (!str.includes(query)) return;
      }
      if (props.style) {
        const clean = getCleanStyle(props.style);
        if (clean) set.add(clean);
      }
    });

    return Array.from(set).sort();
  }, [places, selectedRegion, selectedCity, searchQuery]);

  const hasActiveFilters = Boolean(searchQuery || selectedRegion || selectedCity || selectedStyle);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedRegion('');
    setSelectedCity('');
    setSelectedStyle('');
  }, []);

  // Фильтрация объектов
  const filteredPlaces = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return places.filter((item) => {
      const props = item.properties || {};

      if (query) {
        const searchableFields = [
          props.name_ru,
          props.name_en,
          props.name_ja,
          props.architect,
          props.city,
          props.district,
          props.region,
          props.year_built ? String(props.year_built) : '',
          props.style,
          props.building_type,
          props.nearest_station,
          props.summary_ru,
        ];

        const match = searchableFields.some((val) => 
          val && String(val).toLowerCase().includes(query)
        );

        if (!match) return false;
      }

      if (selectedRegion && props.region?.trim() !== selectedRegion) return false;
      if (selectedCity && props.city?.trim() !== selectedCity) return false;
      if (selectedStyle && !props.style?.toLowerCase().includes(selectedStyle.toLowerCase())) return false;

      return true;
    });
  }, [places, searchQuery, selectedRegion, selectedCity, selectedStyle]);

  // Сброс выбора при изменении любого фильтра
  const handleFilterChange = (setter) => (val) => {
    setSelectedPlaceId(null);
    setter(val);
  };

  const activePlace = places.find((p) => p.properties.id === selectedPlaceId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-100 text-neutral-800">
      
      {/* Левая панель: Каталог и Фильтры */}
      <aside className="w-full md:w-[400px] lg:w-[440px] h-full flex flex-col bg-white border-r border-neutral-200 z-10 shadow-sm flex-shrink-0">
        
        {/* Шапка */}
        <header className="p-4 border-b border-neutral-150 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-neutral-900 text-white rounded-lg">
              <Compass size={20} />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">Архитектура Японии</h1>
              <p className="text-xs text-neutral-500">Интерактивный путеводитель</p>
            </div>
          </div>
        </header>

        {/* Панель фильтров */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={handleFilterChange(setSearchQuery)}
          selectedRegion={selectedRegion}
          onRegionChange={handleFilterChange(setSelectedRegion)}
          selectedCity={selectedCity}
          onCityChange={handleFilterChange(setSelectedCity)}
          selectedStyle={selectedStyle}
          onStyleChange={handleFilterChange(setSelectedStyle)}
          regions={availableRegions}
          cities={availableCities}
          styles={availableStyles}
          onReset={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Список карточек */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Найдено объектов: {filteredPlaces.length}
            </span>
          </div>

          {filteredPlaces.map((place) => {
            const props = place.properties;
            const isSelected = selectedPlaceId === props.id;

            const coverSrc = props.cover_image
              ? (props.cover_image.includes('/') ? `/${props.cover_image}` : `/images/${props.id}/${props.cover_image}`)
              : null;

            return (
              <div
                key={props.id}
                onClick={() => setSelectedPlaceId(props.id)}
                className={`p-3 border rounded-lg cursor-pointer transition flex gap-3 ${
                  isSelected 
                    ? 'border-neutral-900 bg-neutral-50 shadow-sm' 
                    : 'border-neutral-200 hover:border-neutral-400 bg-white'
                }`}
              >
                <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-neutral-100 border border-neutral-150 flex items-center justify-center">
                  {coverSrc ? (
                    <img 
                      src={coverSrc} 
                      alt={props.name_ru || ''} 
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <span className="text-[10px] text-neutral-400 text-center px-1">Нет фото</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-neutral-400 font-medium truncate">
                    {props.city || 'Япония'} {props.district ? `• ${props.district}` : ''}
                  </div>
                  <div className="text-sm font-bold text-neutral-900 truncate mt-0.5">
                    {props.name_ru || props.name_en}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 truncate">
                    {props.architect || 'Архитектор не указан'} {props.year_built ? `• ${props.year_built}` : ''}
                  </div>

                  {props.summary_ru && (
                    <p className="text-xs text-neutral-600 mt-1.5 line-clamp-2 leading-relaxed">
                      {props.summary_ru}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {filteredPlaces.length === 0 && (
            <div className="text-center py-12 text-neutral-400 text-sm">
              Ничего не найдено по заданным параметрам.
            </div>
          )}
        </div>

        {/* Подвал */}
        <footer className="p-3 border-t border-neutral-150 text-xs text-neutral-400 flex justify-between bg-neutral-50">
          <span>Всего в базе: {places.length}</span>
          <span>MapLibre GL</span>
        </footer>
      </aside>

      {/* Правая панель: Карта и Детальная панель */}
      <main className="flex-1 h-full relative overflow-hidden">
        <MapView 
          places={filteredPlaces} 
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={(id) => setSelectedPlaceId(id)}
          isPanelOpen={Boolean(activePlace)}
        />

        <DetailPanel 
          place={activePlace} 
          onClose={() => setSelectedPlaceId(null)} 
        />
      </main>

    </div>
  );
}``