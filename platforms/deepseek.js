(() => {
    class DeepSeekPlatform {
        constructor() {
            this.id = 'deepseek';
            this.hostnames = ['chat.deepseek.com'];
            this.baseUrl = 'https://chat.deepseek.com';
        }

        supportsHost(hostname) {
            return this.hostnames.includes(hostname);
        }

        getChatId(link) {
            try {
                const url = new URL(link, this.baseUrl);
                if (!this.supportsHost(url.hostname)) return null;
                return url.pathname.match(/^\/a\/chat\/s\/([^/]+)/)?.[1] || null;
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
            icon.setAttribute('aria-label', 'DeepSeek chat');
            icon.classList.add('db-platform-icon', 'db-platform-icon-deepseek');

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm-3.5 8.5h7M12 8.5v7');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', 'currentColor');
            path.setAttribute('stroke-width', '1.8');
            path.setAttribute('stroke-linecap', 'round');
            icon.appendChild(path);
            return icon;
        }

        getChatEntries() {
            return [...document.querySelectorAll('a[href*="/a/chat/s/"]')]
                .map((linkElement) => {
                    if (linkElement.closest('#db-folder-wrapper, .db-prompt-item-wrapper')) return null;

                    const menuButton = linkElement.querySelector('[role="button"]');
                    const menuContainer = menuButton?.parentElement;
                    if (!menuContainer || !this.getChatId(linkElement.getAttribute('href'))) return null;
                    linkElement.classList.add('db-deepseek-chat-item');

                    const name = [...linkElement.children]
                        .filter(child => child !== menuContainer)
                        .map(child => child.textContent.trim())
                        .find(Boolean);
                    if (!name) return null;

                    return {
                        item: linkElement,
                        link: this.normalizeLink(linkElement.getAttribute('href')),
                        name,
                        actionSlot: linkElement,
                    };
                })
                .filter(Boolean);
        }

        getCurrentChat() {
            const link = this.getChatId(window.location.href);
            if (!link) return null;

            const entry = this.getChatEntries().find(chat => this.getChatId(chat.link) === link);
            return {
                name: entry?.name || document.title.trim(),
                link: this.normalizeLink(window.location.href),
            };
        }

        getMainContentElement() {
            return document.querySelector('main');
        }
    }

    globalThis.PromptOrganizerPlatforms = globalThis.PromptOrganizerPlatforms || {};
    globalThis.PromptOrganizerPlatforms.deepseek = new DeepSeekPlatform();
})();
