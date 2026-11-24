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
    const normalized = (Array.isArray(foldersWrapper?.folders)
        ? foldersWrapper
        : { hidden: true, folders: [] });

    normalized.hidden = Boolean(normalized.hidden);
    normalized.folders = (Array.isArray(normalized.folders) ? normalized.folders : [])
        .map((folder, index) => ({
            folderName: folder?.folderName || `Folder ${index + 1}`,
            color: folder?.color || '#262626',
            hidden: Boolean(folder?.hidden),
            prompts: Array.isArray(folder?.prompts) ? folder.prompts : [],
            order: Number.isFinite(Number(folder?.order)) ? Number(folder.order) : index,
        }))
        .sort((a, b) => Number(a.order) - Number(b.order))
        .map((folder, index) => ({ ...folder, order: index }));

    return normalized;
}

function getConversationId(link) {
    return typeof link === 'string' ? link.match(/\/c\/([^/?#]+)/)?.[1] || null : null;
}

function areSameConversationLinks(firstLink, secondLink) {
    const firstId = getConversationId(firstLink);
    const secondId = getConversationId(secondLink);
    return firstId && secondId ? firstId === secondId : firstLink === secondLink;
}

function createPlusIcon() {
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('aria-hidden', 'true');
    icon.classList.add('db-plus-icon');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 5v14M5 12h14');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    icon.appendChild(path);

    return icon;
}

function moveFolderToOrder(folders, folderName, newOrderIndex) {
    const list = [...folders.folders];
    const sourceIndex = list.findIndex(folder => folder.folderName === folderName);

    if (sourceIndex === -1) {
        return folders;
    }

    const [folder] = list.splice(sourceIndex, 1);
    const targetIndex = Math.max(0, Math.min(list.length, Number(newOrderIndex) || 0));
    list.splice(targetIndex, 0, folder);

    folders.folders = list.map((item, index) => ({
        ...item,
        order: index,
    }));

    return folders;
}

function syncFolders(folders) {
    const normalizedFolders = getFoldersOrDefault(folders);
    chrome.storage.local.set({ folders: normalizedFolders }, () => {
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
    const processSidebarPrompts = () => {
        const promptItems = document.querySelectorAll('[data-sidebar-cycle-item]');

        promptItems.forEach((item) => {
            if (item.querySelector('.db-folder-icon')) return;

            const conversationElement = item.querySelector('[data-sidebar-archive-chatgpt-id]')
                || item.closest('[data-sidebar-chatgpt-conversation-key]')
                || item;
            const conversationLink = item.querySelector('a[href*="/c/"]');
            const chatActionsButton = item.querySelector('button[aria-label="Chat actions"]');
            const actionSlot = chatActionsButton?.closest('[class*="actionSlot"]');
            if (!conversationLink || !actionSlot) return;

            const name = conversationElement?.getAttribute('aria-label')
                || item.getAttribute('aria-label')
                || item.querySelector('[data-thread-title-trigger]')?.textContent.trim()
                || conversationLink.textContent.trim();

            if (!name) return;

            const link = conversationLink.getAttribute('href');
            if (!link) return;

            const folderBtn = document.createElement('button');
            folderBtn.type = 'button';
            folderBtn.className = 'db-folder-icon';
            folderBtn.title = 'Add to Folder';
            folderBtn.setAttribute('aria-label', 'Add prompt to folder');
            folderBtn.appendChild(createPlusIcon());

            folderBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                chrome.storage.local.get(['folders'], (data) => {
                    const folders = getFoldersOrDefault(data?.folders);
                    if (folders.folders.length === 0) {
                        alert('You need to create a folder first!');
                        return;
                    }
                    addPromptToFolderAndSync(folders, { name, link });
                });
            });

            actionSlot.appendChild(folderBtn);

            chrome.storage.local.get(['folders'], (data) => {
                const folders = getFoldersOrDefault(data?.folders);
                const group = folders.folders.find(folder =>
                    folder.prompts.some(prompt =>
                        areSameConversationLinks(prompt.link, link) || prompt.name === name
                    )
                );
                if (group) {
                    item.style.backgroundColor = `rgb(from ${group.color} r g b / 0.3)`;
                } else {
                    item.style.backgroundColor = '';
                }
            });
        });
    };

    processSidebarPrompts();
    const observer = new MutationObserver(processSidebarPrompts);
    observer.observe(document.body, { childList: true, subtree: true });
}

function observeMainThread() {
    let observedThread = null;
    let threadObserver = null;

    const observeAvailableThread = () => {
        const thread = document.querySelector('#main');
        if (thread === observedThread) return;

        threadObserver?.disconnect();
        observedThread = thread;
        if (!thread) return;

        threadObserver = new MutationObserver(() => {
            renderFolders();
            injectAddToFolderButton();
        });
        threadObserver.observe(thread, { childList: true, subtree: true });
        renderFolders();
        injectAddToFolderButton();
    };

    const pageObserver = new MutationObserver(observeAvailableThread);
    pageObserver.observe(document.documentElement, { childList: true, subtree: true });
    observeAvailableThread();
}

function renderFolders() {

    chrome.storage.local.get(['folders'], (result) => {
        let folders = getFoldersOrDefault(result?.folders);

        document.getElementById('db-prompt-folder-btn')?.remove();
        const button = document.createElement('button');
        button.id = 'db-prompt-folder-btn';
        button.textContent = 'New Folder';
        button.prepend(createPlusIcon());
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
                title.className = 'pointer db-folder-title';
                title.setAttribute('data-folderName', folder.folderName)
                const folderName = document.createElement('span');
                folderName.className = 'db-folder-name';
                folderName.textContent = `${folder.order + 1}- ${folder.folderName}`;
                const promptCount = document.createElement('span');
                promptCount.className = 'db-folder-prompt-count';
                promptCount.textContent = String(folder.prompts.length);
                promptCount.setAttribute(
                    'aria-label',
                    `${folder.prompts.length} ${folder.prompts.length === 1 ? 'prompt' : 'prompts'}`
                );
                promptCount.title = `${folder.prompts.length} ${folder.prompts.length === 1 ? 'prompt' : 'prompts'}`;
                title.append(folderName, promptCount);
                const editFolderNameBtn = document.createElement('span');
                editFolderNameBtn.className = "pointer"
                editFolderNameBtn.textContent = '✏️';
                editFolderNameBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const folderName = e.target.parentNode.parentNode.querySelector('span')?.getAttribute('data-folderName').trim();
                    if (! folderName) {
                        return;
                    }
                    chrome.storage.local.get(['folders'], (result) => {
                        let folders = getFoldersOrDefault(result?.folders);
                        const folder = folders.folders.find(f => f.folderName === folderName);
                        if (! folder) {
                            return;
                        }
                        showFolderModal(folder.folderName, folder.color, folderName, folder.order);
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

                    if (areSameConversationLinks(window.location.href, prompt.link)) {
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


function addFolderIfNotExists(folderName, color, oldValue = null, order = null) {
    chrome.storage.local.get(['folders'], (result) => {
        let folders = getFoldersOrDefault(result?.folders);
        const trimmedName = folderName.trim();
        const maxFolderCount = folders.folders.length + (oldValue ? 0 : 1);
        const normalizedOrder = Number.isFinite(Number(order)) ? Number(order) : (oldValue ? 0 : folders.folders.length);

        if (! trimmedName) {
            alert('Please enter a folder name.');
            return;
        }

        if (normalizedOrder < 0 || normalizedOrder >= maxFolderCount) {
            alert(`Please choose an order between 1 and ${maxFolderCount}.`);
            return;
        }

        if (oldValue) {
            const duplicateFolder = folders.folders.find(f => f.folderName === trimmedName && f.folderName !== oldValue);
            if (duplicateFolder) {
                alert('A folder with that name already exists.');
                return;
            }

            const originalFolder = folders.folders.find(f => f.folderName === oldValue);
            if (! originalFolder) {
                return;
            }

            originalFolder.folderName = trimmedName;
            originalFolder.color = color || originalFolder.color || '#262626';
            moveFolderToOrder(folders, trimmedName, normalizedOrder);
            syncFolders(folders);
            return;
        }

        if (folders.folders.find(f => f.folderName === trimmedName)) {
            alert('A folder with that name already exists.');
            return;
        }

        const nextOrderIndex = normalizedOrder;
        const folderList = [...folders.folders];
        const newFolder = { folderName: trimmedName, color: color || '#262626', hidden: true, prompts: [], order: nextOrderIndex };
        folderList.splice(Math.max(0, Math.min(folderList.length, nextOrderIndex)), 0, newFolder);
        folders.folders = folderList.map((folder, index) => ({ ...folder, order: index }));
        syncFolders(folders);
    });
}

function addPromptToFolder(folderName, prompt, folders) {
    const folder = folders.folders.find(f => f.folderName === folderName);
    const exists = folder.prompts.some(p => areSameConversationLinks(p.link, prompt.link));
    if (! exists) {
        folder.prompts.push({ name: prompt.name, link: prompt.link });
    }
    return folders;
}

function showFolderModal(folderName = '', color = '#262626', oldValue = '', order = null) {
    chrome.storage.local.get(['folders'], (result) => {
        const folders = getFoldersOrDefault(result?.folders);
        const validFolderCount = Math.max(1, oldValue ? folders.folders.length : folders.folders.length + 1);
        const defaultOrder = order == null || !Number.isFinite(Number(order))
            ? validFolderCount
            : Number(order) + 1;

        const overlay = document.createElement('div');
        overlay.id = 'db-prompt-modal-overlay';

        const modal = document.createElement('div');
        modal.id = 'db-prompt-modal';

        const title = document.createElement('h2');
        title.className = 'db-prompt-modal-title';
        title.textContent = oldValue ? 'Edit folder' : 'Create a folder';

        const description = document.createElement('p');
        description.className = 'db-prompt-modal-description';
        description.textContent = 'Choose a name, color, and position for your folder.';
        modal.append(title, description);
        
        const createFolderBtn = document.createElement('button');
        createFolderBtn.textContent = oldValue ? 'Save changes' : 'Create folder';
        createFolderBtn.className = 'folder-form-submit-btn';
        createFolderBtn.addEventListener('click', () => {
            const currentOldValue = document.getElementById('prompt-folder-input').getAttribute('data-old-value');
            const name = document.getElementById('prompt-folder-input').value.trim();
            const colorValue = document.getElementById('prompt-folder-color').value.trim();
            const orderValue = Number(document.getElementById('prompt-folder-order').value);

            if (! name) {
                alert('Please enter a folder name.');
                return;
            }

            if (! Number.isInteger(orderValue) || orderValue < 1 || orderValue > validFolderCount) {
                alert(`Please choose an order between 1 and ${validFolderCount}.`);
                return;
            }

            addFolderIfNotExists(name, colorValue, currentOldValue || null, orderValue - 1);
            document.body.removeChild(overlay);
        });
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.className = 'folder-form-close-btn';
        closeButton.addEventListener('click', () => {
            overlay.remove();
        });
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'db-prompt-modal-buttons';
        buttonsContainer.appendChild(closeButton);
        buttonsContainer.appendChild(createFolderBtn);

        const nameField = document.createElement('div');
        nameField.className = 'db-prompt-modal-field';
        const nameLabel = document.createElement('label');
        nameLabel.htmlFor = 'prompt-folder-input';
        nameLabel.textContent = 'Folder name';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'db-prompt-modal-input';
        input.placeholder = 'e.g. Writing prompts';
        input.id = 'prompt-folder-input';
        input.value = folderName;
        input.setAttribute('data-old-value', oldValue || folderName);
        input.autofocus = true;
        nameField.append(nameLabel, input);

        const orderField = document.createElement('div');
        orderField.className = 'db-prompt-modal-field';
        const orderLabel = document.createElement('label');
        orderLabel.htmlFor = 'prompt-folder-order';
        orderLabel.textContent = 'Position';

        const orderInput = document.createElement('input');
        orderInput.type = 'number';
        orderInput.className = 'db-prompt-modal-input';
        orderInput.id = 'prompt-folder-order';
        orderInput.min = '1';
        orderInput.max = String(validFolderCount);
        orderInput.value = String(defaultOrder);
        orderInput.placeholder = 'Order';
        orderInput.addEventListener('input', () => {
            const rawValue = Number(orderInput.value);
            if (! Number.isFinite(rawValue)) {
                orderInput.value = '1';
                return;
            }
            const clampedValue = Math.min(Math.max(rawValue, 1), validFolderCount);
            orderInput.value = String(clampedValue);
        });
        orderField.append(orderLabel, orderInput);

        const colorField = document.createElement('div');
        colorField.className = 'db-prompt-modal-field db-prompt-modal-color-field';
        const colorLabel = document.createElement('label');
        colorLabel.htmlFor = 'prompt-folder-color';
        colorLabel.textContent = 'Folder color';

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.id = 'prompt-folder-color';
        colorInput.value = color;
        colorField.append(colorLabel, colorInput);

        modal.append(nameField, orderField, colorField, buttonsContainer);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        input.focus();

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
    });
}


function waitForSidebarAndInjectButton() {
    const checkInterval = setInterval(() => {
        const sidebar = document.getElementById('history')
            || document.querySelector('[role="list"][tabindex="-1"]')
            || document.querySelector('[data-sidebar-chatgpt-conversation-key]');

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
        const pattern = /^https:\/\/chatgpt\.com\/(?:g\/[^/]+\/)?c\/[a-zA-Z0-9-]+\/?$/;

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
        button.title = 'Add to Folder';
        button.setAttribute('aria-label', 'Add current chat to folder');
        button.appendChild(createPlusIcon());
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
