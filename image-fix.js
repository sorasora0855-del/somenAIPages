(() => {
  const imageInput = document.getElementById('imageInput');
  const cameraInput = document.getElementById('cameraInput');
  if (!imageInput || !cameraInput) return;

  const toDataURL = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('画像の読み込みに失敗しました'));
    reader.readAsDataURL(file);
  });

  const prepare = async (event, original) => {
    const files = [...(event.target.files || [])];
    try {
      await Promise.all(files.map(async file => {
        file.base64 = await toDataURL(file);
        file.mimeType = file.type || 'image/jpeg';
      }));
      // app.js の既存処理には、base64/mimeType を持った File オブジェクトを渡す。
      original({ target: { files, value: '' } });
    } catch (error) {
      const status = document.getElementById('status');
      if (status) status.textContent = '画像の読み込みに失敗しました';
      console.error(error);
    } finally {
      event.target.value = '';
    }
  };

  const originalImageChange = imageInput.onchange;
  const originalCameraChange = cameraInput.onchange;

  imageInput.onchange = event => prepare(event, originalImageChange);
  cameraInput.onchange = event => prepare(event, originalCameraChange);
})();
