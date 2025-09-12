function injectStyles() {
    fetch(chrome.runtime.getURL('styles.css'))
        .then(res => res.text())
        .then(css => {
            // You can then inject it like:
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
        });
}

function getFoldersOrDefault(foldersWrapper) {
    return (Array.isArray(foldersWrapper?.folders)
            ? foldersWrapper
            : { hidden: true, folders: [] });
}

function syncFolders(folders) {
    chrome.storage.local.set({ folders }, () => {
        renderFolders();
    });
}

function addPromptToFolderAndSync(folders, prompt) {
    showFolderPicker(folders, (folderName) => {
        folders = addPromptToFolder(folderName, prompt, folders);
        syncFolders(folders);
    });
}

function showFolderPicker(folders, callback) {
    const overlay = document.createElement('div');
    overlay.className = 'db-folder-list-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'db-folder-list-modal';

    const title = document.createElement('h2');
    title.className = 'db-folder-list-modal-header';
    title.textContent = 'Choose Folder';
    modal.appendChild(title);

    folders.folders.forEach(folder => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.setAttribute('data-folder-name', folder.folderName);
        checkbox.id = `folder-${folder.folderName}`;
        const text = document.createElement('span');
        text.textContent = folder.folderName;
        const label = document.createElement('label');
        label.className = 'db-folder-list-modal-btn';
        label.setAttribute('for', `folder-${folder.folderName}`);
        label.addEventListener('mouseover', () => {
            label.style.backgroundColor = folder.color || '#262626';
        });
        label.addEventListener('mouseout', () => {
            label.style.backgroundColor = '';
        });
        label.appendChild(text);
        label.appendChild(checkbox);
        modal.appendChild(label);
    });
    
    
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', () => {
        overlay.remove();
    });
    
    const addButton = document.createElement('button');
    addButton.textContent = 'Submit';
    addButton.addEventListener('click', (e) => {
         document.querySelectorAll('.db-folder-list-modal input[type="checkbox"]:checked').forEach((checkbox) => {
            const folderName = checkbox.getAttribute('data-folder-name');
            // Add prompt to selected folder
            callback(folderName);
            // Close modal
            overlay.remove();
        });
    });
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'db-folder-list-modal-buttons';
    buttonsContainer.appendChild(closeButton);
    buttonsContainer.appendChild(addButton);
    modal.appendChild(buttonsContainer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
}

function observeSidebarPrompts() {
    const sidebar = document.getElementById('history');
    const observer = new MutationObserver(() => {
        const promptItems = sidebar.querySelectorAll('a');

        promptItems.forEach((item) => {
            if (item.querySelector('.db-folder-icon')) return;

            const folderBtn = document.createElement('button');
            folderBtn.innerHTML = '➕';
            folderBtn.className = 'db-folder-icon';

            folderBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                chrome.storage.local.get(['folders'], (data) => {
                    let folders = getFoldersOrDefault(data?.folders);
                    if (folders?.folders?.length === 0) {
                        alert('You need to create a folder first!')
                        return;
                    }
                    const prompt = {
                        name: item.textContent.replace('➕', '').trim(),
                        link: item.getAttribute('href'),
                    };
                    addPromptToFolderAndSync(folders, prompt);
                });
            });

            const promptText = item.innerText;
            chrome.storage.local.get(['folders'], (data) => {
                const group = data.folders.folders.find(group =>
                    group.prompts.some(prompt => prompt.name === promptText)
                );
                if (group) {
                    item.style.backgroundColor = `rgb(from ${group.color} r g b / 0.3)`
                }
            });
            item.appendChild(folderBtn);
        });
    });

    observer.observe(sidebar, { childList: true, subtree: true });
}

function observeMainThread() {
    
    const thread = document.querySelector('#main');

    const observer = new MutationObserver(() => {
        renderFolders();
        injectAddToFolderButton();
    });

    observer.observe(thread, { childList: true, subtree: true });
}

