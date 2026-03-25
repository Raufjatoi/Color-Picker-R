(function() {
  if (window.__cColorExtractorActive) return;
  window.__cColorExtractorActive = true;

  let container;
  let toastMsg;
  let toastTimeout;

  function initOverlay() {
    container = document.createElement('div');
    container.id = 'color-extractor-overlay';
    
    container.innerHTML = `
      <div id="color-extractor-header">
        <h3>Dominant Colors</h3>
        <button id="color-extractor-close">&times;</button>
      </div>
      <div id="color-extractor-content">
        <div id="color-extractor-loading">Extracting colors...</div>
        <div id="color-extractor-grid" style="display:none"></div>
      </div>
      <div id="color-extractor-toast">Copied!</div>
    `;
    
    document.body.appendChild(container);

    document.getElementById('color-extractor-close').addEventListener('click', cleanup);
    toastMsg = document.getElementById('color-extractor-toast');
  }

  function showToast(text) {
    if (!toastMsg) return;
    toastMsg.textContent = text;
    toastMsg.style.opacity = '1';
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastMsg.style.opacity = '0';
    }, 2000);
  }

  function renderColors(colors) {
    const loading = document.getElementById('color-extractor-loading');
    const grid = document.getElementById('color-extractor-grid');
    if (!loading || !grid) return;
    
    loading.style.display = 'none';
    grid.style.display = 'grid';
    grid.innerHTML = '';
    
    colors.forEach(color => {
      const hex = color.hex.toUpperCase();
      
      const wrapper = document.createElement('div');
      wrapper.className = 'extractor-swatch-wrapper';
      
      const swatch = document.createElement('div');
      swatch.className = 'extractor-swatch';
      swatch.style.backgroundColor = hex;
      
      const label = document.createElement('div');
      label.className = 'extractor-swatch-label';
      label.textContent = hex;
      
      wrapper.appendChild(swatch);
      wrapper.appendChild(label);
      
      wrapper.addEventListener('click', () => {
        navigator.clipboard.writeText(hex).then(() => {
          showToast(`Copied ${hex}`);
        }).catch(err => {
          // Fallback
          const textArea = document.createElement("textarea");
          textArea.value = hex;
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand('copy');
            showToast(`Copied ${hex}`);
          } catch(e) {}
          document.body.removeChild(textArea);
        });
      });
      
      grid.appendChild(wrapper);
    });
  }

  function processImage(dataUrl) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      if (typeof window.extractColors === 'function') {
        const colors = window.extractColors(imageData.data);
        renderColors(colors);
      } else {
        const loading = document.getElementById('color-extractor-loading');
        if (loading) loading.textContent = 'Error: k-means library missing';
      }
    };
    img.src = dataUrl;
  }

  function cleanup() {
    window.__cColorExtractorActive = false;
    if (container) {
      container.remove();
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'start-extractor' && message.dataUrl) {
      initOverlay();
      // small delay to allow UI to paint the loading state
      setTimeout(() => {
        processImage(message.dataUrl);
      }, 100);
    }
  });

})();
