(function() {
  if (window.__cColorPickerActive) return;
  window.__cColorPickerActive = true;

  let canvas, ctx, offscreenCanvas, offscreenCtx, imgData;
  let imgWidth, imgHeight;
  let mouseX = -1000, mouseY = -1000;
  let dpr = window.devicePixelRatio || 1;
  const LENS_RADIUS = 60;
  const GRID_SIZE = 11;
  const CELL_SIZE = Math.floor((LENS_RADIUS * 2) / GRID_SIZE);

  function init(dataUrl) {
    // Lock body scroll
    document.body.classList.add('color-picker-active');

    // Create main overlay canvas
    canvas = document.createElement('canvas');
    canvas.id = 'color-picker-overlay-canvas';
    document.body.appendChild(canvas);
    
    // Size it to window
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      dpr = window.devicePixelRatio || 1;
    }
    window.addEventListener('resize', resize);
    resize();
    
    ctx = canvas.getContext('2d', { alpha: true });

    // Create offscreen canvas to hold screenshot data
    const img = new Image();
    img.onload = () => {
      offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = img.width;
      offscreenCanvas.height = img.height;
      imgWidth = img.width;
      imgHeight = img.height;
      
      offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
      offscreenCtx.drawImage(img, 0, 0);
      imgData = offscreenCtx.getImageData(0, 0, imgWidth, imgHeight).data;
      
      // Start render loop
      requestAnimationFrame(render);
    };
    img.src = dataUrl;

    // Listeners
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
    window.addEventListener('keydown', onKeyDown);
  }

  function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }

  function getPixelColorHex(x, y) {
    if (!imgData) return '#000000';
    // Map CSS px to Image px
    let px = Math.min(Math.max(Math.floor(x * dpr), 0), imgWidth - 1);
    let py = Math.min(Math.max(Math.floor(y * dpr), 0), imgHeight - 1);
    
    const idx = (py * imgWidth + px) * 4;
    const r = imgData[idx];
    const g = imgData[idx+1];
    const b = imgData[idx+2];
    
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  }

  function getGridColors() {
    const colors = [];
    const half = Math.floor(GRID_SIZE / 2);
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        colors.push(getPixelColorHex(mouseX + dx, mouseY + dy));
      }
    }
    return colors;
  }

  function render() {
    if (!window.__cColorPickerActive) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw slight dark tint
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (mouseX < 0 || mouseY < 0 || !imgData) {
      requestAnimationFrame(render);
      return;
    }

    // Clamp lens position near edges
    const margin = LENS_RADIUS + 40;
    const lx = Math.min(Math.max(mouseX, margin), canvas.width - margin);
    const ly = Math.min(Math.max(mouseY, margin), canvas.height - margin);

    const colors = getGridColors();
    const centerHex = getPixelColorHex(mouseX, mouseY);

    ctx.save();
    
    // Draw border/shadow of lens
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(lx, ly, LENS_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Clip to lens inner circle
    ctx.beginPath();
    ctx.arc(lx, ly, LENS_RADIUS - 4, 0, Math.PI * 2);
    ctx.clip();

    // Draw pixel grid
    const half = Math.floor(GRID_SIZE / 2);
    let i = 0;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const cx = lx + dx * CELL_SIZE;
        const cy = ly + dy * CELL_SIZE;
        ctx.fillStyle = colors[i++];
        ctx.fillRect(cx - CELL_SIZE/2, cy - CELL_SIZE/2, CELL_SIZE, CELL_SIZE);
        ctx.strokeRect(cx - CELL_SIZE/2, cy - CELL_SIZE/2, CELL_SIZE, CELL_SIZE);
      }
    }

    // Draw center crosshair
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    // Outer highlight for dark colors
    ctx.strokeRect(lx - CELL_SIZE/2, ly - CELL_SIZE/2, CELL_SIZE, CELL_SIZE);
    
    ctx.restore();

    // Lens border ring
    ctx.beginPath();
    ctx.arc(lx, ly, LENS_RADIUS - 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Preview label below the lens
    const boxW = 80;
    const boxH = 26;
    const boxX = lx - boxW / 2;
    const boxY = ly + LENS_RADIUS + 8;
    
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 4);
    ctx.fill();
    
    // Swatch box
    ctx.fillStyle = centerHex;
    ctx.fillRect(boxX + 4, boxY + 4, 18, 18);
    ctx.strokeStyle = '#444';
    ctx.strokeRect(boxX + 4, boxY + 4, 18, 18);

    // Text label
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(centerHex, boxX + 26, boxY + 18);

    requestAnimationFrame(render);
  }

  function showToastMessage(text) {
    let t = document.getElementById('color-picker-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'color-picker-toast';
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.style.opacity = 1;
  }

  function onClick() {
    const hex = getPixelColorHex(mouseX, mouseY);
    navigator.clipboard.writeText(hex).then(() => {
      complete(hex);
    }).catch(err => {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = hex;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        complete(hex);
      } catch(e) {
        complete(hex); // still close
      }
      document.body.removeChild(textArea);
    });
  }
  
  function complete(hex) {
    showToastMessage(`Copied ${hex}`);
    setTimeout(() => {
      cleanup();
    }, 800);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      cleanup();
    }
  }

  function cleanup() {
    window.__cColorPickerActive = false;
    document.body.classList.remove('color-picker-active');
    if (canvas) {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', onClick);
      canvas.remove();
    }
    window.removeEventListener('keydown', onKeyDown);
    
    const t = document.getElementById('color-picker-toast');
    if (t) t.remove();
    
    imgData = null;
    ctx = null;
    offscreenCtx = null;
  }

  // Listen for initialization from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'start-eyedropper' && message.dataUrl) {
      init(message.dataUrl);
    }
  });

})();