function renderFolders() {

    chrome.storage.local.get(['folders'], (result) => {
        let folders = getFoldersOrDefault(result?.folders);

        document.getElementById('db-prompt-folder-btn')?.remove();
        const button = document.createElement('button');
        button.id = 'db-prompt-folder-btn';
        button.textContent = 'New Folder ➕';
        button.addEventListener('click', () => {
            // Show prompt to enter folder name
            showFolderModal();
        });

        document.getElementById('db-folder-wrapper')?.remove();
        const foldersWrapper = document.createElement('div');
        foldersWrapper.innerHTML = '';

        foldersWrapper.id = 'db-folder-wrapper';
        foldersWrapper.className = `db-folder-wrapper ${ folders.hidden ? '' : 'visible'}`;
        
        const toggleFolderWrapper = document.createElement('div');
        toggleFolderWrapper.id = 'db-toggle-folder-wrapper'
        toggleFolderWrapper.className = 'db-toggle-folder-wrapper pointer'
        toggleFolderWrapper.addEventListener('click', () => {
            foldersWrapper.classList.toggle('visible');
            chrome.storage.local.get(['folders'], (result) => {
                let folders = getFoldersOrDefault(result?.folders);
                folders.hidden = ! foldersWrapper.classList.contains('visible');
                syncFolders(folders);
            });
        });

        foldersWrapper.append(toggleFolderWrapper);
        
        const isValidFoldersArray = Array.isArray(folders?.folders) && folders.folders.length > 0;

        const toggleFolderWrapperContainer = document.createElement('div');
        toggleFolderWrapperContainer.id = 'db-folder-wrapper-container'
        toggleFolderWrapperContainer.className = 'db-folder-wrapper-container'
        toggleFolderWrapperContainer.append(button)
        if (! isValidFoldersArray) {
            const noFoldersMessage = document.createElement('div');
            noFoldersMessage.className = 'no-folders-message';
            noFoldersMessage.textContent = "📂 No folders yet. Create one to get started!";
            toggleFolderWrapperContainer.appendChild(noFoldersMessage);
        } else {
            // 🆕 Show folders with prompts below
            const container = foldersWithPromptsContainer = document.createElement('div');
            foldersWithPromptsContainer.id = 'db-folders';
            const folderContainerParent = document.createElement('div');
            folderContainerParent.id = 'db-folders-container'
            folderContainerParent.append(foldersWithPromptsContainer);
            toggleFolderWrapperContainer.append(folderContainerParent);
            folders.folders.forEach(folder => {
                const folderDiv = document.createElement('div');
                folderDiv.className = 'db-folder-item-container';
                
                // Folder header with toggle
                const folderItem = document.createElement('div');
                folderItem.className = 'db-folder-list-item';
                folderItem.style.backgroundColor = `rgb(from ${folder.color || '#262626'} r g b / 0.5)`;

                const title = document.createElement('span');
                title.className = "pointer w-100"
                title.textContent = folder.folderName;
                const editFolderNameBtn = document.createElement('span');
                editFolderNameBtn.className = "pointer"
                editFolderNameBtn.textContent = '✏️';
                editFolderNameBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const folderName = e.target.parentNode.parentNode.querySelector('span')?.textContent.trim();
                    if (! folderName) {
                        return;
                    }
                    chrome.storage.local.get(['folders'], (result) => {
                        let folders = getFoldersOrDefault(result?.folders);
                        const folder = folders.folders.find(f => f.folderName === folderName);
                        showFolderModal(folder.folderName, folder.color, folderName);
                    });
                });
                const trashIcon = document.createElement('span');
                trashIcon.className = "pointer"
                trashIcon.textContent = '🗑️';
                trashIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (! confirm(`Are you sure you want to delete the folder "${folder.folderName}"? This action cannot be undone.`)) {
                        return;
                    }
                    
                    chrome.storage.local.get(['folders'], (result) => {
                        let folders = getFoldersOrDefault(result?.folders);
                        folders.folders = folders.folders.filter(f => f.folderName !== folder.folderName);
                        syncFolders(folders);
                    });
                });
                
                const folderActions = document.createElement('div');
                folderActions.className = 'db-folder-actions';
                folderActions.appendChild(editFolderNameBtn);
                folderActions.appendChild(trashIcon);

                folderItem.appendChild(title);
                folderItem.appendChild(folderActions);

                // Prompts container
                const promptList = document.createElement('div');
                promptList.className = `db-prompt-item ${folder.hidden ? 'hidden' : 'visible'}`;

                folder.prompts.forEach(prompt => {
                    const link = document.createElement('a');
                    link.href = prompt.link;
                    link.textContent = prompt.name;
                    link.className = 'db-prompt-item-link';
                    const trashIcon = document.createElement('span');
                    trashIcon.className = 'pointer';
                    trashIcon.textContent = '🗑️';
                    trashIcon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        
                        if (! confirm(`Are you sure you want to delete the prompt "${prompt.name}"? This action cannot be undone.`)) {
                            return;
                        }
                        // Remove prompt from folder
                        chrome.storage.local.get(['folders'], (result) => {
                            let folders = getFoldersOrDefault(result?.folders);
                            folders.folders.map((f) => {
                                if (f.folderName === folder.folderName) {
                                    f.prompts = f.prompts.filter(p => p.link !== prompt.link);
                                    syncFolders(folders);
                                }
                            });
                            
                        });   
                    });
                    
                    const promptWrapper = document.createElement('div');
                    promptWrapper.className = 'db-prompt-item-wrapper';

                    if (window.location.href === `https://chatgpt.com${prompt.link}`) {
                        promptWrapper.classList.add('active');
                    } else {
                        promptWrapper.classList.remove('active');
                    }
                    
                    promptWrapper.appendChild(link);
                    promptWrapper.appendChild(trashIcon);
                    
                    
                    promptList.appendChild(promptWrapper);
                });

                title.addEventListener('click', () => {
                    folder.hidden = ! folder.hidden;
                    promptList.classList.toggle('hidden', folder.hidden);
                    syncFolders(folders);
                });

                folderDiv.appendChild(folderItem);
                folderDiv.appendChild(promptList);
                container.appendChild(folderDiv);
            });
        }

        foldersWrapper.append(toggleFolderWrapperContainer);
        
        // sidebar.parentNode.insertBefore(foldersWrapper, sidebar);
        document.body.appendChild(foldersWrapper);

        
    });
}


