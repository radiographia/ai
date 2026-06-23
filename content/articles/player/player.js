  <script>
    // Элементы DOM
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const btnBack = document.getElementById('btnBack');
    const btnForward = document.getElementById('btnForward');
    const frameDisplay = document.getElementById('frameDisplay');
    const menuButton = document.getElementById('menuButton');
    const dropdownMenu = document.getElementById('dropdownMenu');

    // Создаем видео элемент (скрытый)
    const video = document.createElement('video');
    video.src = 'video.mp4';
    video.preload = 'auto';
    video.muted = true;

    // Состояние
    let currentFrame = 0;
    let totalFrames = 0;
    const FPS = 1; // 1 кадр в секунду
    const frameDuration = 1 / FPS; // 1 секунда на кадр
    
    // Тайм-якори
    let bookmarks = [];
    
    // Параметры полосы прокрутки
    const scrollbar = {
      width: 20,                    // Ширина полосы
      padding: 10,                  // Отступ от края
      thumbHeight: 30,              // Высота ползунка
      isDragging: false,            // Флаг перетаскивания
      startY: 0,                    // Начальная позиция при перетаскивании
      thumbY: 0,                    // Текущая позиция ползунка
      hover: false                  // Наведение мыши
    };

    // Загрузка файла с тайм-якорями
    async function loadBookmarks() {
      try {
        const response = await fetch('video.txt');
        if (!response.ok) {
          console.warn('Файл тайм-якорей не найден');
          return;
        }
        
        const text = await response.text();
        parseBookmarks(text);
      } catch (error) {
        console.warn('Ошибка загрузки файла тайм-якорей:', error);
      }
    }

    // Парсинг тайм-якорей
    function parseBookmarks(text) {
      const lines = text.split('\n');
      
      bookmarks = lines
        .map(line => line.trim())
        .filter(line => line)
        .map(line => {
          const match = line.match(/^(\d{2}):(\d{2})\s*-\s*(.+)$/);
          if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const timeInSeconds = minutes * 60 + seconds;
            const description = match[3].trim();
            
            return {
              time: timeInSeconds,
              frame: timeInSeconds * FPS, // 1 кадр = 1 секунда
              description: description
            };
          }
          return null;
        })
        .filter(item => item !== null);
      
      // Создаем меню
      renderBookmarkMenu();
    }

    // Создание меню тайм-якорей
    function renderBookmarkMenu() {
      dropdownMenu.innerHTML = '';
      
      bookmarks.forEach((bookmark, index) => {
        const menuItem = document.createElement('div');
        menuItem.className = 'menuItem';
        menuItem.dataset.index = index; // Сохраняем индекс для обновления
        menuItem.innerHTML = `
          <span class="timecode">${formatTime(bookmark.time)}</span>
          <span class="description">${bookmark.description}</span>
        `;
        
        menuItem.addEventListener('click', () => {
          goToFrame(bookmark.frame);
          closeMenu();
        });
        
        dropdownMenu.appendChild(menuItem);
      });
      
      // Если нет тайм-якорей
      if (bookmarks.length === 0) {
        const emptyItem = document.createElement('div');
        emptyItem.className = 'menuItem';
        emptyItem.textContent = 'Нет тайм-якорей';
        emptyItem.style.color = '#888';
        emptyItem.style.cursor = 'default';
        dropdownMenu.appendChild(emptyItem);
      }
    }

    // Форматирование времени (секунды → ММ:СС)
    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Обновление активного пункта меню (исправлено!)
    function updateActiveBookmark() {
      const menuItems = dropdownMenu.querySelectorAll('.menuItem');
      
      // Снимаем выделение со всех пунктов
      menuItems.forEach(item => {
        item.classList.remove('active');
      });
      
      // Находим ближайший тайм-якорь, который <= текущего кадра
      let activeIndex = -1;
      for (let i = 0; i < bookmarks.length; i++) {
        if (currentFrame >= bookmarks[i].frame) {
          activeIndex = i;
        } else {
          break; // Выходим, так как тайм-якори отсортированы
        }
      }
      
      // Выделяем только один пункт
      if (activeIndex >= 0 && menuItems[activeIndex]) {
        menuItems[activeIndex].classList.add('active');
      }
    }

    // Открытие/закрытие меню
    function toggleMenu() {
      dropdownMenu.classList.toggle('show');
    }

    function closeMenu() {
      dropdownMenu.classList.remove('show');
    }

    // Когда видео загружено
    video.addEventListener('loadedmetadata', () => {
      // Рассчитываем общее количество кадров
      totalFrames = Math.floor(video.duration * FPS);
      
      // Устанавливаем размеры канваса (видео + полоса)
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      
      // Размеры канваса: видео + полоса справа
      canvas.width = videoWidth + scrollbar.width + scrollbar.padding * 2;
      canvas.height = videoHeight;
      
      // Показываем первый кадр
      goToFrame(0);
      
      // Загружаем тайм-якори
      loadBookmarks();
    });

    // Основная функция: переход к кадру
    function goToFrame(frameNumber) {
      // Ограничиваем диапазон
      if (frameNumber < 0) frameNumber = 0;
      if (video.duration && frameNumber >= totalFrames) {
        frameNumber = totalFrames - 1;
      }
      
      // Устанавливаем время видео
      video.currentTime = frameNumber * frameDuration;
      
      // Ждём загрузки кадра и рисуем
      video.addEventListener('seeked', () => {
        if (video.readyState >= 2) {
          drawFrame();
          currentFrame = frameNumber;
          frameDisplay.textContent = currentFrame + 1;
          
          // Обновляем активный тайм-якорь
          updateActiveBookmark();
        }
      }, { once: true });
    }

    // Рисование кадра + полосы прокрутки
    function drawFrame() {
      // Очищаем канвас
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Рисуем видео
      const videoWidth = canvas.width - scrollbar.width - scrollbar.padding * 2;
      ctx.drawImage(video, 0, 0, videoWidth, canvas.height);
      
      // Рисуем полосу прокрутки
      drawScrollbar();
    }

    // Рисование полосы прокрутки
    function drawScrollbar() {
      const videoWidth = canvas.width - scrollbar.width - scrollbar.padding * 2;
      const x = videoWidth + scrollbar.padding;
      const y = scrollbar.padding;
      const height = canvas.height - scrollbar.padding * 2;
      
      // Фон полосы
      ctx.fillStyle = scrollbar.hover ? '#3a3a3a' : '#2a2a2a';
      ctx.fillRect(x, y, scrollbar.width, height);
      
      // Обводка полосы
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, scrollbar.width, height);
      
      // Рассчитываем позицию ползунка
      if (totalFrames > 0) {
        const usableHeight = height - scrollbar.thumbHeight;
        scrollbar.thumbY = (currentFrame / (totalFrames - 1)) * usableHeight;
        
        // Рисуем ползунок
        ctx.fillStyle = scrollbar.isDragging ? '#3a7bd5' : '#4da6ff';
        ctx.fillRect(
          x + 2, 
          y + scrollbar.thumbY, 
          scrollbar.width - 4, 
          scrollbar.thumbHeight
        );
        
        // Скругление ползунка
        ctx.fillStyle = '#2a2a40';
        ctx.fillRect(x + 2, y + scrollbar.thumbY, scrollbar.width - 4, 3);
        ctx.fillRect(x + 2, y + scrollbar.thumbY + scrollbar.thumbHeight - 3, scrollbar.width - 4, 3);
      }
    }

    // Кнопка "Назад"
    btnBack.addEventListener('click', () => {
      goToFrame(currentFrame - 1);
    });

    // Кнопка "Вперед"
    btnForward.addEventListener('click', () => {
      goToFrame(currentFrame + 1);
    });

    // === Навигация колесом мыши ===
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        goToFrame(currentFrame + 1);
      } else {
        goToFrame(currentFrame - 1);
      }
    });

    // === Горячие клавиши ===
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch(e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          goToFrame(currentFrame - 1);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          goToFrame(currentFrame + 1);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMenu();
          break;
      }
    });

    // === Обработка кликов по канвасу (полоса прокрутки) ===
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;
      
      const videoWidth = canvas.width - scrollbar.width - scrollbar.padding * 2;
      const scrollbarX = videoWidth + scrollbar.padding;
      const scrollbarY = scrollbar.padding;
      const scrollbarHeight = canvas.height - scrollbar.padding * 2;
      
      // Проверяем, кликнули ли по полосе прокрутки
      if (mouseX >= scrollbarX && mouseX <= scrollbarX + scrollbar.width &&
          mouseY >= scrollbarY && mouseY <= scrollbarY + scrollbarHeight) {
        
        // Проверяем, кликнули ли по ползунку
        const thumbY = scrollbarY + scrollbar.thumbY;
        if (mouseY >= thumbY && mouseY <= thumbY + scrollbar.thumbHeight) {
          // Начинаем перетаскивание
          scrollbar.isDragging = true;
          scrollbar.startY = mouseY - scrollbar.thumbY;
          canvas.addEventListener('mousemove', onCanvasDrag);
          canvas.addEventListener('mouseup', stopDrag);
          canvas.addEventListener('mouseleave', stopDrag);
          drawFrame(); // Обновляем отображение
        } else {
          // Клик по полосе - переход на этот кадр
          const usableHeight = scrollbarHeight - scrollbar.thumbHeight;
          const clickRatio = (mouseY - scrollbarY) / scrollbarHeight;
          const targetFrame = Math.floor(clickRatio * totalFrames);
          goToFrame(targetFrame);
        }
      }
    });

    // Перетаскивание ползунка на канвасе
