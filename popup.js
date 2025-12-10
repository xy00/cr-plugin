document.addEventListener('DOMContentLoaded', () => {
  // Load existing API key from storage
  chrome.storage.sync.get(['openaiApiKey'], (result) => {
    if (result.openaiApiKey) {
      document.getElementById('openai-api-key').value = result.openaiApiKey;
    }
  });

  // Save API key when button is clicked
  document.getElementById('save-api-key').addEventListener('click', () => {
    const apiKey = document.getElementById('openai-api-key').value.trim();

    if (!apiKey) {
      showStatus('Please enter a valid API key.', 'error');
      return;
    }

    chrome.storage.sync.set({ openaiApiKey: apiKey }, () => {
      showStatus('API key saved successfully!', 'success');
    });
  });
});

function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';

  // Hide status after 3 seconds
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}