function addFolderIfNotExists(folderName, color, oldValue = null) {
    chrome.storage.local.get(['folders'], (result) => {
        let folders = getFoldersOrDefault(result?.folders);
        if (oldValue) {
            folders.folders = folders.folders.map(f => {
                if (f.folderName === oldValue) {
                    f.folderName = folderName;
                    f.color = color;
                }
                return f;
            });
            syncFolders(folders);
            return;
        }

        if (! folders.folders.find(f => f.folderName === folderName)) {
            folders.folders.push({ folderName, color, hidden: true, prompts: [] });
            syncFolders(folders);
        }
    });
}

function addPromptToFolder(folderName, prompt, folders) {
    const folder = folders.folders.find(f => f.folderName === folderName);
    const exists = folder.prompts.some(p => p.link === prompt.link);
    if (! exists) {
        folder.prompts.push({ name: prompt.name, link: prompt.link });
    }
    return folders;
}

function showFolderModal(folderName = '', color = '#262626') {
    // Create modal elements
    const overlay = document.createElement('div');
    overlay.id = 'db-prompt-modal-overlay';

    const modal = document.createElement('div');
    modal.id = 'db-prompt-modal';
    
    const createFolderBtn = document.createElement('button');
    createFolderBtn.textContent = 'Submit';
    createFolderBtn.className = 'folder-form-submit-btn';
    createFolderBtn.addEventListener('click', () => {
        const oldValue = document.getElementById('prompt-folder-input').getAttribute('data-old-value');
        const name = document.getElementById('prompt-folder-input').value.trim();
        const color = document.getElementById('prompt-folder-color').value.trim();
        if (name === null || name === undefined || name === '') {
            alert('Please enter a folder name.');
            return;
        }
        addFolderIfNotExists(name, color, oldValue)
        document.body.removeChild(overlay);
    });
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.className = 'folder-form-close-btn';
    closeButton.addEventListener('click', () => {
        overlay.remove();
    });
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'db-folder-list-modal-buttons';
    buttonsContainer.appendChild(closeButton);
    buttonsContainer.appendChild(createFolderBtn);

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Folder name';
    input.id = 'prompt-folder-input';
    input.value = folderName;
    input.setAttribute('data-old-value', folderName);
    input.autofocus = true;
    
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.id = 'prompt-folder-color';
    colorInput.value = color;
    modal.appendChild(input);
    modal.appendChild(colorInput);
    modal.appendChild(buttonsContainer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    input.focus();

    

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
}


function waitForSidebarAndInjectButton() {
    const checkInterval = setInterval(() => {
        const sidebar = document.getElementById('history');

        if (!sidebar || document.getElementById('db-prompt-folder-btn')) {
            return;
        }
        

        clearInterval(checkInterval);
        
        injectStyles();

        injectAddToFolderButton();

        // Render them
        renderFolders();
        
        // ✅ Watch for prompt items being added to the sidebar
        observeSidebarPrompts();
        
        observeMainThread();

    }, 500);
}

function injectAddToFolderButton() {
    
    const checkInterval = setInterval(() => {

        let url = window.location.href;
        const pattern = /^https:\/\/chatgpt\.com\/c\/[a-zA-Z0-9-]+$/;

        if (! pattern.test(url)) {
            document.getElementById('db-add-to-folder-btn')?.remove();
            return;
        }

        if (document.getElementById('db-add-to-folder-btn')) {
            return;
        }

        clearInterval(checkInterval);

        const button = document.createElement('button');
        button.id = 'db-add-to-folder-btn';
        button.textContent = '➕'
        button.title = 'Add to Folder';
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            url = window.location.href;
            if (! pattern.test(url)) {
                alert("Can't add an empty prompt to folders!");
                return;
            }
            chrome.storage.local.get(['folders'], (data) => {
                let folders = getFoldersOrDefault(data?.folders);
                if (folders?.folders?.length === 0) {
                    alert('You need to create a folder first!');
                    return;
                }
                const prompt = {
                    name: document.title.trim(),
                    link: url.replace('https://chatgpt.com', ''),
                };
                addPromptToFolderAndSync(folders, prompt);
            });
        });

        document.body.append(button);
    });
    
}

// Run on initial load
waitForSidebarAndInjectButton();
