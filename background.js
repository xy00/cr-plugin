chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeCode') {
    analyzeCodeWithAI(request.codeChanges)
      .then(results => {
        sendResponse({ success: true, results });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

async function analyzeCodeWithAI(codeChanges) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('Please set your OpenAI API key in the extension popup.');
  }
// https://api.siliconflow.cn/v1/chat/completions
  const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'Qwen/Qwen3-Next-80B-A3B-Instruct',
      messages: [
        {
          role: 'system',
          content: `You are a senior software engineer specializing in code review. Analyze the following code changes and provide:
1. Overall code quality assessment
2. Specific issues found (if any)
3. Detailed improvement suggestions
4. Best practices recommendations

Format your response in markdown for readability.`
        },
        {
          role: 'user',
          content: codeChanges
        }
      ],
      temperature: 0.7,
      stream: false,
      enable_thinking: false,
      max_tokens: 1500,
      response_format: {type: 'text'},
    })
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function getApiKey() {
  const result = await chrome.storage.sync.get(['openaiApiKey']);
  return result.openaiApiKey;
}