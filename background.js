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
  console.log('Starting code analysis with AI...');

  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('Please set your API key using the "Configure API Key" button.');
  }

  console.log('API Key found, making request to SiliconFlow API...');

  try {
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
            content: `你是「增量代码审查机器人」。
接下来我会给你一份 Git diff（统一格式），请只做 3 件事：
逐行 diff，只检查「新增或修改」的代码。
按严重度输出一张「迷你问题表」：
🔴 阻塞（必须改）
🟡 警告（最好改）
🟢 建议（可不改）
给出「<=5 条」可立即落地的修复建议，每条 1 行，格式：
文件:行 — 简述 — 推荐做法
审查维度（按优先级）：
① 安全漏洞 → ② 功能正确性 → ③ 性能 → ④ 可读性/规范

输出模板
🔍 新增/修改行数：X
🔴 阻塞：Y
🟡 警告：Z
🟢 建议：W

迷你问题表
| 文件 | 行号 | 级别 | 问题简述 | 修复一句话 |

TOP 修复清单
1. 文件:行 — …
2. 文件:行 — …
…（<=5 条）`
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

    console.log('API response received, status:', response.status);

    if (!response.ok) {
      // Get detailed error information if available
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API request failed: ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('API response data:', data);

    if (!data.choices || data.choices.length === 0) {
      throw new Error('Invalid API response: No choices found');
    }

    const content = data.choices[0].message?.content;
    if (!content) {
      throw new Error('Invalid API response: No content found in message');
    }

    console.log('AI analysis completed successfully, content length:', content.length);
    return content;
  } catch (error) {
    console.error('Error in analyzeCodeWithAI:', error);
    throw error;
  }
}

async function getApiKey() {
  const result = await chrome.storage.sync.get(['openaiApiKey']);
  return result.openaiApiKey;
}