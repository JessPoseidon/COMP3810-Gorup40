class SentenceApp {
    constructor() {
        this.nameInput = document.getElementById('nameInput');
        this.categorySelect = document.getElementById('categorySelect');
        this.sentenceInput = document.getElementById('sentenceInput');
        this.addSentenceBtn = document.getElementById('addSentenceBtn');
        this.searchInput = document.getElementById('searchInput');
        this.categoryFilter = document.getElementById('categoryFilter');
        this.userFilter = document.getElementById('userFilter');
        this.sortBy = document.getElementById('sortBy');
        this.clearFilters = document.getElementById('clearFilters');
        this.activeFilters = document.getElementById('activeFilters');
        this.sentencesList = document.getElementById('sentencesList');
        this.sentencesCount = document.getElementById('sentencesCount');
        this.allSentences = [];
        this.allUsers = [];
        this.currentFilters = {
            category: 'all',
            user: 'all',
            sortBy: 'newest',
            search: ''
        };

        this.searchTimeout = null;
        this.init();
    }

    init() {
        console.log('🚀 Initializing Sentence App...');
        this.addSentenceBtn.addEventListener('click', () => this.addSentence());
        this.sentenceInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addSentence();
        });
        this.categoryFilter.addEventListener('change', () => this.handleFilterChange('category', this.categoryFilter.value));
        this.userFilter.addEventListener('change', () => this.handleFilterChange('user', this.userFilter.value));
        this.sortBy.addEventListener('change', () => this.handleFilterChange('sortBy', this.sortBy.value));
        this.clearFilters.addEventListener('click', () => this.clearAllFilters());
        this.searchInput.addEventListener('input', () => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.handleFilterChange('search', this.searchInput.value);
            }, 300);
        });
        this.sentencesList.addEventListener('click', (e) => {
            const target = e.target;
            const id = target.dataset.id;
            if (!id) return; 
            if (target.classList.contains('delete-btn')) {
                this.deleteSentence(id);
            } else if (target.classList.contains('update-btn')) {
                this.editMessage(id);
            }
        });
        this.loadInitialData();
    }
    async loadInitialData() {
        await this.loadUsersForFilter();
        await this.fetchAndRenderSentences();
    }
    async loadUsersForFilter() {
        try {
            const response = await fetch('/api/sentences/users');
            if (!response.ok) throw new Error('Failed to load users');
            this.allUsers = await response.json();
            this.userFilter.innerHTML = '<option value="all">All Users</option>'; 
            this.allUsers.forEach(username => {
                const option = document.createElement('option');
                option.value = username;
                option.textContent = username;
                this.userFilter.appendChild(option);
            });
            this.userFilter.value = this.currentFilters.user;
        } catch (error) {
            console.error('❌ Error loading users:', error);
        }
    }

    handleFilterChange(key, value) {
        this.currentFilters[key] = value;
        this.fetchAndRenderSentences();
    }

    clearAllFilters() {
        this.currentFilters = {
            category: 'all',
            user: 'all',
            sortBy: 'newest',
            search: ''
        };
        this.categoryFilter.value = 'all';
        this.userFilter.value = 'all';
        this.sortBy.value = 'newest';
        this.searchInput.value = '';
        this.fetchAndRenderSentences();
    }

    async fetchAndRenderSentences() {
        const params = new URLSearchParams(this.currentFilters);
        const url = `/api/sentences?${params.toString()}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch messages');
            this.allSentences = await response.json();
            this.renderSentences();
            this.renderActiveFiltersText();
        } catch (error) {
            console.error('❌ Error fetching messages:', error);
            this.sentencesList.innerHTML = `<li class="empty-state" style="color: #ff4757;">Error loading messages. Please check server connection.</li>`;
        }
    }
    async addSentence() {
        const text = this.sentenceInput.value.trim();
        const category = this.categorySelect.value;
        if (!text) {
            alert('Your message cannot be empty.');
            return;
        }
        this.addSentenceBtn.textContent = 'Adding...';
        this.addSentenceBtn.disabled = true;
        try {
            const response = await fetch('/api/sentences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text, category }) 
            });
            if (response.ok) {
                this.sentenceInput.value = '';
                this.categorySelect.value = 'thoughts';
                await this.loadInitialData(); 
            } else if (response.status === 401) {
                alert('You must be logged in to post a message. Redirecting to login.');
                window.location.href = '/auth/login';
            } else {
                const errorData = await response.json();
                // CRITICAL FIX: The throw statement needs to be the last thing in the successful try branch
                // so the outer catch block can handle it.
                throw new Error(errorData.error || 'Failed to add message.');
            }
        } catch (error) {
            console.error('❌ Error adding message:', error);
            alert(`Error creating message: ${error.message}`);
        } finally {
            this.addSentenceBtn.textContent = 'Add';
            this.addSentenceBtn.disabled = false;
        }
    }
    async editMessage(id) {
        const originalSentence = this.allSentences.find(s => s._id === id);
        if (!originalSentence) return;
        
        const listItem = document.querySelector(`.sentence-item [data-id='${id}']`).closest('.sentence-item');
        if (!listItem) return;
        
        const text = originalSentence.text;
        const category = originalSentence.category;
        
        listItem.innerHTML = `
            <form class="edit-form" data-id="${id}">
                <input type="text" class="edit-text" value="${this.escapeHtml(text.trim())}" style="width:60%;" maxlength="500">
                <select class="edit-category">
                    <option value="thoughts" ${category === 'thoughts' ? 'selected' : ''}>💭 Thoughts</option>
                    <option value="quotes" ${category === 'quotes' ? 'selected' : ''}>💬 Quotes</option>
                    <option value="stories" ${category === 'stories' ? 'selected' : ''}>📖 Stories</option>
                    <option value="jokes" ${category === 'jokes' ? 'selected' : ''}>😂 Jokes</option>
                    <option value="questions" ${category === 'questions' ? 'selected' : ''}>❓ Questions</option>
                    <option value="facts" ${category === 'facts' ? 'selected' : ''}>🔍 Facts</option>
                    <option value="other" ${category === 'other' ? 'selected' : ''}>📌 Other</option>
                </select>
                <button type="submit" class="save-edit">Save</button>
                <button type="button" class="cancel-edit">Cancel</button>
            </form>
        `;
        listItem.querySelector('.edit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const newText = listItem.querySelector('.edit-text').value.trim();
            const newCategory = listItem.querySelector('.edit-category').value;
            if (!newText) {
                alert('Message cannot be empty.');
                return;
            }
            fetch(`/api/sentences/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ text: newText, category: newCategory })
            })
            .then(res => res.json().then(data => ({status: res.status, data})))
            .then(({status, data}) => {
                if (status === 200) {
                    this.fetchAndRenderSentences();
                } else if (status === 403 || status === 401) {
                    alert(data.error || 'Not authorized to update this message.');
                    this.fetchAndRenderSentences(); 
                } else if (status === 400) {
                    alert(data.error || 'Message cannot be empty.');
                } else {
                    alert(data.error || 'Failed to update message.');
                }
            })
            .catch(err => {
                alert('Network error: ' + err.message);
                this.fetchAndRenderSentences();
            });
        });
        listItem.querySelector('.cancel-edit').addEventListener('click', () => {
            this.fetchAndRenderSentences();
        });
    }
    async deleteSentence(id) {
        if (!confirm('Are you sure you want to delete this message? This action is permanent.')) {
            return;
        }
        try {
            const response = await fetch(`/api/sentences/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                await this.loadInitialData(); 
            } else if (response.status === 403) {
                alert('You can only delete your own messages. This message belongs to another user.');
            } else if (response.status === 401) {
                alert('You must be logged in to delete a message. Redirecting to login.');
                window.location.href = '/auth/login';
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete message');
            }
        } catch (error) {
            console.error('❌ Error deleting message:', error);
            alert(`Error deleting message: ${error.message}`);
        }
    }
    renderSentences() {
        this.sentencesList.innerHTML = '';
        this.sentencesCount.textContent = `${this.allSentences.length} Messages`; 
        if (this.allSentences.length === 0) {
            this.sentencesList.innerHTML = `<li class="empty-state">No messages found matching your criteria.</li>`;
            return;
        }
        const currentUser = this.nameInput.value;
        this.allSentences.forEach(sentence => {
            const listItem = document.createElement('li');
            listItem.className = `sentence-item ${sentence.category}`; 
            const timeAgo = new Date(sentence.createdAt).toLocaleString();
            listItem.innerHTML = `
                <div class="sentence-header">
                    <span class="author-name">${this.escapeHtml(sentence.name)}</span>
                    <span class="category-badge category-${sentence.category}">${this.getCategoryDisplayName(sentence.category)}</span>
                </div>
                <p class="sentence-text">${this.escapeHtml(sentence.text)}</p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="timestamp">Posted on: ${timeAgo}</span>
                    <div>
                        ${sentence.name === currentUser 
                            ? `<button class="update-btn" data-id="${sentence._id}">Update</button>` 
                            : ''}
                        ${sentence.name === currentUser 
                            ? `<button class="delete-btn" data-id="${sentence._id}">Delete</button>` 
                            : ''}
                    </div>
                </div>
            `;
            this.sentencesList.appendChild(listItem);
        });
    }
    renderActiveFiltersText() {
        this.activeFilters.innerHTML = '';
        const parts = [];
        if (this.currentFilters.category !== 'all') {
            parts.push(`Category: **${this.getCategoryDisplayName(this.currentFilters.category)}**`);
        }
        if (this.currentFilters.user !== 'all') {
            parts.push(`User: **${this.currentFilters.user}**`);
        }
        if (this.currentFilters.search && this.currentFilters.search.trim() !== '') {
            parts.push(`Search: **"${this.currentFilters.search}"**`);
        }
        parts.push(`Sorted by: **${this.currentFilters.sortBy.charAt(0).toUpperCase() + this.currentFilters.sortBy.slice(1)}**`);
        if (parts.length > 0) {
            this.activeFilters.innerHTML = `
                <div style="font-size: 14px; color: #555;">
                    Current View: ${parts.join(' | ')}
                </div>`;
        }
    }
    getCategoryDisplayName(category) {
        const categoryMap = {
            'thoughts': '💭 Thoughts',
            'quotes': '💬 Quotes',
            'stories': '📖 Stories',
            'jokes': '😂 Jokes',
            'questions': '❓ Questions',
            'facts': '🔍 Facts',
            'other': '📌 Other'
        };
        return categoryMap[category] || category;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('sentencesList')) {
        window.app = new SentenceApp();
    }
});
