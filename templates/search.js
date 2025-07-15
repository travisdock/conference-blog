let searchIndex = [];

async function loadSearchIndex() {
    try {
        const response = await fetch('/js/search-index.json');
        searchIndex = await response.json();
    } catch (error) {
        console.error('Failed to load search index:', error);
    }
}

function performSearch(query) {
    if (!query || query.length < 2) return [];
    
    const lowerQuery = query.toLowerCase();
    const results = searchIndex.filter(post => {
        const titleMatch = post.title && post.title.toLowerCase().includes(lowerQuery);
        const categoryMatch = post.category && post.category.toLowerCase().includes(lowerQuery);
        const contentMatch = post.content && post.content.toLowerCase().includes(lowerQuery);
        
        return titleMatch || categoryMatch || contentMatch;
    });
    
    return results.slice(0, 10);
}

function displaySearchResults(results, query) {
    const searchResultsDiv = document.getElementById('search-results');
    const resultsContainer = document.getElementById('results-container');
    const postsList = document.getElementById('posts-list');
    
    if (results.length === 0 && query) {
        searchResultsDiv.style.display = 'block';
        postsList.style.display = 'none';
        resultsContainer.innerHTML = '<p>No results found.</p>';
        return;
    }
    
    if (results.length > 0) {
        searchResultsDiv.style.display = 'block';
        postsList.style.display = 'none';
        
        const resultsHTML = results.map(post => {
            const excerpt = post.content.substring(0, 200) + '...';
            return `
                <div class="search-result">
                    <h3><a href="${post.url}">${post.title}</a></h3>
                    <div class="meta">
                        <span class="date">${post.date || ''}</span>
                        <span class="category">${post.category || 'Uncategorized'}</span>
                    </div>
                    <p>${excerpt}</p>
                </div>
            `;
        }).join('');
        
        resultsContainer.innerHTML = resultsHTML;
    } else {
        searchResultsDiv.style.display = 'none';
        postsList.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadSearchIndex();
    
    const searchInput = document.getElementById('search');
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        searchTimeout = setTimeout(() => {
            const results = performSearch(query);
            displaySearchResults(results, query);
        }, 300);
    });
    
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.target.value = '';
            displaySearchResults([], '');
        }
    });
});