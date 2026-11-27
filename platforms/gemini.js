(() => {
    class GeminiPlatform {
        constructor() {
            this.id = 'gemini';
            this.hostnames = ['gemini.google.com'];
            this.baseUrl = 'https://gemini.google.com';
        }

        supportsHost(hostname) {
            return this.hostnames.includes(hostname);
        }

        getChatId(link) {
            try {
                const url = new URL(link, this.baseUrl);
                if (!this.supportsHost(url.hostname)) return null;
                return url.pathname.match(/^\/app\/([^/]+)\/?$/)?.[1] || null;
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
            icon.setAttribute('aria-label', 'Gemini chat');
            icon.classList.add('db-platform-icon', 'db-platform-icon-gemini');

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M12 2.5c1.4 5.2 3.3 7.1 8.5 8.5-5.2 1.4-7.1 3.3-8.5 8.5-1.4-5.2-3.3-7.1-8.5-8.5 5.2-1.4 7.1-3.3 8.5-8.5Z');
            path.setAttribute('fill', 'currentColor');
            icon.appendChild(path);
            return icon;
        }

        getChatEntries() {
            return [...document.querySelectorAll('gem-nav-list-item[data-test-id="conversation"]')]
                .map((item) => {
                    if (item.closest('#db-folder-wrapper, .db-prompt-item-wrapper')) return null;

                    const linkElement = item.querySelector('a[href^="/app/"]');
                    const menuButton = item.querySelector('[data-test-id="actions-menu-button"]');
                    const actionSlot = menuButton?.parentElement;
                    if (!linkElement || !actionSlot || !this.getChatId(linkElement.getAttribute('href'))) {
                        return null;
                    }

                    actionSlot.classList.add('db-gemini-action-slot');
                    return {
                        item: linkElement,
                        link: this.normalizeLink(linkElement.getAttribute('href')),
                        name: linkElement.getAttribute('aria-label')
                            || linkElement.querySelector('.title-text')?.textContent.trim()
                            || linkElement.textContent.trim(),
                        actionSlot,
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
    globalThis.PromptOrganizerPlatforms.gemini = new GeminiPlatform();
})();
