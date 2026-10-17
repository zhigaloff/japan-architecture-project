import React, { useEffect, useRef } from 'react';
import { Map as MapLibreMap, NavigationControl, Marker, Popup, LngLatBounds, setWorkerUrl } from 'maplibre-gl';
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

setWorkerUrl(mapLibreWorkerUrl);

export default function MapView({ places = [], selectedPlaceId, onSelectPlace, isPanelOpen = false }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef({});

  // 1. Инициализация карты
  useEffect(() => {
    if (map.current) return;

    map.current = new MapLibreMap({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [139.6917, 35.6895],
      zoom: 11,
    });

    map.current.addControl(new NavigationControl(), 'top-right');

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // 2. Отрисовка маркеров на карте
  useEffect(() => {
    if (!map.current) return;

    // Очищаем старые маркеры
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    places.forEach((place) => {
      const coords = place.geometry.coordinates;
      const props = place.properties;

      const el = document.createElement('div');
      el.className = 'w-4 h-4 rounded-full bg-neutral-900 border-2 border-white shadow-md cursor-pointer transition-transform hover:scale-125';

      const popup = new Popup({ offset: 12, closeButton: false }).setHTML(`
        <div style="font-family: inherit; padding: 2px;">
          <strong style="font-size: 13px; display: block;">${props.name_ru || props.name_en}</strong>
          <span style="font-size: 11px; color: #666;">${props.architect || ''} (${props.year_built || ''})</span>
        </div>
      `);

      const marker = new Marker({ element: el })
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map.current);

      el.addEventListener('click', () => {
        if (onSelectPlace) onSelectPlace(props.id);
      });

      markersRef.current[props.id] = marker;
    });
  }, [places, onSelectPlace]);

  // 3. Авто-центрирование карты под отфильтрованный набор точек (работает ВСЕГДА при смене places)
  useEffect(() => {
    if (!map.current || places.length === 0) return;

    // Если сейчас кликнули по конкретной точке, центрирование делает шаг 4 ниже
    if (selectedPlaceId) return;

    const bounds = new LngLatBounds();
    places.forEach((p) => bounds.extend(p.geometry.coordinates));

    map.current.fitBounds(bounds, {
      padding: { top: 70, bottom: 70, left: 70, right: isPanelOpen ? 480 : 70 },
      maxZoom: 14,
      duration: 800,
    });
  }, [places, isPanelOpen, selectedPlaceId]);

  // 4. Перелёт к конкретно выбранному объекту с отступом под панель
  useEffect(() => {
    if (!map.current || !selectedPlaceId) return;

    const targetPlace = places.find((p) => p.properties.id === selectedPlaceId);
    if (targetPlace) {
      map.current.flyTo({
        center: targetPlace.geometry.coordinates,
        zoom: 15,
        speed: 1.2,
        padding: { right: isPanelOpen ? 460 : 0 },
        essential: true,
      });

      const marker = markersRef.current[selectedPlaceId];
      if (marker) {
        marker.togglePopup();
      }
    }
  }, [selectedPlaceId, isPanelOpen, places]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}