import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync, spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ВСТАВЬТЕ СЮДА ВАШ URL ИЗ ШАГА 2
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxGDDmOXn4CR60CC6uVZ5Shra6CXtDU4I0prBLNLXVzRcAAfVG1xTyHY6oeDVz0GQA/exec';

const OUTPUT_PATH = path.resolve(__dirname, '../public/data/architecture_japan.geojson');

async function sync() {
  console.log('⏳ Получение свежего GeoJSON из Google Таблицы...');

  try {
    const response = await fetch(APPS_SCRIPT_URL, { redirect: 'follow' });

    if (!response.ok) {
      throw new Error(`Ошибка HTTP: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`Ошибка со стороны Apps Script: ${data.message}`);
    }

    if (!data.features || !Array.isArray(data.features)) {
      throw new Error('Некорректный формат данных: отсутствует массив features');
    }

    // Проверяем и создаем директорию public/data, если она отсутствует
    const dir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Сохраняем красивый форматированный JSON
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✅ GeoJSON успешно обновлен! Всего объектов: ${data.features.length}`);
    console.log(`📁 Файл сохранен в: ${OUTPUT_PATH}`);

    // Автоматическая фиксация и отправка в GitHub
    console.log('🚀 Синхронизация с GitHub...');
    execFileSync('git', ['add', 'public/data/architecture_japan.geojson'], { stdio: 'inherit' });

    const commitMessage = `Обновление базы данных архитектуры: ${new Date().toISOString().slice(0, 10)}`;
    const stagedChanges = spawnSync('git', ['diff', '--cached', '--quiet'], { stdio: 'inherit' });

    if (stagedChanges.error) {
      throw stagedChanges.error;
    }

    if (stagedChanges.status === 1) {
      execFileSync('git', ['commit', '-m', commitMessage], { stdio: 'inherit' });
    } else if (stagedChanges.status === 0) {
      console.log('ℹ️ Новых изменений для коммита не обнаружено (файл идентичен текущему).');
    } else {
      throw new Error(`git diff завершился с кодом ${stagedChanges.status}`);
    }

    execFileSync('git', ['push'], { stdio: 'inherit' });
    console.log('🎉 Изменения успешно отправлены на GitHub!');

  } catch (error) {
    console.error('❌ Ошибка синхронизации:', error.message);
    process.exit(1);
  }
}

sync();
