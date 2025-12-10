function detectCodeChanges() {
  const codeChanges = [];

  // Find all diff files in the pull request with more flexible selectors
  const diffFiles = document.querySelectorAll('.file, [data-testid="diff-file"]');

  console.log('Found diff files:', diffFiles.length);

  diffFiles.forEach((file, index) => {
    console.log(`Processing file ${index}:`, file);

    // Try multiple selectors for fileName
    let fileName = file.querySelector('.file-header .file-info a')?.textContent.trim();
    if (!fileName) {
      fileName = file.querySelector('.file-info a')?.textContent.trim();
    }
    if (!fileName) {
      fileName = file.querySelector('.diff-file-header a')?.textContent.trim();
    }
    if (!fileName) {
      fileName = `file_${index}`;
      console.log(`Using fallback filename for file ${index}`);
    }

    console.log(`File name: ${fileName}`);

    // Try multiple selectors for diff content
    let diffContent;

    // Try to find diff content directly in the file
    const diffView = file.querySelector('.diff-view');
    if (diffView) {
      diffContent = diffView.innerHTML;
    }
    // Try to find diff content in .js-file-content
    else {
      diffContent = file.querySelector('.js-file-content')?.innerHTML;
    }

    // Try to find diff lines directly
    if (!diffContent) {
      const diffLines = file.querySelectorAll('.diff-line');
      if (diffLines.length > 0) {
        // Create a simple HTML structure with the diff lines
        diffContent = '<div class="diff-view">' +
          Array.from(diffLines).map(line => line.outerHTML).join('') +
          '</div>';
      }
    }

    if (!diffContent) {
      console.log(`No diff content found for file ${index}`);
      return;
    }

    console.log(`Found diff content for file ${index}`);

    // Extract the actual diff text
    const diffText = extractDiffText(diffContent);

    if (diffText) {
      codeChanges.push({
        fileName,
        diff: diffText
      });
      console.log(`Added file ${fileName} to code changes`);
    }
  });

  console.log('Total code changes detected:', codeChanges.length);
  return codeChanges;
}

function extractDiffText(diffContent) {
  // Convert HTML diff to plain text
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = diffContent;

  console.log('Extracting diff text from content:', diffContent.substring(0, 100) + '...');

  // Try to find diff lines with various selectors
  let lines = tempDiv.querySelectorAll('.diff-line');

  // If no .diff-line elements found, try other common diff line selectors
  if (lines.length === 0) {
    lines = tempDiv.querySelectorAll('.blob-code');
    console.log('Found blob-code lines:', lines.length);
  }

  if (lines.length === 0) {
    lines = tempDiv.querySelectorAll('.js-file-line');
    console.log('Found js-file-line lines:', lines.length);
  }

  // If still no lines found, try to get all text content
  if (lines.length === 0) {
    console.log('No specific diff line elements found, using full text content');
    return tempDiv.textContent.trim();
  }

  let diffText = '';

  lines.forEach(line => {
    const lineContent = line.textContent.trim();
    if (lineContent) {
      // Check if the line has a diff type indicator
      const isAdded = line.classList.contains('diff-line-addition') || line.classList.contains('blob-code-addition');
      const isDeleted = line.classList.contains('diff-line-deletion') || line.classList.contains('blob-code-deletion');
      const isContext = line.classList.contains('diff-line-context') || line.classList.contains('blob-code-context');

      // Add appropriate diff prefix
      let prefix = ' ';
      if (isAdded) prefix = '+';
      if (isDeleted) prefix = '-';

      diffText += prefix + lineContent + '\n';
    }
  });

  console.log('Extracted diff text length:', diffText.length);
  return diffText;
}

function addAnalyzeButton() {
  // Check if button already exists
  if (document.getElementById('analyze-code-btn')) return;

  // Find the right place to add the button (GitHub PR header)
  const headerActions = document.querySelector('.gh-header-actions');
  if (!headerActions) return;

  const analyzeButton = document.createElement('button');
  analyzeButton.id = 'analyze-code-btn';
  analyzeButton.className = 'btn btn-primary ml-2';
  analyzeButton.textContent = 'Analyze Code with AI';

  analyzeButton.addEventListener('click', () => {
    analyzeCode();
  });

  headerActions.appendChild(analyzeButton);
}

async function analyzeCode() {
  const button = document.getElementById('analyze-code-btn');
  button.disabled = true;
  button.textContent = 'Analyzing...';

  try {
    const codeChanges = detectCodeChanges();
    if (codeChanges.length === 0) {
      alert('No code changes detected.');
      button.disabled = false;
      button.textContent = 'Analyze Code with AI';
      return;
    }

    // Send code changes to background for AI analysis
    const response = await chrome.runtime.sendMessage({
      action: 'analyzeCode',
      codeChanges: JSON.stringify(codeChanges, null, 2)
    });

    if (response.success) {
      displayResults(response.results);
    } else {
      alert('Error: ' + response.error);
    }
  } catch (error) {
    console.error('Analysis error:', error);
    alert('Failed to analyze code: ' + error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Analyze Code with AI';
  }
}

function displayResults(results) {
  // Create or update results panel
  let resultsPanel = document.getElementById('ai-analysis-results');

  if (!resultsPanel) {
    resultsPanel = document.createElement('div');
    resultsPanel.id = 'ai-analysis-results';
    resultsPanel.className = 'mt-4 p-4 border rounded bg-gray-50';

    const header = document.createElement('h3');
    header.className = 'text-lg font-bold mb-2';
    header.textContent = 'AI Code Analysis Results';
    resultsPanel.appendChild(header);

    // Insert after the PR description
    const prDescription = document.querySelector('.comment-form-head');
    if (prDescription) {
      prDescription.parentNode.insertBefore(resultsPanel, prDescription.nextSibling);
    }
  }

  // Clear previous results
  while (resultsPanel.children.length > 1) {
    resultsPanel.removeChild(resultsPanel.lastChild);
  }

  // Add new results
  const resultsContent = document.createElement('div');
  resultsContent.className = 'markdown-body';
  resultsContent.innerHTML = results;
  resultsPanel.appendChild(resultsContent);
}

// Add API Key configuration button to PR page
function addConfigButton() {
  // Check if button already exists
  if (document.getElementById('config-api-btn')) return;

  // Find the right place to add the button (GitHub PR header)
  const headerActions = document.querySelector('.gh-header-actions');
  if (!headerActions) return;

  const configButton = document.createElement('button');
  configButton.id = 'config-api-btn';
  configButton.className = 'btn btn-secondary ml-2';
  configButton.textContent = 'Configure API Key';

  configButton.addEventListener('click', () => {
    chrome.storage.sync.get(['openaiApiKey'], (result) => {
      const currentKey = result.openaiApiKey || '';
      const apiKey = prompt('Please enter your OpenAI API Key:', currentKey);
      if (apiKey !== null) {
        chrome.storage.sync.set({ openaiApiKey: apiKey.trim() }, () => {
          alert('API key saved successfully!');
        });
      }
    });
  });

  headerActions.appendChild(configButton);
}

// Run when page loads or changes (GitHub is a SPA)
function init() {
  addAnalyzeButton();
  addConfigButton();
}

// Initialize on page load
init();

// Observe for DOM changes (GitHub SPA navigation)
const observer = new MutationObserver(init);
observer.observe(document.body, {
  childList: true,
  subtree: true
});