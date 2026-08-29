(() => {
  const imageInput = document.getElementById('imageInput');
  const cameraInput = document.getElementById('cameraInput');
  if (!imageInput || !cameraInput) return;

  const originalFetch = window.fetch.bind(window);

  const raw = value => {
    if (typeof value !== 'string') return '';
    const comma = value.indexOf(',');
    return value.startsWith('data:') && comma >= 0 ? value.slice(comma + 1) : value;
  };

  const loadImage = src => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  const makeComparisonImage = async (a, b) => {
    const [one, two] = await Promise.all([loadImage(a), loadImage(b)]);
    const maxWidth = 900;
    const scale = Math.min(1, maxWidth / Math.max(one.naturalWidth, two.naturalWidth));
    const w1 = Math.max(1, Math.round(one.naturalWidth * scale));
    const w2 = Math.max(1, Math.round(two.naturalWidth * scale));
    const h1 = Math.max(1, Math.round(one.naturalHeight * scale));
    const h2 = Math.max(1, Math.round(two.naturalHeight * scale));
    const labelH = 48;
    const gap = 16;
    const canvas = document.createElement('canvas');
    canvas.width = w1 + w2 + gap;
    canvas.height = Math.max(h1, h2) + labelH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('画像1', 12, 32);
    ctx.fillText('画像2', w1 + gap + 12, 32);
    ctx.drawImage(one, 0, labelH, w1, h1);
    ctx.drawImage(two, w1 + gap, labelH, w2, h2);
    return canvas.toDataURL('image/jpeg', 0.82);
  };

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (url.includes('/api/chats/') && url.includes('/messages/stream') && typeof init.body === 'string') {
      try {
        const body = JSON.parse(init.body);
        if (body.imageData2) {
          const first = body.imageData.startsWith('data:') ? body.imageData : `data:${body.imageMimeType || 'image/jpeg'};base64,${body.imageData}`;
          const second = body.imageData2.startsWith('data:') ? body.imageData2 : `data:${body.imageMimeType2 || 'image/jpeg'};base64,${body.imageData2}`;
          const combined = await makeComparisonImage(first, second);
          body.imageData = raw(combined);
          body.imageMimeType = 'image/jpeg';
          body.imageData2 = null;
          body.imageMimeType2 = null;
        } else if (body.imageData) {
          body.imageData = raw(body.imageData);
        }
        init = { ...init, body: JSON.stringify(body) };
      } catch (error) {
        console.error('image transport fix:', error);
      }
    }
    return originalFetch(input, init);
  };
})();
