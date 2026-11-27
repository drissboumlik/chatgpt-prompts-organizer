(() => {
    class ClaudePlatform {
        constructor() {
            this.id = 'claude';
            this.hostnames = ['claude.ai'];
            this.baseUrl = 'https://claude.ai';
        }

        supportsHost(hostname) {
            return this.hostnames.includes(hostname);
        }

        getChatId(link) {
            try {
                const url = new URL(link, this.baseUrl);
                if (!this.supportsHost(url.hostname)) return null;
                return url.pathname.match(/^\/chat\/([^/]+)/)?.[1] || null;
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
            icon.setAttribute('aria-label', 'Claude chat');
            icon.classList.add('db-platform-icon', 'db-platform-icon-claude');

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M12 2.5 14 10l7.5 2-7.5 2-2 7.5-2-7.5-7.5-2 7.5-2 2-7.5Z');
            path.setAttribute('fill', 'currentColor');
            icon.appendChild(path);
            return icon;
        }

        getChatEntries() {
            return [...document.querySelectorAll('a[href*="/chat/"]')]
                .map((linkElement) => {
                    if (linkElement.closest('#db-folder-wrapper, .db-prompt-item-wrapper')) return null;
                    const item = linkElement.closest('[data-row-key^="chat:"], tr[data-clickable]');
                    if (!item) return null;

                    const actionSlot = item.querySelector('[data-row-controls]')
                        || item.querySelector('[data-row-menu-focus-rescue]');
                    if (!actionSlot) return null;

                    return {
                        item,
                        link: this.normalizeLink(linkElement.getAttribute('href')),
                        name: linkElement.getAttribute('aria-label')
                            || item.querySelector('[data-row-label]')?.textContent.trim()
                            || linkElement.textContent.trim(),
                        actionSlot,
                    };
                })
                .filter(Boolean);
        }

        getCurrentChat() {
            return this.getChatId(window.location.href)
                ? { name: document.title.trim(), link: this.normalizeLink(window.location.href) }
                : null;
        }

        getMainContentElement() {
            return document.querySelector('main');
        }
    }

    globalThis.PromptOrganizerPlatforms = globalThis.PromptOrganizerPlatforms || {};
    globalThis.PromptOrganizerPlatforms.claude = new ClaudePlatform();
})();
