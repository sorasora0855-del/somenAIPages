(() => {
  const $ = id => document.getElementById(id);
  const composer = $('composer'), input = $('input'), chat = $('chat');
  if (!composer || !input || !chat) return;

  const renderUserImages = (text, files) => {
    const el = renderMessage('user', text || '📎 画像を送信');
    el.classList.add('user-image-message');
    const grid = document.createElement('div');
    grid.className = 'user-image-grid';
    files.forEach((file, index) => {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = `送信画像 ${index + 1}`;
      img.loading = 'eager';
      img.onload = () => URL.revokeObjectURL(img.src);
      grid.appendChild(img);
    });
    el.appendChild(grid);
    chat.scrollTop = chat.scrollHeight;
    return el;
  };

  const originalSubmit = composer.onsubmit;
  if (!originalSubmit) return;

  composer.onsubmit = async e => {
    const files = window.__somenAIImages?.files || [];
    if (!files.length) return originalSubmit(e);

    // Start preparing the actual API payload, but don't wait before updating the UI.
    const payloadReady = window.__somenAIImages?.getPayload?.() || Promise.resolve();
    const text = input.value.trim();
    const userMessage = renderUserImages(text, files);

    // The selected-image tray disappears immediately after tapping send.
    window.__somenAIImages?.clearVisual?.();

    // Keep the actual upload payload alive while the visual selection is cleared.
    try { await payloadReady; } catch {}
    input.value = text;

    // Let the existing submit/streaming implementation handle the request.
    const result = originalSubmit(e);

    // The original handler creates a plain user bubble. Remove that duplicate;
    // our richer bubble above already contains the real thumbnails.
    const users = [...chat.querySelectorAll('.message.user')];
    const duplicate = users[users.length - 1];
    if (duplicate && duplicate !== userMessage && duplicate.textContent.trim() === (text || '📎 画像を送信')) {
      duplicate.remove();
    }
    chat.scrollTop = chat.scrollHeight;
    return result;
  };
})();
