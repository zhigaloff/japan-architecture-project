import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, MapPin, Calendar, Compass, ShieldCheck, Train, Info, User, 
  ImageOff, ChevronLeft, ChevronRight, ExternalLink 
} from 'lucide-react';

export default function DetailPanel({ place, onClose }) {
  const [imageError, setImageError] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(null); // индекс текущего фото в слайдере
  const [currentCover, setCurrentCover] = useState(null);

  const props = place?.properties || {};

  // Формируем надежный путь к обложке с автоматическим запасным вариантом
  useEffect(() => {
    setImageError(false);
    setActivePhotoIndex(null);
    if (!props.cover_image) {
      setCurrentCover(props.id ? `/images/${props.id}/01-facade.jpg` : null);
      return;
    }
    const initial = props.cover_image.includes('/')
      ? `/${props.cover_image}`
      : `/images/${props.id}/${props.cover_image}`;
    setCurrentCover(initial);
  }, [props.id, props.cover_image]);

  const handleCoverError = () => {
    if (currentCover && !currentCover.endsWith('01-facade.jpg')) {
      setCurrentCover(`/images/${props.id}/01-facade.jpg`);
    } else {
      setImageError(true);
    }
  };

  // Собираем массив всех доступных фото объекта (обложка + галерея)
  const allPhotos = useMemo(() => {
    const list = [];
    if (currentCover && !imageError) {
      list.push(currentCover);
    }
    if (props.gallery_images) {
      props.gallery_images
        .split(',')
        .map((img) => img.trim())
        .filter(Boolean)
        .forEach((img) => {
          const photoPath = `/images/${props.id}/${img}`;
          if (!list.includes(photoPath)) {
            list.push(photoPath);
          }
        });
    }
    return list;
  }, [currentCover, imageError, props.gallery_images, props.id]);

  // Координаты для перехода на Google Maps
  const googleMapsUrl = useMemo(() => {
    const coords = place?.geometry?.coordinates;
    if (coords && Array.isArray(coords) && coords.length >= 2) {
      const lng = coords[0];
      const lat = coords[1];
      return `https://www.google.com/maps?q=${lat},${lng}`;
    }
    return null;
  }, [place]);

  // Перелистывание вперед / назад
  const handlePrevPhoto = useCallback((e) => {
    e?.stopPropagation();
    setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : allPhotos.length - 1));
  }, [allPhotos.length]);

  const handleNextPhoto = useCallback((e) => {
    e?.stopPropagation();
    setActivePhotoIndex((prev) => (prev < allPhotos.length - 1 ? prev + 1 : 0));
  }, [allPhotos.length]);

  // Управление с клавиатуры (Стрелки и Escape)
  useEffect(() => {
    if (activePhotoIndex === null) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrevPhoto();
      if (e.key === 'ArrowRight') handleNextPhoto();
      if (e.key === 'Escape') setActivePhotoIndex(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhotoIndex, handlePrevPhoto, handleNextPhoto]);

  if (!place) return null;

  return (
    <>
      {/* Затемняющий фон на мобильных для закрытия по тапу */}
      <div 
        className="fixed inset-0 bg-black/35 backdrop-blur-[1px] z-30 md:hidden"
        onClick={onClose}
      />

      {/* Панель: снизу на мобильных, справа на десктопе */}
      <div className="fixed inset-x-0 bottom-0 md:bottom-auto md:top-0 md:right-0 md:left-auto h-[88vh] md:h-full w-full md:w-[440px] lg:w-[480px] bg-white shadow-2xl z-40 flex flex-col rounded-t-2xl md:rounded-none border-t md:border-t-0 md:border-l border-neutral-200">
        
        {/* Ручка шторки для смартфонов */}
        <div className="md:hidden pt-2.5 pb-1 flex justify-center cursor-pointer select-none" onClick={onClose}>
          <div className="w-10 h-1 bg-neutral-300 rounded-full" />
        </div>

        {/* Шапка */}
        <div className="p-4 border-b border-neutral-150 flex items-center justify-between bg-white/95 backdrop-blur-sm sticky top-0 z-10">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Карточка объекта
            </span>
            <h2 className="text-base font-bold text-neutral-900 leading-snug">
              {props.name_ru || props.name_en}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition"
            title="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          
          {/* Главная обложка */}
          <div 
            className="w-full h-64 bg-neutral-100 relative overflow-hidden flex items-center justify-center border-b border-neutral-100 cursor-pointer group"
            onClick={() => currentCover && !imageError && setActivePhotoIndex(0)}
          >
            {currentCover && !imageError ? (
              <>
                <img
                  src={currentCover}
                  alt={props.name_ru || ''}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  onError={handleCoverError}
                />
                <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-medium">
                  Открыть просмотр фото
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-neutral-400 gap-1">
                <ImageOff size={28} />
                <span className="text-xs">Фотография отсутствует</span>
              </div>
            )}
          </div>

          <div className="p-5 space-y-5">
            
            {/* Японское и английское название */}
            <div>
              {props.name_ja && (
                <p className="text-xl font-medium text-neutral-900 mb-0.5">
                  {props.name_ja}
                </p>
              )}
              {props.name_en && (
                <p className="text-xs text-neutral-500">
                  {props.name_en}
                </p>
              )}
            </div>

            {/* Сетка параметров */}
            <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-3 space-y-2.5 text-xs">
              
              {/* Архитектор */}
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-200/60">
                <User size={15} className="text-neutral-500 flex-shrink-0" />
                <span className="text-neutral-500">Архитектор:</span>
                <span className="font-semibold text-neutral-900 truncate">
                  {props.architect || 'Не указан'}
                </span>
              </div>

              {/* Характеристики */}
              <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                <div className="flex items-start gap-2">
                  <Calendar size={14} className="text-neutral-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Год постройки</span>
                    <span className="font-semibold text-neutral-800">{props.year_built || '—'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Compass size={14} className="text-neutral-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Стиль</span>
                    <span className="font-semibold text-neutral-800">{props.style || '—'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Info size={14} className="text-neutral-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Тип здания</span>
                    <span className="font-semibold text-neutral-800">{props.building_type || '—'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <ShieldCheck size={14} className="text-neutral-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Доступ</span>
                    <span className="font-semibold text-neutral-800">{props.access_type || '—'}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Локация и станция */}
            <div className="space-y-2 text-xs border-b border-neutral-100 pb-4 text-neutral-700">
              {googleMapsUrl ? (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2 p-1 -ml-1 rounded-md hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900 transition"
                  title="Открыть эту точку на Google Maps (откроется в новой вкладке)"
                >
                  <MapPin size={15} className="text-neutral-400 group-hover:text-red-500 flex-shrink-0 mt-0.5 transition-colors" />
                  <span className="group-hover:underline underline-offset-2 flex-1">
                    {props.region ? `${props.region}, ` : ''}{props.city}{props.district ? ` • ${props.district}` : ''}
                  </span>
                  <ExternalLink size={13} className="text-neutral-400 group-hover:text-neutral-700 flex-shrink-0 mt-0.5 opacity-60 group-hover:opacity-100 transition" />
                </a>
              ) : (
                <div className="flex items-start gap-2">
                  <MapPin size={15} className="text-neutral-400 flex-shrink-0 mt-0.5" />
                  <span>
                    {props.region ? `${props.region}, ` : ''}{props.city}{props.district ? ` • ${props.district}` : ''}
                  </span>
                </div>
              )}

              {props.nearest_station && (
                <div className="flex items-start gap-2">
                  <Train size={15} className="text-neutral-400 flex-shrink-0 mt-0.5" />
                  <span>{props.nearest_station}</span>
                </div>
              )}
            </div>

            {/* Описание */}
            {props.description_ru && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Об объекте
                </h3>
                <p className="text-sm leading-relaxed text-neutral-700 whitespace-pre-line">
                  {props.description_ru}
                </p>
              </div>
            )}

            {/* Галерея превью */}
            {allPhotos.length > 1 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Все фотографии ({allPhotos.length})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {allPhotos.map((photoUrl, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setActivePhotoIndex(idx)}
                      className="h-32 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 cursor-pointer group relative"
                    >
                      <img
                        src={photoUrl}
                        alt={`Фото ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px]">
                        Смотреть
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Полноэкранный слайдер галереи (Lightbox) */}
      {activePhotoIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center select-none"
          onClick={() => setActivePhotoIndex(null)}
        >
          {/* Кнопка закрытия */}
          <button 
            className="absolute top-4 right-4 text-white/80 hover:text-white transition p-2 z-50"
            onClick={() => setActivePhotoIndex(null)}
            title="Закрыть (Esc)"
          >
            <X size={30} />
          </button>

          {/* Индикатор номера фото */}
          <div className="absolute top-5 left-6 text-white/70 text-xs font-medium tracking-wider">
            {activePhotoIndex + 1} / {allPhotos.length}
          </div>

          {/* Кнопка «Назад» */}
          {allPhotos.length > 1 && (
            <button 
              className="absolute left-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition z-50 backdrop-blur-sm"
              onClick={handlePrevPhoto}
              title="Предыдущее (←)"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {/* Само увеличенное фото */}
          <div className="max-h-[90vh] max-w-[90vw] flex items-center justify-center p-2">
            <img 
              src={allPhotos[activePhotoIndex]} 
              alt="Увеличенное фото" 
              className="max-h-[88vh] max-w-[88vw] object-contain rounded shadow-2xl transition-all duration-200"
              onClick={(e) => e.stopPropagation()} // клик по картинке не закрывает окно
            />
          </div>

          {/* Кнопка «Вперед» */}
          {allPhotos.length > 1 && (
            <button 
              className="absolute right-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition z-50 backdrop-blur-sm"
              onClick={handleNextPhoto}
              title="Следующее (→)"
            >
              <ChevronRight size={28} />
            </button>
          )}
        </div>
      )}
    </>
  );
}