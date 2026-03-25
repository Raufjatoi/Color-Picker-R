document.addEventListener('DOMContentLoaded', () => {
  const btnPick = document.getElementById('btn-pick');
  const btnExtract = document.getElementById('btn-extract');
  const resultsContainer = document.getElementById('results-container');
  const colorGrid = document.getElementById('color-grid');
  const loading = document.getElementById('loading');
  const toast = document.getElementById('toast');

  let toastTimeout;
  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2000);
  };

  btnPick.addEventListener('click', () => {
    // Read user permissions before activating
    chrome.runtime.sendMessage({ action: 'activate-eyedropper' }, (response) => {
      if (chrome.runtime.lastError) {
        showToast('Error: ' + chrome.runtime.lastError.message);
        return;
      }
      if (response && response.error) {
        showToast(response.error);
        return; // don't close popup so user sees the error
      }
      window.close(); // Close popup if success
    });
  });

  btnExtract.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'extract-colors-in-page' }, (response) => {
      if (chrome.runtime.lastError) {
        showToast('Error: ' + chrome.runtime.lastError.message);
        return;
      }
      if (response && response.error) {
        showToast(response.error);
        return;
      }
      window.close(); // Close popup, overlay will show on page
    });
  });
});
