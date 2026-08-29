(() => {
  const imageInput = document.getElementById('imageInput');
  const cameraInput = document.getElementById('cameraInput');
  if (!imageInput || !cameraInput) return;
  imageInput.multiple = true;
  imageInput.accept = 'image/*';
  cameraInput.multiple = false;
  cameraInput.accept = 'image/*';
})();
