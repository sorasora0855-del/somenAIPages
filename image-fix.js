(() => {
  const imageInput = document.getElementById('imageInput');
  const cameraInput = document.getElementById('cameraInput');
  if (!imageInput || !cameraInput) return;

  // app.js owns the input handlers. This file only normalizes image payloads
  // right before they leave the browser so the API receives raw base64.
  const originalFetch = window.fetch.bind(window);
  const toRawBase64 = value => {
    if (typeof value !== 'string') return value;
    const comma = value.indexOf(',');
    return value.startsWith('data:') && comma >= 0 ? value.slice(comma + 1) : value;
  };

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (url.includes('/api/chats/') && url.includes('/messages/stream') && typeof init.body === 'string') {
      try {
        const body = JSON.parse(init.body);
        if (body.imageData) body.imageData = toRawBase64(body.imageData);
        if (body.imageData2) body.imageData2 = toRawBase64(body.imageData2);
        init = { ...init, body: JSON.stringify(body) };
      } catch (_) {
        // Leave non-JSON requests untouched.
      }
    }
    return originalFetch(input, init);
  };
})();
