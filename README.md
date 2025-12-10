# GitHub Code Review Assistant

A browser extension that automatically analyzes GitHub pull request code changes and provides AI-powered quality assessment and suggestions.

## Features

- Automatically detects code changes in GitHub PRs
- AI-powered code quality assessment using OpenAI API
- Detailed improvement suggestions and best practices
- Intuitive results display within GitHub interface
- Easy configuration of OpenAI API key

## Installation (Developer Mode)

1. **Download the extension files**
   - Clone or download this repository to your local machine
   - Extract the files if you downloaded a ZIP archive

2. **Load the extension in Chrome**
   - Open Chrome browser and navigate to `chrome://extensions/`
   - Enable "Developer mode" using the toggle switch in the top-right corner
   - Click "Load unpacked" button
   - Select the directory containing the extension files

3. **Configure API key**
   - Click on the extension icon in the Chrome toolbar
   - Enter your OpenAI API key in the popup
   - Click "Save API Key"

4. **Use the extension**
   - Open any GitHub pull request page
   - Look for the "Analyze Code with AI" button in the PR header
   - Click the button to start the AI analysis
   - View the results displayed on the PR page

## File Structure

```
├── background.js      # Background script for API communication
├── content.js         # Content script injected into GitHub pages
├── manifest.json      # Extension configuration file
├── popup.html         # Popup UI for API key configuration
├── popup.js           # Popup logic
└── README.md          # This file
```

## Requirements

- Chrome browser (version 88+ for Manifest V3 support)
- OpenAI API key (you can get one from https://platform.openai.com/)

## Usage

1. Navigate to any GitHub pull request
2. Click the "Analyze Code with AI" button in the header
3. Wait for the AI analysis to complete
4. Review the AI-generated suggestions and feedback
5. Use the insights to improve your code review process

## Privacy

- Your OpenAI API key is stored securely using Chrome's storage API
- The extension only sends code changes to OpenAI API when you explicitly click the analyze button
- No data is collected or stored by the extension developers

## Troubleshooting

- **Button not appearing**: Make sure you're on a GitHub PR page (`https://github.com/*/pull/*`)
- **API error**: Check that you've entered a valid OpenAI API key and that you have sufficient credits
- **No results**: Verify that the PR has code changes and that the extension has permission to access GitHub

## Development

To modify or extend the extension:

1. Make your changes to the code
2. Go to `chrome://extensions/` and click "Reload" on the extension
3. Test your changes on a GitHub PR page

## License

MIT