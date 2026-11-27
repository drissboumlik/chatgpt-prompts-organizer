# Prompts Organizer

A Chrome extension designed to organize chats into folders on ChatGPT, Claude, and DeepSeek.



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
- **Multi-platform support**: Organize ChatGPT, Claude, and DeepSeek chats in the same folders.

Platform-specific URL and DOM handling lives in `platforms/`. To add another service,
create an adapter there and register it in the manifest before the shared `content.js`.



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

<img src="assets/Screenshot_1.png" width="300" />
<img src="assets/Screenshot_2.png" width="300" />
<img src="assets/Screenshot_3.png" width="300" />
<img src="assets/Screenshot_4.png" width="300" />
<img src="assets/Screenshot_5.png" width="300" />
<img src="assets/Screenshot_6.png" width="300" />

---

### Add prompts to folders from chatgpt/claude sidebar

<img src="assets/Screenshot_7.png" width="300" />
<img src="assets/Screenshot_8.png" width="300" />
<img src="assets/Screenshot_9.png" width="300" />
<img src="assets/Screenshot_10.png" width="300" />

---

### Add current prompt to folders

<img src="assets/Screenshot_11.png" width="300" />
<img src="assets/Screenshot_12.png" width="300" />

## 🤝 Contributing
Feel free to open issues or submit pull requests. Contributions are welcome!