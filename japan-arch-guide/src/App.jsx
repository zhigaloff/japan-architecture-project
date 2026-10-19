import React, { useState, useEffect, useMemo, useCallback } from 'react';
import MapView from './components/MapView';
import DetailPanel from './components/DetailPanel';
import FilterBar from './components/FilterBar';
import { Compass, List, Map, X, Search } from 'lucide-react';

export default function App() {
  const [places, setPlaces] = useState([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [isMobileCatalogOpen, setIsMobileCatalogOpen] = useState(false);

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
          const seen = new Set();
          const cleanFeatures = data.features.map((f, index) => {
            const p = { ...f.properties };
            if (!p.id || seen.has(p.id)) {
              p.id = p.id ? `${p.id}-${index}` : `place-${index}`;
            }
            seen.add(p.id);
            return { ...f, properties: p };
          });
          setPlaces(cleanFeatures);
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

  const activePlace = useMemo(() => {
    if (!selectedPlaceId) return null;
    return places.find((p) => p.properties.id === selectedPlaceId) || null;
  }, [places, selectedPlaceId]);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-neutral-100 text-neutral-800">
      
      {/* Затемняющий оверлей для мобильной шторки каталога */}
      {isMobileCatalogOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-30 md:hidden transition-opacity"
          onClick={() => setIsMobileCatalogOpen(false)}
        />
      )}

      {/* Панель каталога и фильтров:
          На десктопе (md+): классическая левая колонка
          На мобильном (<md): удобная выдвижная нижняя шторка */}
      <aside 
        className={`
          fixed inset-x-0 bottom-0 z-40 max-h-[88vh] h-[88vh] bg-white rounded-t-2xl shadow-2xl flex flex-col border-t border-neutral-200 transition-transform duration-300 ease-out
          ${isMobileCatalogOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'}
          md:translate-y-0 md:pointer-events-auto md:static md:w-[400px] lg:w-[440px] md:h-full md:rounded-none md:border-t-0 md:border-r md:shadow-sm flex-shrink-0
        `}
      >
        {/* Ручка шторки для смартфонов */}
        <div 
          className="md:hidden pt-2.5 pb-1 flex justify-center cursor-pointer select-none"
          onClick={() => setIsMobileCatalogOpen(false)}
        >
          <div className="w-10 h-1 bg-neutral-300 rounded-full" />
        </div>

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
          
          {/* Кнопка закрытия шторки на мобильных */}
          <button
            onClick={() => setIsMobileCatalogOpen(false)}
            className="md:hidden p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition"
            title="Закрыть каталог"
          >
            <X size={18} />
          </button>
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

          {filteredPlaces.map((place, idx) => {
            const props = place.properties || {};
            const isSelected = selectedPlaceId === props.id;

            const coverSrc = props.cover_image
              ? (props.cover_image.includes('/') ? `/${props.cover_image}` : `/images/${props.id}/${props.cover_image}`)
              : `/images/${props.id}/01-facade.jpg`;

            return (
              <div
                key={props.id ? `${props.id}-${idx}` : `place-${idx}`}
                onClick={() => {
                  setSelectedPlaceId(props.id);
                  setIsMobileCatalogOpen(false); // На мобильном сразу закрываем каталог, открывая карту и объект
                }}
                className={`p-3 border rounded-lg cursor-pointer transition flex gap-3 ${
                  isSelected 
                    ? 'border-neutral-900 bg-neutral-50 shadow-sm' 
                    : 'border-neutral-200 hover:border-neutral-400 bg-white'
                }`}
              >
                <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-neutral-100 border border-neutral-150 flex items-center justify-center">
                  <img 
                    src={coverSrc} 
                    alt={props.name_ru || ''} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const fallback = `/images/${props.id}/01-facade.jpg`;
                      if (!e.currentTarget.src.endsWith('01-facade.jpg')) {
                        e.currentTarget.src = fallback;
                      } else {
                        e.currentTarget.style.display = 'none';
                      }
                    }}
                  />
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

        {/* Кнопка «Смотреть на карте» внизу мобильной шторки */}
        <div className="md:hidden p-3 border-t border-neutral-200 bg-neutral-50">
          <button
            onClick={() => setIsMobileCatalogOpen(false)}
            className="w-full bg-neutral-900 hover:bg-black text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow"
          >
            <Map size={15} />
            <span>Смотреть на карте ({filteredPlaces.length})</span>
          </button>
        </div>

        {/* Подвал для десктопа */}
        <footer className="hidden md:flex p-3 border-t border-neutral-150 text-xs text-neutral-400 justify-between bg-neutral-50">
          <span>Всего в базе: {places.length}</span>
          <span>MapLibre GL</span>
        </footer>
      </aside>

      {/* Основная зона: Карта (на мобильном занимает 100% экрана) и Детальная панель */}
      <main className="flex-1 h-full w-full relative overflow-hidden">
        
        {/* Мобильная верхняя компактная плашка поиска */}
        {!isMobileCatalogOpen && !selectedPlaceId && (
          <div className="md:hidden fixed top-3 left-3 right-14 z-20">
            <button
              onClick={() => setIsMobileCatalogOpen(true)}
              className="w-full bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-md border border-neutral-200/90 flex items-center justify-between text-xs text-neutral-700 hover:bg-white transition text-left cursor-pointer active:scale-98"
            >
              <div className="flex items-center gap-2 truncate">
                <Search size={14} className="text-neutral-400 flex-shrink-0" />
                <span className="truncate font-medium">
                  {searchQuery || selectedStyle || selectedCity || selectedRegion || 'Поиск и фильтры...'}
                </span>
              </div>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 ml-1" />
              )}
            </button>
          </div>
        )}

        {/* Карта */}
        <MapView 
          places={filteredPlaces} 
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={(id) => {
            setSelectedPlaceId(id);
            setIsMobileCatalogOpen(false);
          }}
          isPanelOpen={Boolean(activePlace)}
          filterKey={`${searchQuery}::${selectedRegion}::${selectedCity}::${selectedStyle}`}
        />

        {/* Плавающая кнопка вызова каталога на мобильном экране */}
        {!isMobileCatalogOpen && !selectedPlaceId && (
          <div className="md:hidden fixed bottom-6 inset-x-0 flex justify-center z-20 pointer-events-none">
            <button
              onClick={() => setIsMobileCatalogOpen(true)}
              className="pointer-events-auto bg-neutral-900 hover:bg-black text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              <List size={16} />
              <span>Каталог ({filteredPlaces.length})</span>
            </button>
          </div>
        )}

        {/* Детальная панель: на смартфонах нижняя шторка, на десктопе боковая панель */}
        <DetailPanel 
          place={activePlace} 
          onClose={() => setSelectedPlaceId(null)} 
        />
      </main>

    </div>
  );
}