function onCanvasDrag(e) {
  if (!scrollbar.isDragging) return;
  
  const rect = canvas.getBoundingClientRect();
  const scaleY = canvas.height / rect.height;
  const mouseY = (e.clientY - rect.top) * scaleY;
      
      const videoWidth = canvas.width - scrollbar.width - scrollbar.padding * 2;
      const scrollbarY = scrollbar.padding;
      const scrollbarHeight = canvas.height - scrollbar.padding * 2;
      const usableHeight = scrollbarHeight - scrollbar.thumbHeight;
      
      // Ограничиваем позицию ползунка
      let newY = mouseY - scrollbar.startY - scrollbarY;
      newY = Math.max(0, Math.min(newY, usableHeight));
      
      // Рассчитываем кадр
      const ratio = newY / usableHeight;
      const targetFrame = Math.floor(ratio * (totalFrames - 1));
      goToFrame(targetFrame);
    }

    // Остановка перетаскивания
    function stopDrag() {
      scrollbar.isDragging = false;
      canvas.removeEventListener('mousemove', onCanvasDrag);
      canvas.removeEventListener('mouseup', stopDrag);
      canvas.removeEventListener('mouseleave', stopDrag);
      drawFrame(); // Обновляем отображение
    }

    // === Наведение мыши на полосу ===
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;
      
      const videoWidth = canvas.width - scrollbar.width - scrollbar.padding * 2;
      const scrollbarX = videoWidth + scrollbar.padding;
      const scrollbarY = scrollbar.padding;
      const scrollbarHeight = canvas.height - scrollbar.padding * 2;
      
      // Проверяем, наведена ли мышь на полосу
      const wasHover = scrollbar.hover;
      scrollbar.hover = (mouseX >= scrollbarX && mouseX <= scrollbarX + scrollbar.width &&
                         mouseY >= scrollbarY && mouseY <= scrollbarY + scrollbarHeight);
      
      // Перерисовываем только если изменилось состояние наведения
      if (wasHover !== scrollbar.hover && !scrollbar.isDragging) {
        drawFrame();
      }
    });

    // === Обработка кликов по меню ===
    menuButton.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    // Закрываем меню при клике вне его
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.canvas-container')) {
        closeMenu();
      }
    });

    // Обработка ошибок
    video.addEventListener('error', (e) => {
      console.error('Ошибка загрузки видео:', e);
      alert('Не удалось загрузить видео. Проверьте путь к файлу.');
    });
  </script>