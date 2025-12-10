function detectCodeChanges() {
  const codeChanges = [];

  try {
    // Find all diff files in the pull request with more flexible selectors
    let diffFiles;
    try {
      diffFiles = document.querySelectorAll('.file, [data-testid="diff-file"]');
      console.log('Found diff files:', diffFiles.length);
    } catch (queryError) {
      console.error('Error querying diff files:', queryError);
      return codeChanges;
    }

    // Ensure diffFiles is iterable
    if (!diffFiles || typeof diffFiles.forEach !== 'function') {
      console.error('diffFiles is not iterable:', diffFiles);
      return codeChanges;
    }

    diffFiles.forEach((file, index) => {
      try {
        console.log(`Processing file ${index}:`, file);

        // Skip if not a valid element
        if (!file || !(file instanceof Element)) {
          console.warn(`Skipping invalid file element at index ${index}`);
          return;
        }

        // Try multiple selectors for fileName
        let fileName = '';
        const fileNameSelectors = [
          '.file-header .file-info a',
          '.file-info a',
          '.diff-file-header a',
          '.file-header-title a'
        ];

        for (const selector of fileNameSelectors) {
          const element = file.querySelector(selector);
          if (element && element.textContent) {
            fileName = element.textContent.trim();
            break;
          }
        }

        if (!fileName) {
          fileName = `file_${index}`;
          console.log(`Using fallback filename for file ${index}`);
        }

        console.log(`File name: ${fileName}`);

        // Try multiple selectors for diff content
        let diffContent = '';

        // Try 1: Find diff-view element
        const diffView = file.querySelector('.diff-view');
        if (diffView) {
          diffContent = diffView.innerHTML;
        }

        // Try 2: Find js-file-content element
        if (!diffContent) {
          const jsFileContent = file.querySelector('.js-file-content');
          if (jsFileContent) {
            diffContent = jsFileContent.innerHTML;
          }
        }

        // Try 3: Find diff lines directly
        if (!diffContent) {
          const diffLineSelectors = ['.diff-line', '.blob-code', '.js-file-line'];
          let diffLines = [];

          for (const selector of diffLineSelectors) {
            diffLines = Array.from(file.querySelectorAll(selector));
            if (diffLines.length > 0) {
              break;
            }
          }

          if (diffLines.length > 0) {
            // Create a simple HTML structure with the diff lines
            diffContent = '<div class="diff-view">' +
              diffLines.map(line => line.outerHTML).join('') +
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

        if (diffText && diffText.trim()) {
          codeChanges.push({
            fileName,
            diff: diffText
          });
          console.log(`Added file ${fileName} to code changes`);
        }
      } catch (fileError) {
        console.error(`Error processing file ${index}:`, fileError);
        // Continue with next file instead of breaking
      }
    });
  } catch (error) {
    console.error('Unexpected error in detectCodeChanges:', error);
  }

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
  try {
    // Check if button already exists
    if (document.getElementById('analyze-code-btn')) return;

    // Find the right place to add the button, try multiple selectors
    const headerSelectors = [
      '.gh-header-actions',
      '.discussion-timeline-actions',
      '.Layout-header',
      '.gh-header'
    ];

    let headerActions = null;
    for (const selector of headerSelectors) {
      headerActions = document.querySelector(selector);
      if (headerActions) {
        console.log('Found header actions container with selector:', selector);
        break;
      }
    }

    if (!headerActions) {
      console.warn('No suitable header actions container found');
      return;
    }

    const analyzeButton = document.createElement('button');
    analyzeButton.id = 'analyze-code-btn';
    analyzeButton.className = 'btn btn-primary ml-2';
    analyzeButton.textContent = 'Analyze Code with AI';

    analyzeButton.addEventListener('click', () => {
      analyzeCode();
    });

    headerActions.appendChild(analyzeButton);
    console.log('Successfully added analyze button');
  } catch (error) {
    console.error('Error adding analyze button:', error);
  }
}

async function analyzeCode() {
  const button = document.getElementById('analyze-code-btn');
  if (!button) {
    console.error('Analyze button not found');
    return;
  }

  button.disabled = true;
  button.textContent = 'Analyzing...';

  try {
    // Step 1: Detect code changes
    console.log('Step 1: Detecting code changes...');
    const codeChanges = detectCodeChanges();

    if (!Array.isArray(codeChanges)) {
      throw new Error('detectCodeChanges() did not return an array');
    }

    if (codeChanges.length === 0) {
      alert('No code changes detected.');
      return;
    }

    console.log('Code changes detected:', codeChanges.length, 'files');

    // Step 2: Send message to background script
    console.log('Step 2: Sending code changes to background script...');

    const sendMessagePromise = new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'analyzeCode',
        codeChanges: JSON.stringify(codeChanges, null, 2)
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    const response = await sendMessagePromise;
    console.log('Step 2 completed: Received response from background:', response);

    // Step 3: Check response
    if (!response) {
      throw new Error('Empty response from background script');
    }

    if (response.success) {
      console.log('Step 3: Analysis successful, displaying results...');
      displayResults(response.results);
    } else {
      const errorMsg = response.error || 'Unknown error';
      console.error('Analysis failed:', errorMsg);
      alert('Error: ' + errorMsg);
    }
  } catch (error) {
    // Enhanced error handling
    console.error('Analysis error:');
    console.error(error);

    // Safe error message extraction
    let errorMsg = 'Unknown error occurred';
    if (error && typeof error === 'object') {
      if (error.message) {
        errorMsg = error.message;
      } else if (error.toString) {
        errorMsg = error.toString();
      }
    } else if (typeof error === 'string') {
      errorMsg = error;
    }

    alert('Failed to analyze code: ' + errorMsg);
  } finally {
    // Ensure button is always re-enabled
    try {
      button.disabled = false;
      button.textContent = 'Analyze Code with AI';
    } catch (buttonError) {
      console.error('Error updating button:', buttonError);
    }
  }
}

// Simple Markdown to HTML converter
function markdownToHtml(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  let html = markdown;

  // Convert headings
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
  html = html.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
  html = html.replace(/^###### (.*$)/gm, '<h6>$1</h6>');

  // Convert bold text
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Convert italic text
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');

  // Convert code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');

  // Convert blockquotes
  html = html.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');

  // Convert unordered lists
  html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

  // Convert ordered lists
  html = html.replace(/^\d\. (.*$)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ol>$1</ol>');

  // Convert links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  // Convert paragraphs
  html = html.replace(/^(?!<h|<ul|<ol|<li|<blockquote|<pre|<code)(.*$)/gm, '<p>$1</p>');

  // Fix paragraph wrapping (remove paragraphs inside certain elements)
  html = html.replace(/<(ul|ol|blockquote|pre)><p>/g, '<$1>');
  html = html.replace(/<\/p><\/(ul|ol|blockquote|pre)>/g, '</$1>');

  return html;
}

function displayResults(results) {
  console.log('Displaying results:', results);

  // Create or update results panel
  let resultsPanel = document.getElementById('ai-analysis-results');

  if (!resultsPanel) {
    resultsPanel = document.createElement('div');
    resultsPanel.id = 'ai-analysis-results';
    resultsPanel.className = 'mt-4 p-4 border rounded bg-gray-50 shadow-md';
    resultsPanel.style.marginTop = '20px';
    resultsPanel.style.backgroundColor = '#f6f8fa';
    resultsPanel.style.border = '1px solid #e1e4e8';
    resultsPanel.style.borderRadius = '6px';
    resultsPanel.style.padding = '16px';
    resultsPanel.style.maxWidth = '100%';
    resultsPanel.style.overflow = 'hidden';

    const header = document.createElement('h3');
    header.className = 'text-lg font-bold mb-2';
    header.textContent = 'AI Code Analysis Results';
    header.style.fontSize = '18px';
    header.style.fontWeight = '600';
    header.style.marginBottom = '12px';
    resultsPanel.appendChild(header);

    // Try multiple locations to insert the results panel
    let insertionPoint = null;

    // Try 1: After PR description
    insertionPoint = document.querySelector('.comment-form-head');

    // Try 2: Inside PR tab container
    if (!insertionPoint) {
      insertionPoint = document.querySelector('.discussion-timeline-actions');
    }

    // Try 3: Inside PR header
    if (!insertionPoint) {
      insertionPoint = document.querySelector('.gh-header');
    }

    // Try 4: After file diffs
    if (!insertionPoint) {
      const diffFiles = document.querySelector('.diff-view');
      if (diffFiles) {
        insertionPoint = diffFiles.closest('.file');
      }
    }

    // Try 5: At the top of the page content
    if (!insertionPoint) {
      insertionPoint = document.querySelector('.Layout-main');
    }

    // Insert the results panel
    if (insertionPoint) {
      insertionPoint.parentNode.insertBefore(resultsPanel, insertionPoint.nextSibling);
      console.log('Results panel inserted after insertion point');
    } else {
      // Last resort: Append to body
      document.body.appendChild(resultsPanel);
      console.log('Results panel appended to body');
    }
  }

  // Clear previous results
  while (resultsPanel.children.length > 1) {
    resultsPanel.removeChild(resultsPanel.lastChild);
  }

  // Ensure results is a string
  const resultsText = typeof results === 'string' ? results : JSON.stringify(results, null, 2);

  // Add raw results for debugging
  const rawResults = document.createElement('pre');
  rawResults.className = 'mb-4 p-4 bg-gray-100 rounded';
  rawResults.style.display = 'none'; // Hide by default, but available for debugging
  rawResults.textContent = 'Raw results: ' + resultsText;
  resultsPanel.appendChild(rawResults);

  // Add results content
  const resultsContent = document.createElement('div');
  resultsContent.className = 'markdown-body';
  resultsContent.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
  resultsContent.style.fontSize = '14px';
  resultsContent.style.lineHeight = '1.6';
  resultsContent.style.color = '#24292e';
  resultsContent.style.overflow = 'auto';
  resultsContent.style.padding = '16px';
  resultsContent.style.backgroundColor = '#ffffff';
  resultsContent.style.border = '1px solid #e1e4e8';
  resultsContent.style.borderRadius = '6px';

  // Convert Markdown to HTML
  const htmlContent = markdownToHtml(resultsText);
  console.log('Converted Markdown to HTML:', htmlContent);

  // Set HTML content
  resultsContent.innerHTML = htmlContent;

  // Apply styling to the HTML elements
  enhanceMarkdownStyling(resultsContent);

  // Add the results content to the panel
  resultsPanel.appendChild(resultsContent);

  console.log('Results displayed successfully');
}

// Enhance markdown styling for better display (GitHub-like styling)
function enhanceMarkdownStyling(element) {
  // Apply GitHub-like styling to the container
  element.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
  element.style.fontSize = '14px';
  element.style.lineHeight = '1.6';
  element.style.color = '#24292e';
  element.style.wordWrap = 'break-word';

  // Add styling to headings
  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(heading => {
    heading.style.margin = '24px 0 16px';
    heading.style.fontWeight = '600';
    heading.style.lineHeight = '1.25';
    heading.style.color = '#24292e';
    heading.style.border = 'none';

    if (heading.tagName === 'H1') {
      heading.style.fontSize = '32px';
      heading.style.borderBottom = '1px solid #eaecef';
      heading.style.paddingBottom = '0.3em';
    } else if (heading.tagName === 'H2') {
      heading.style.fontSize = '24px';
      heading.style.borderBottom = '1px solid #eaecef';
      heading.style.paddingBottom = '0.3em';
    } else if (heading.tagName === 'H3') {
      heading.style.fontSize = '20px';
    } else if (heading.tagName === 'H4') {
      heading.style.fontSize = '16px';
    } else if (heading.tagName === 'H5') {
      heading.style.fontSize = '14px';
    } else if (heading.tagName === 'H6') {
      heading.style.fontSize = '12px';
      heading.style.color = '#6a737d';
    }
  });

  // Add styling to paragraphs
  const paragraphs = element.querySelectorAll('p');
  paragraphs.forEach(paragraph => {
    paragraph.style.margin = '0 0 16px';
  });

  // Add styling to code blocks and inline code
  const codeBlocks = element.querySelectorAll('pre, code');
  codeBlocks.forEach(block => {
    if (block.tagName === 'PRE') {
      // Add code block container styling
      block.style.padding = '16px';
      block.style.overflow = 'auto';
      block.style.fontSize = '85%';
      block.style.lineHeight = '1.45';
      block.style.backgroundColor = '#f6f8fa';
      block.style.borderRadius = '6px';
      block.style.margin = '0 0 16px';
      block.style.wordWrap = 'normal';
      block.style.border = '1px solid #e1e4e8';

      // Add styling to code within pre
      const codeInPre = block.querySelector('code');
      if (codeInPre) {
        codeInPre.style.padding = '0';
        codeInPre.style.fontSize = '100%';
        codeInPre.style.backgroundColor = 'transparent';
        codeInPre.style.border = '0';
        codeInPre.style.fontFamily = 'SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace';
      }
    } else if (block.tagName === 'CODE') {
      // Add inline code styling
      block.style.padding = '0.2em 0.4em';
      block.style.fontSize = '85%';
      block.style.backgroundColor = 'rgba(27, 31, 35, 0.05)';
      block.style.borderRadius = '3px';
      block.style.fontFamily = 'SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace';
      block.style.color = '#24292e';
    }
  });

  // Add styling to lists
  const lists = element.querySelectorAll('ul, ol');
  lists.forEach(list => {
    list.style.margin = '0 0 16px 2em';
    list.style.padding = '0';
  });

  // Add styling to list items
  const listItems = element.querySelectorAll('li');
  listItems.forEach(item => {
    item.style.margin = '0.25em 0';
  });

  // Add styling to nested lists
  const nestedLists = element.querySelectorAll('li > ul, li > ol');
  nestedLists.forEach(nestedList => {
    nestedList.style.margin = '0.25em 0 0 2em';
  });

  // Add styling to blockquotes
  const blockquotes = element.querySelectorAll('blockquote');
  blockquotes.forEach(quote => {
    quote.style.margin = '0 0 16px';
    quote.style.padding = '0 1em';
    quote.style.color = '#6a737d';
    quote.style.borderLeft = '0.25em solid #dfe2e5';
    quote.style.backgroundColor = 'rgba(27, 31, 35, 0.05)';
    quote.style.borderRadius = '0 6px 6px 0';
  });

  // Add styling to blockquote paragraphs
  const quoteParagraphs = element.querySelectorAll('blockquote p');
  quoteParagraphs.forEach(para => {
    para.style.margin = '0 0 16px';
  });

  // Add styling to tables
  const tables = element.querySelectorAll('table');
  tables.forEach(table => {
    table.style.borderSpacing = '0';
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.overflow = 'auto';
    table.style.margin = '0 0 16px';
    table.style.fontSize = '14px';
  });

  // Add styling to table headers
  const tableHeaders = element.querySelectorAll('th');
  tableHeaders.forEach(header => {
    header.style.fontWeight = '600';
    header.style.backgroundColor = '#f6f8fa';
    header.style.border = '1px solid #dfe2e5';
    header.style.padding = '6px 13px';
    header.style.textAlign = 'left';
  });

  // Add styling to table cells
  const tableCells = element.querySelectorAll('td');
  tableCells.forEach(cell => {
    cell.style.border = '1px solid #dfe2e5';
    cell.style.padding = '6px 13px';
  });

  // Add styling to table rows
  const tableRows = element.querySelectorAll('tr');
  tableRows.forEach((row, index) => {
    if (index % 2 === 1) {
      row.style.backgroundColor = '#f6f8fa';
    }
  });

  // Add styling to links
  const links = element.querySelectorAll('a');
  links.forEach(link => {
    link.style.color = '#0366d6';
    link.style.textDecoration = 'none';
    link.style.fontWeight = '500';

    // Add hover effect
    link.addEventListener('mouseenter', () => {
      link.style.textDecoration = 'underline';
    });

    link.addEventListener('mouseleave', () => {
      link.style.textDecoration = 'none';
    });

    // Add focus styling for accessibility
    link.addEventListener('focus', () => {
      link.style.outline = '2px solid #0366d6';
      link.style.outlineOffset = '2px';
    });

    link.addEventListener('blur', () => {
      link.style.outline = 'none';
    });
  });

  // Add styling to images
  const images = element.querySelectorAll('img');
  images.forEach(image => {
    image.style.maxWidth = '100%';
    image.style.boxSizing = 'initial';
    image.style.backgroundClip = 'padding-box';
    image.style.margin = '0 0 16px';
    image.style.borderRadius = '4px';
    image.style.border = '1px solid #e1e4e8';
  });

  // Add styling to horizontal rules
  const hrElements = element.querySelectorAll('hr');
  hrElements.forEach(hr => {
    hr.style.height = '0.25em';
    hr.style.padding = '0';
    hr.style.margin = '24px 0';
    hr.style.backgroundColor = '#e1e4e8';
    hr.style.border = '0';
    hr.style.borderRadius = '3px';
  });

  // Add styling to strong (bold) text
  const strongElements = element.querySelectorAll('strong, b');
  strongElements.forEach(strong => {
    strong.style.fontWeight = '600';
    strong.style.color = '#24292e';
  });

  // Add styling to em (italic) text
  const emElements = element.querySelectorAll('em, i');
  emElements.forEach(em => {
    em.style.fontStyle = 'italic';
  });

  // Add styling to strikethrough text
  const strikeElements = element.querySelectorAll('del, s, strike');
  strikeElements.forEach(strike => {
    strike.style.textDecoration = 'line-through';
  });

  console.log('Enhanced markdown styling applied successfully');
}

// Add API Key configuration button to PR page
function addConfigButton() {
  try {
    // Check if button already exists
    if (document.getElementById('config-api-btn')) return;

    // Find the right place to add the button, try multiple selectors
    const headerSelectors = [
      '.gh-header-actions',
      '.discussion-timeline-actions',
      '.Layout-header',
      '.gh-header'
    ];

    let headerActions = null;
    for (const selector of headerSelectors) {
      headerActions = document.querySelector(selector);
      if (headerActions) {
        console.log('Found header actions container with selector:', selector);
        break;
      }
    }

    if (!headerActions) {
      console.warn('No suitable header actions container found for config button');
      return;
    }

    const configButton = document.createElement('button');
    configButton.id = 'config-api-btn';
    configButton.className = 'btn btn-secondary ml-2';
    configButton.textContent = 'Configure API Key';

    configButton.addEventListener('click', () => {
      try {
        chrome.storage.sync.get(['openaiApiKey'], (result) => {
          try {
            const currentKey = result.openaiApiKey || '';
            const apiKey = prompt('Please enter your OpenAI API Key:', currentKey);
            if (apiKey !== null) {
              chrome.storage.sync.set({ openaiApiKey: apiKey.trim() }, () => {
                alert('API key saved successfully!');
              });
            }
          } catch (promptError) {
            console.error('Error in prompt handling:', promptError);
          }
        });
      } catch (storageError) {
        console.error('Error in storage operation:', storageError);
      }
    });

    headerActions.appendChild(configButton);
    console.log('Successfully added config button');
  } catch (error) {
    console.error('Error adding config button:', error);
  }
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