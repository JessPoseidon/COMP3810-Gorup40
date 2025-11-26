// public/script.js

class SentenceApp {
    constructor() {
        // UI Elements
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

        // Data & State
        this.allSentences = [];
        this.allUsers = [];
        this.currentFilters = {
            category: 'all',
            user: 'all',
            sortBy: 'newest',
            search: ''
        };

        this.searchTimeout = null;

        // Initialize the application
        this.init();
    }

    init() {
        console.log('🚀 Initializing Sentence App...');

        // 1. Add Event Listeners for CRUD: CREATE
        this.addSentenceBtn.addEventListener('click', () => this.addSentence());
        this.sentenceInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addSentence();
        });

        // 2. Add Event Listeners for CRUD: READ (Filters & Sort)
        this.categoryFilter.addEventListener('change', () => this.handleFilterChange('category', this.categoryFilter.value));
        this.userFilter.addEventListener('change', () => this.handleFilterChange('user', this.userFilter.value));
        this.sortBy.addEventListener('change', () => this.handleFilterChange('sortBy', this.sortBy.value));
        this.clearFilters.addEventListener('click', () => this.clearAllFilters());

        // 3. Add Event Listener for CRUD: READ (Search)
        this.searchInput.addEventListener('input', () => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.handleFilterChange('search', this.searchInput.value);
            }, 300); // Debounce search input
        });

        // ⭐ FIX 1: Event Delegation for dynamically created buttons (DELETE/UPDATE)
        // This replaces the blocks in renderSentences and prevents listener duplication.
        this.sentencesList.addEventListener('click', (e) => {
            const target = e.target;
            const id = target.dataset.id;

            if (!id) return; // Ignore clicks without a data-id

            if (target.classList.contains('delete-btn')) {
                this.deleteSentence(id);
            } else if (target.classList.contains('update-btn')) {
                this.editMessage(id);
            }
        });

        // 4. Initial Data Load
        this.loadInitialData();
    }

    // --- Data Loading and Filtering ---

    async loadInitialData() {
        await this.loadUsersForFilter();
        await this.fetchAndRenderSentences();
    }
    
    async loadUsersForFilter() {
        try {
            const response = await fetch('/api/sentences/users');
            if (!response.ok) throw new Error('Failed to load users');

            this.allUsers = await response.json();
            
            // Clear current options and add the 'All Users' default
            this.userFilter.innerHTML = '<option value="all">All Users</option>'; 
            
            // Add unique usernames
            this.allUsers.forEach(username => {
                const option = document.createElement('option');
                option.value = username;
                option.textContent = username;
                this.userFilter.appendChild(option);
            });

            // Restore the selected user filter if it exists
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
        // Reset UI elements
        this.categoryFilter.value = 'all';
        this.userFilter.value = 'all';
        this.sortBy.value = 'newest';
        this.searchInput.value = '';
        this.fetchAndRenderSentences();
    }

    async fetchAndRenderSentences() {
        // Construct query parameters from current filters
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

    // --- CRUD: CREATE Logic (ADJUSTED) ---

    async addSentence() {
        const text = this.sentenceInput.value.trim();
        // The name input is read-only and contains the logged-in user's name
        const name = this.nameInput.value.trim(); 
        const category = this.categorySelect.value;

        if (!text || !name) {
            alert('Your message cannot be empty.');
            return;
        }
        
        // Disable button to prevent double submission
        this.addSentenceBtn.textContent = 'Adding...';
        this.addSentenceBtn.disabled = true;

        try {
            const response = await fetch('/api/sentences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text, name, category })
            });

            if (response.ok) {
                // Successful creation
                this.sentenceInput.value = ''; // Clear input
                this.categorySelect.value = 'thoughts'; // Reset category
                // Reload data to see the new message (and potentially update the user filter list)
                await this.loadInitialData(); 
            } else if (response.status === 401) {
                // Handle Unauthorized (Not logged in)
                alert('You must be logged in to post a message. Redirecting to login.');
                window.location.href = '/auth/login';
            } else {
                const errorData = await response.json();
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

    // --- CRUD: EDIT and UPDATE Logic ---

    // Call this to activate editing for a given message ID
    async editMessage(id) {
        // Find the LI for the specific message
        const listItem = document.querySelector(`.sentence-item [data-id='${id}']`).closest('.sentence-item');
        if (!listItem) return;

        // Retrieve existing text and category from the message element
        const text = listItem.querySelector('.sentence-text').textContent;
        const categoryElem = listItem.querySelector('.category-badge');
        // Safely extract category from class list, defaulting to 'thoughts'
        const categoryClass = Array.from(categoryElem.classList).find(cls => cls.startsWith('category-'));
        const category = categoryClass ? categoryClass.replace('category-', '') : 'thoughts';

        // Replace content with edit form
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

        // Save changes (PUT update)
        listItem.querySelector('.edit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const newText = listItem.querySelector('.edit-text').value.trim();
            const newCategory = listItem.querySelector('.edit-category').value;
            if (!newText) {
                alert('Message cannot be empty.');
                return;
            }
            // Send PUT request as required by API
            fetch(`/api/sentences/${id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ text: newText, category: newCategory })
            })
            // Use .then(res => res.json().then(data => ({status: res.status, data}))) for proper error body access
            .then(res => res.json().then(data => ({status: res.status, data})))
            .then(({status, data}) => {
                if (status === 200) {
                    // Success: refresh messages
                    this.fetchAndRenderSentences();
                } else if (status === 403 || status === 401) {
                    alert(data.error || 'Not authorized to update this message.');
                    this.fetchAndRenderSentences(); // Refresh to exit edit mode if unauthorized
                } else if (status === 400) {
                    alert(data.error || 'Message cannot be empty.');
                } else {
                    alert(data.error || 'Failed to update message.');
                }
            })
            .catch(err => {
                alert('Network error: ' + err.message);
                this.fetchAndRenderSentences(); // Refresh to exit edit mode on network error
            });
        });

        // ⭐ FIX 2: Remove the interfering click listener on the Save button.
        // The form.submit handler above correctly handles the save and refresh on success.
        
        // Cancel edit: reload message list to exit edit mode
        listItem.querySelector('.cancel-edit').addEventListener('click', () => {
            this.fetchAndRenderSentences();
        });
    }


    // --- CRUD: DELETE Logic (ADJUSTED) ---

    async deleteSentence(id) {
        if (!confirm('Are you sure you want to delete this message? This action is permanent.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/sentences/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Successful deletion
                await this.loadInitialData(); 
            } else if (response.status === 403) {
                // Handle Forbidden (Not the owner)
                alert('You can only delete your own messages. This message belongs to another user.');
            } else if (response.status === 401) {
                // Handle Unauthorized (Not logged in)
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

    // --- Rendering and Helper Functions ---

    renderSentences() {
        this.sentencesList.innerHTML = '';
        this.sentencesCount.textContent = `${this.allSentences.length} Messages`;
        
        if (this.allSentences.length === 0) {
            this.sentencesList.innerHTML = `<li class="empty-state">No messages found matching your criteria.</li>`;
            return;
        }
        
        // Get the current user's name from the read-only input
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
        
        // NOTE: The event listener binding blocks are removed from here due to FIX 1 (Event Delegation).
        // The single delegated listener in init() handles all clicks on these buttons.
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

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize the app if the required DOM elements are found (i.e., on the dashboard page)
    if (document.getElementById('sentencesList')) {
        // We still assign to window.app, but class methods now use 'this'
        window.app = new SentenceApp();
    }
});
