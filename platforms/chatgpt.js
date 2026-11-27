(() => {
    class ChatGPTPlatform {
        constructor() {
            this.id = 'chatgpt';
            this.hostnames = ['chatgpt.com'];
            this.baseUrl = 'https://chatgpt.com';
        }

        supportsHost(hostname) {
            return this.hostnames.includes(hostname);
        }

        getChatId(link) {
            try {
                const url = new URL(link, this.baseUrl);
                if (!this.supportsHost(url.hostname)) return null;
                return url.pathname.match(/\/(?:g\/[^/]+\/)?c\/([^/]+)/)?.[1] || null;
            } catch {
                return null;
            }
        }

        normalizeLink(link) {
            try {
                const url = new URL(link, this.baseUrl);
                return this.getChatId(url.href) ? url.href : link;
            } catch {
                return link;
            }
        }

        createIcon() {
            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            icon.setAttribute('viewBox', '0 0 24 24');
            icon.setAttribute('role', 'img');
            icon.setAttribute('aria-label', 'ChatGPT chat');
            icon.classList.add('db-platform-icon', 'db-platform-icon-chatgpt');

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M4 5.5h16v12H9l-5 4v-16Z');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', 'currentColor');
            path.setAttribute('stroke-width', '1.8');
            path.setAttribute('stroke-linejoin', 'round');
            icon.appendChild(path);
            return icon;
        }

        getChatEntries() {
            return [...document.querySelectorAll('[data-sidebar-cycle-item]')]
                .map((item) => {
                    if (item.closest('#db-folder-wrapper')) return null;
                    const conversationElement = item.querySelector('[data-sidebar-archive-chatgpt-id]')
                        || item.closest('[data-sidebar-chatgpt-conversation-key]')
                        || item;
                    const linkElement = item.querySelector('a[href*="/c/"]');
                    const chatActionsButton = item.querySelector('button[aria-label="Chat actions"]');
                    const actionSlot = chatActionsButton?.closest('[class*="actionSlot"]');
                    if (!linkElement || !actionSlot) return null;

                    return {
                        item,
                        link: this.normalizeLink(linkElement.getAttribute('href')),
                        name: conversationElement?.getAttribute('aria-label')
                            || item.getAttribute('aria-label')
                            || item.querySelector('[data-thread-title-trigger]')?.textContent.trim()
                            || linkElement.textContent.trim(),
                        actionSlot,
                    };
                })
                .filter(Boolean);
        }

        getCurrentChat() {
            const link = this.getChatId(window.location.href);
            return link
                ? { name: document.title.trim(), link: this.normalizeLink(window.location.href) }
                : null;
        }

        getMainContentElement() {
            return document.querySelector('#main');
        }
    }

    globalThis.PromptOrganizerPlatforms = globalThis.PromptOrganizerPlatforms || {};
    globalThis.PromptOrganizerPlatforms.chatgpt = new ChatGPTPlatform();
})();
