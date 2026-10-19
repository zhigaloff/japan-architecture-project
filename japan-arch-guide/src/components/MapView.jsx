import React, { useEffect, useRef, useCallback } from 'react';
import { Map as MapLibreMap, NavigationControl, Popup, LngLatBounds, setWorkerUrl } from 'maplibre-gl';
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { Scan } from 'lucide-react';

setWorkerUrl(mapLibreWorkerUrl);

export default function MapView({ 
  places = [], 
  selectedPlaceId, 
  onSelectPlace, 
  isPanelOpen = false,
  filterKey = ''
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const isLoaded = useRef(false);
  const hoverPopup = useRef(new Popup({ offset: 12, closeButton: false, closeOnClick: false }));
  const activePopup = useRef(new Popup({ offset: 14, closeButton: false }));

  // Сохраняем актуальный коллбэк для событий карты
  const onSelectPlaceRef = useRef(onSelectPlace);
  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace;
  }, [onSelectPlace]);

  // Функция центрирования карты под набор объектов
  const fitToPlaces = useCallback((items, isPanel = false) => {
    if (!map.current || !items || items.length === 0) return;

    if (!map.current.loaded()) {
      map.current.once('load', () => fitToPlaces(items, isPanel));
      return;
    }

    map.current.resize();
    map.current.stop();

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const rightPadding = isMobile ? 30 : (isPanel ? 460 : 50);
    const bottomPadding = isMobile ? (isPanel ? 320 : 70) : 50;
    const topPadding = isMobile ? 65 : 50;
    const leftPadding = isMobile ? 30 : 50;

    // 1. Если объект ровно 1
    if (items.length === 1) {
      const coords = items[0]?.geometry?.coordinates;
      if (coords && Array.isArray(coords) && coords.length >= 2) {
        map.current.flyTo({
          center: coords,
          zoom: 15,
          padding: { top: topPadding, bottom: bottomPadding, left: leftPadding, right: rightPadding },
          duration: 700,
          essential: true,
        });
      }
      return;
    }

    // 2. Если отображаются все (или почти все) объекты каталога — охватываем всю Японию
    if (items.length >= 130) {
      map.current.flyTo({
        center: isPanel ? (isMobile ? [138.2, 35.8] : [137.5, 36.3]) : [138.2529, 36.2048],
        zoom: isPanel ? (isMobile ? 5.1 : 5.3) : 5.8,
        padding: { top: topPadding, bottom: bottomPadding, left: leftPadding, right: rightPadding },
        duration: 800,
        essential: true,
      });
      return;
    }

    // 3. Отфильтрованный набор точек — рассчитываем точные границы
    const bounds = new LngLatBounds();
    let count = 0;
    items.forEach((p) => {
      const coords = p?.geometry?.coordinates;
      if (coords && Array.isArray(coords) && coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        bounds.extend(coords);
        count++;
      }
    });

    if (count > 0) {
      try {
        map.current.fitBounds(bounds, {
          padding: { top: 60, bottom: 60, left: 60, right: rightPadding },
          maxZoom: 14,
          minZoom: 5.5,
          duration: 800,
          essential: true,
        });
      } catch (err) {
        console.warn('fitBounds error:', err);
      }
    }
  }, []);

  // 1. Инициализация карты со слоями кластеризации
  useEffect(() => {
    if (map.current) return;

    const mapInstance = new MapLibreMap({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [138.2529, 36.2048], // Географический центр Японии
      zoom: 5.8,
      minZoom: 4.8,
      maxZoom: 18,
    });

    mapInstance.addControl(new NavigationControl(), 'top-right');

    mapInstance.on('load', () => {
      isLoaded.current = true;

      // Источник данных с включенной кластеризацией (кластеризуем до зума 14, радиус объединения 45px)
      mapInstance.addSource('places-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: places,
        },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 45,
      });

      // Слой 1: Круги кластеров с градацией по размеру и цвету
      mapInstance.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'places-source',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#334155', // До 10 объектов: благородный сланец (Slate-700)
            10,
            '#1e293b', // 10–30 объектов: темный графит (Slate-800)
            30,
            '#0f172a'  // 30+ объектов (например, Токио): угольно-черный (Slate-900)
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            15,
            10,
            19,
            30,
            24
          ],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Слой 2: Текст с количеством объектов внутри кружка кластера
      mapInstance.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'places-source',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold', 'Montserrat Medium', 'Noto Sans Regular'],
          'text-size': 12,
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // Слой 3: Обычные одиночные точки объектов (когда зум приближен или объект обособлен)
      mapInstance.addLayer({
        id: 'unclustered-points',
        type: 'circle',
        source: 'places-source',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#171717',
          'circle-radius': 6.5,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Слой 4: Внешнее полупрозрачное кольцо подсветки активного выбранного объекта
      mapInstance.addLayer({
        id: 'selected-point-glow',
        type: 'circle',
        source: 'places-source',
        filter: ['==', ['get', 'id'], selectedPlaceId || ''],
        paint: {
          'circle-color': '#ef4444',
          'circle-opacity': 0.35,
          'circle-radius': 16
        }
      });

      // Слой 5: Сама выбранная активная точка (ярко-красная)
      mapInstance.addLayer({
        id: 'selected-point',
        type: 'circle',
        source: 'places-source',
        filter: ['==', ['get', 'id'], selectedPlaceId || ''],
        paint: {
          'circle-color': '#dc2626',
          'circle-radius': 8.5,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Клик по кластеру — плавное приближение и раскрытие на подгруппы / точки
      mapInstance.on('click', 'clusters', async (e) => {
        const features = mapInstance.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        if (!features || !features.length) return;
        const clusterId = features[0].properties.cluster_id;
        const source = mapInstance.getSource('places-source');
        try {
          const zoom = await source.getClusterExpansionZoom(clusterId);
          mapInstance.easeTo({
            center: features[0].geometry.coordinates,
            zoom: zoom + 0.3,
            duration: 650
          });
        } catch (err) {
          console.warn('Expansion error:', err);
        }
      });

      // Интерактивный курсор на кластерах
      mapInstance.on('mouseenter', 'clusters', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        const features = mapInstance.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        if (!features || !features.length) return;
        const count = features[0].properties.point_count;
        hoverPopup.current
          .setLngLat(features[0].geometry.coordinates)
          .setHTML(`<div style="font-size: 11px; font-weight: 500; padding: 2px;">Кластер: ${count} объектов<br><span style="color: #666; font-size: 10px;">Кликните для приближения</span></div>`)
          .addTo(mapInstance);
      });
      mapInstance.on('mouseleave', 'clusters', () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.current.remove();
      });

      // Клик по одиночной точке — выбор объекта и открытие карточки
      mapInstance.on('click', 'unclustered-points', (e) => {
        if (!e.features || !e.features.length) return;
        const props = e.features[0].properties;
        if (onSelectPlaceRef.current) {
          onSelectPlaceRef.current(props.id);
        }
      });

      // Наведение на одиночную точку — всплывающее превью
      mapInstance.on('mouseenter', 'unclustered-points', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (!e.features || !e.features.length) return;
        const props = e.features[0].properties;
        const coords = e.features[0].geometry.coordinates.slice();

        hoverPopup.current
          .setLngLat(coords)
          .setHTML(`
            <div style="font-family: inherit; padding: 2px;">
              <strong style="font-size: 12px; display: block; color: #111;">${props.name_ru || props.name_en}</strong>
              <span style="font-size: 11px; color: #666;">${props.architect || ''} (${props.year_built || ''})</span>
            </div>
          `)
          .addTo(mapInstance);
      });

      mapInstance.on('mouseleave', 'unclustered-points', () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.current.remove();
      });
    });

    map.current = mapInstance;

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        isLoaded.current = false;
      }
    };
  }, []); // Только один раз при монтировании

  // 2. Обновление GeoJSON данных при фильтрации / поиске
  useEffect(() => {
    if (!map.current || !isLoaded.current) return;
    const source = map.current.getSource('places-source');
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: places,
      });
    }
  }, [places]);

  // 3. Авто-центрирование карты при изменении фильтров или сбросе карточки
  useEffect(() => {
    if (selectedPlaceId) return;
    if (places.length === 0) return;

    fitToPlaces(places, isPanelOpen);
  }, [places, selectedPlaceId, isPanelOpen, filterKey, fitToPlaces]);

  // 4. Подсветка и перелёт к выбранному объекту
  useEffect(() => {
    if (!map.current || !isLoaded.current) return;

    // Обновляем фильтр подсветки в MapLibre
    const targetId = selectedPlaceId || '';
    if (map.current.getLayer('selected-point')) {
      map.current.setFilter('selected-point', ['==', ['get', 'id'], targetId]);
    }
    if (map.current.getLayer('selected-point-glow')) {
      map.current.setFilter('selected-point-glow', ['==', ['get', 'id'], targetId]);
    }

    if (!selectedPlaceId) {
      activePopup.current.remove();
      return;
    }

    const targetPlace = places.find((p) => p.properties.id === selectedPlaceId);
    if (targetPlace) {
      // При клике на объект летим на зум 15 (где кластеры гарантированно распадаются на точки)
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      map.current.stop();
      map.current.flyTo({
        center: targetPlace.geometry.coordinates,
        zoom: 15,
        speed: 1.2,
        padding: isMobile
          ? { top: 60, bottom: isPanelOpen ? 340 : 60, left: 30, right: 30 }
          : { top: 50, bottom: 50, left: 50, right: isPanelOpen ? 460 : 50 },
        essential: true,
      });

      activePopup.current
        .setLngLat(targetPlace.geometry.coordinates)
        .setHTML(`
          <div style="font-family: inherit; padding: 2px;">
            <strong style="font-size: 13px; display: block; color: #111;">${targetPlace.properties.name_ru || targetPlace.properties.name_en}</strong>
            <span style="font-size: 11px; color: #666;">${targetPlace.properties.architect || ''} (${targetPlace.properties.year_built || ''})</span>
          </div>
        `)
        .addTo(map.current);
    }
  }, [selectedPlaceId, isPanelOpen, places]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Кнопка быстрого центрирования по всем найденным точкам */}
      {places.length > 0 && (
        <button
          onClick={() => {
            if (onSelectPlaceRef.current) onSelectPlaceRef.current(null);
            fitToPlaces(places, false);
          }}
          className="absolute top-14 md:top-3 left-3 z-10 bg-white/95 hover:bg-white text-neutral-800 hover:text-black px-3 py-1.5 rounded-lg shadow-md border border-neutral-200/90 backdrop-blur-sm flex items-center gap-1.5 text-xs font-medium transition active:scale-95 cursor-pointer"
          title="Сбросить выбор объекта и показать все точки на карте"
        >
          <Scan size={14} className="text-neutral-600" />
          <span>Показать все ({places.length})</span>
        </button>
      )}
    </div>
  );
}