chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'activate-eyedropper') {
    // 1. Get active tab first
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return sendResponse({ error: 'No active tab found' });
      const activeTab = tabs[0];
      
      // Restrict chrome:// and edge:// URLs
      if (activeTab.url && (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('edge://') || activeTab.url.startsWith('about:'))) {
        sendResponse({ error: 'Cannot use eyedropper on browser settings pages.' });
        return;
      }

      // 2. Capture visible tab
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          sendResponse({ error: chrome.runtime.lastError.message });
          return;
        }
        
        // 3. Inject CSS and JS into the active tab
        chrome.scripting.insertCSS({
          target: { tabId: activeTab.id },
          files: ['content/eyedropper.css']
        }).then(() => {
          return chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['content/eyedropper.js']
          });
        }).then(() => {
           // 4. Send the screenshot dataURL to the injected content script
           chrome.tabs.sendMessage(activeTab.id, {
             action: 'start-eyedropper',
             dataUrl: dataUrl
           });
           sendResponse({ success: true });
        }).catch(err => {
           sendResponse({ error: 'Injection failed: ' + err.message });
        });
      });
    });
    return true; // Keep message channel open for async response
  }

  if (message.action === 'extract-colors-in-page') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return sendResponse({ error: 'No active tab found' });
      const activeTab = tabs[0];
      
      if (activeTab.url && (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('edge://') || activeTab.url.startsWith('about:'))) {
        sendResponse({ error: 'Cannot extract colors on browser settings pages.' });
        return;
      }

      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          return sendResponse({ error: chrome.runtime.lastError.message });
        }
        
        chrome.scripting.insertCSS({
          target: { tabId: activeTab.id },
          files: ['content/extractor.css']
        }).then(() => {
          return chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['lib/kmeans.js', 'content/extractor.js']
          });
        }).then(() => {
           chrome.tabs.sendMessage(activeTab.id, {
             action: 'start-extractor',
             dataUrl: dataUrl
           });
           sendResponse({ success: true });
        }).catch(err => {
           sendResponse({ error: 'Injection failed: ' + err.message });
        });
      });
    });
    return true;
  }
});
