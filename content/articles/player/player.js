const video = document.getElementById('video');
const scrubber = document.getElementById('scrubber');

const STEP = 1; // 1 секунда (можно 1/30)

// 1. Когда видео готово — настраиваем ползунок
video.addEventListener('loadedmetadata', () => {
  scrubber.max = video.duration;
  scrubber.value = 0;
});

// 2. Видео → ползунок
video.addEventListener('timeupdate', () => {
  scrubber.value = video.currentTime;
});

// 3. Ползунок (мышь) → видео
scrubber.addEventListener('input', () => {
  video.currentTime = scrubber.value;
});

// 4. Клавиатура → видео
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    video.currentTime = Math.max(0, video.currentTime - STEP);
  }

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    video.currentTime = Math.min(
      video.duration,
      video.currentTime + STEP
    );
  }
});
