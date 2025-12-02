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
                body: JSON.stringify({ text, category }) // Name removed, server handles author based on session
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
