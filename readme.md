# Prompts Organizer

A Chrome extension designed to organize chats into folders on ChatGPT, Claude, DeepSeek, and Gemini.



## 🧠 Overview

The organizer enhances your AI chat experience by providing:

- **Folder Management**: Create, rename, update (including folder color), and delete folders to categorize your prompts.
- **Prompt Organization**: Add, remove, and organize prompts within folders.



## 🚀 Features

- **Folder Operations**:
  - Create new folders with custom names and colors.
  - Rename and update folder details including color.
  - Delete folders you no longer need.
- **Prompt Management**:
  - Add prompts into folders.
  - Delete prompts from folders.
  - Organize prompts efficiently.
- **Multi-platform support**: Organize ChatGPT, Claude, DeepSeek, and Gemini chats in the same folders.

Platform-specific URL, DOM, and styling logic lives in `platforms/`. Each platform's CSS
is loaded alongside the shared `styles.css`. To add another service, create an adapter
and stylesheet there, then register both in the manifest.



## 🛠️ Installation

### 🔧 Manual Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/drissboumlik/prompts-organizer.git
   ```
2. Open Chrome and navigate to chrome://extensions/.
3. Enable Developer mode (toggle switch on the top-right).
4. Click Load unpacked and select the cloned repository folder.


## 📸 Screenshots

### Creating folders

<img src="assets/images/panel-hidden.png" width="600" />
<img src="assets/images/panel-shown.png" width="600" />
<img src="assets/images/create-folder-form.png" width="600" />
<img src="assets/images/fill-form.png" width="600" />
<img src="assets/images/preview-created-folder.png" width="600" />

---

### Add prompts to folders from chatgpt/claude sidebar

<img src="assets/images/show-btn-on-chats-sidebar.png" width="600" />
<img src="assets/images/folder-selected.png" width="600" />
<img src="assets/images/chat-added-to-folder.png" width="600" />

---

### Add current prompt to folders

<img src="assets/images/btn-add-on-current-chat.png" width="600" />

---

### Add prompts from ChatGPT, Claude, DeepSeek, and Gemini

<img src="assets/images/add-gpt-prompt.png" width="600" />
<img src="assets/images/add-claude-prompt.png" width="600" />
<img src="assets/images/add-deepseek-prompt.png" width="600" />
<img src="assets/images/add-gemini-prompt.png" width="600" />

### Added prompts get background of containing folder

<img src="assets/images/chat-bg-same-as-folder.png" width="600" />


## 🤝 Contributing
Feel free to open issues or submit pull requests. Contributions are welcome!
