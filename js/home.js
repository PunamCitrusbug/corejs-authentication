/**
 * Home Page JS
 */

onDOMContentLoaded(() => {
    // Check if user is authenticated
    requireAuth();
    
    // DOM elements
    const userFullName = document.getElementById('userFullName');
    const logoutBtn = document.getElementById('logoutBtn');
    const usersTableBody = document.getElementById('usersTableBody');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const pagination = document.getElementById('pagination');
    const currentResults = document.getElementById('currentResults');
    const totalResults = document.getElementById('totalResults');
    const userDetailsBody = document.getElementById('userDetailsBody');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    
    // User data and pagination state
    let users = [];
    let filteredUsers = [];
    let currentPage = 1;
    let itemsPerPage = 10;
    let currentUserId = null;
    let loggedInUserEmail = null; // Store logged-in user's email
    
    // Display user's full name
    const displayUserInfo = () => {
        const user = getUserFromSession();
        if (user) {
            loggedInUserEmail = user.email ? user.email.toLowerCase() : null; // Set email here
            if (user.firstName && user.lastName) {
                userFullName.textContent = `${user.firstName} ${user.lastName}`;
            } else if (user.email) {
                userFullName.textContent = user.email;
            } else {
                userFullName.textContent = 'User';
            }
        } else {
            userFullName.textContent = 'User';
        }
    };
    
    // Fetch users from both API and local storage
    const fetchUsers = () => {
        // Display user info first to ensure loggedInUserEmail is set
        displayUserInfo();

        // Fetch users from API
        const xhr = new XMLHttpRequest();
        xhr.withCredentials = false; // Typically false for public APIs unless needed

        xhr.addEventListener('readystatechange', function () {
            if (this.readyState === this.DONE) {
                let apiUsers = [];
                if (this.status === 200) {
                    try {
                        const response = JSON.parse(this.responseText);
                        if (response && response.data && response.data.data) {
                            // Map API data to our user structure
                            apiUsers = response.data.data.map(apiUser => ({
                                id: apiUser.login.uuid, // Use uuid as a unique ID
                                firstName: apiUser.name.first,
                                lastName: apiUser.name.last,
                                email: apiUser.email,
                                createdAt: apiUser.registered.date, // Use registered date
                                isApiUser: true // Flag to differentiate if needed later
                            }));
                        } else {
                            console.error('Unexpected API response structure:', response);
                        }
                    } catch (e) {
                        console.error('Error parsing API response:', e);
                    }
                } else {
                    console.error('API request failed with status:', this.status);
                }

                // Get users from local storage
                const localUsers = getStoredUsers();

                // Combine local and API users
                let combinedUsers = [...localUsers, ...apiUsers];

                // Filter out the logged-in user *after* combining
                if (loggedInUserEmail) {
                    users = combinedUsers.filter(user => user.email.toLowerCase() !== loggedInUserEmail);
                } else {
                    users = combinedUsers; // Should not happen if logged in, but fallback
                }

                // Apply initial filter and render
                filterUsers();
            }
        });

        xhr.open('GET', 'https://api.freeapi.app/api/v1/public/randomusers?page=1&limit=10');
        xhr.setRequestHeader('accept', 'application/json');
        xhr.send();

        // Show loading state initially
        usersTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Loading users...</td></tr>';
    };
    
    // Filter users based on search
    const filterUsers = (searchTerm = '') => {
        if (!searchTerm) {
            filteredUsers = [...users];
        } else {
            const term = searchTerm.toLowerCase();
            filteredUsers = users.filter(user => {
                const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
                const email = (user.email || '').toLowerCase();
                
                return fullName.includes(term) || email.includes(term);
            });
        }
        
        totalResults.textContent = filteredUsers.length;
        
        // Reset to first page when filtering
        currentPage = 1;
        
        // Render the current page
        renderTable();
        renderPagination();
    };
    
    // Render the users table
    const renderTable = () => {
        // Calculate start and end indices for current page
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredUsers.length);
        
        // Get current page data
        const currentPageData = filteredUsers.slice(startIndex, endIndex);
        
        // Update current results count
        currentResults.textContent = currentPageData.length;
        
        // Clear table
        usersTableBody.innerHTML = '';
        
        // If no users found
        if (currentPageData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="5" class="text-center py-4">No users found</td>`;
            usersTableBody.appendChild(row);
            return;
        }
        
        // Render user rows
        currentPageData.forEach((user, index) => {
            const row = document.createElement('tr');
            
            // Format date
            const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
            
            // Create action buttons
            const viewBtn = `<button class="btn btn-sm btn-outline-primary view-user me-1" data-id="${user.id}" data-bs-toggle="modal" data-bs-target="#userDetailsModal"><i class="bi bi-eye"></i></button>`;
            // Show delete for ALL users
            const deleteBtn = `<button class="btn btn-sm btn-outline-danger delete-user" data-id="${user.id}" data-bs-toggle="modal" data-bs-target="#deleteConfirmModal"><i class="bi bi-trash"></i></button>`;
            
            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td>${user.firstName || ''} ${user.lastName || ''}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${createdDate}</td>
                <td>
                    <div class="action-buttons">
                        ${viewBtn}
                        ${deleteBtn}
                    </div>
                </td>
            `;
            
            usersTableBody.appendChild(row);
        });
        
        // Add event listeners to action buttons
        document.querySelectorAll('.view-user').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = this.getAttribute('data-id');
                showUserDetails(userId);
            });
        });
        
        document.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = this.getAttribute('data-id');
                // No need to check isApiUser here, show confirmation for all
                showDeleteConfirmation(userId);
            });
        });
    };
    
    // Render pagination controls
    const renderPagination = () => {
        pagination.innerHTML = '';
        
        const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
        
        // If only one page, don't show pagination
        if (totalPages <= 1) {
            return;
        }
        
        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous"><span aria-hidden="true">&laquo;</span></a>`;
        pagination.appendChild(prevLi);
        
        // Only show a subset of pages if there are many
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        // Adjust if we're near the end
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            const pageLi = document.createElement('li');
            pageLi.className = `page-item ${currentPage === i ? 'active' : ''}`;
            pageLi.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
            pagination.appendChild(pageLi);
        }
        
        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next"><span aria-hidden="true">&raquo;</span></a>`;
        pagination.appendChild(nextLi);
        
        // Add event listeners to pagination controls
        pagination.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                if (this.getAttribute('aria-label') === 'Previous' && currentPage > 1) {
                    currentPage--;
                    renderTable();
                    renderPagination();
                } else if (this.getAttribute('aria-label') === 'Next' && currentPage < totalPages) {
                    currentPage++;
                    renderTable();
                    renderPagination();
                } else if (this.dataset.page) {
                    currentPage = parseInt(this.dataset.page);
                    renderTable();
                    renderPagination();
                }
                
                // Scroll to top of table
                document.querySelector('.card').scrollIntoView({ behavior: 'smooth' });
            });
        });
    };
    
    // Show user details modal
    const showUserDetails = (userId) => {
        // Find user in the combined list (local + API)
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            return;
        }
        
        // Format date
        const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A';
        
        // Create user details HTML - Adjust fields as needed
        userDetailsBody.innerHTML = `
            <div class="user-details">
                <h5 class="mb-3">${user.firstName || ''} ${user.lastName || ''}</h5>
                <p><strong>ID:</strong> ${user.id || 'N/A'}</p> <!-- Display ID -->
                <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                <p><strong>Created At:</strong> ${createdDate}</p>
                <!-- Add other details if available from API/local -->
                ${user.location ? `<p><strong>Location:</strong> ${user.location.city}, ${user.location.country}</p>` : ''} 
                ${user.phone ? `<p><strong>Phone:</strong> ${user.phone}</p>` : ''} 
            </div>
        `;
        
        // Modal instance might already exist if triggered by button data attributes
        // const userDetailsModal = new bootstrap.Modal(document.getElementById('userDetailsModal'));
        // userDetailsModal.show(); // Not strictly necessary if using data-bs-toggle
    };
    
    // Show delete confirmation modal
    const showDeleteConfirmation = (userId) => {
        currentUserId = userId;
        
        // Show confirmation modal
        const deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
        deleteConfirmModal.show();
    };
    
    // Delete user
    const deleteUserById = () => {
        if (!currentUserId) {
            return;
        }

        const userIndex = users.findIndex(u => u.id === currentUserId);
        if (userIndex === -1) {
            console.error("User to delete not found in main list.");
            return;
        }

        const userToDelete = users[userIndex];

        // Delete from localStorage ONLY if it's a local user
        if (!userToDelete.isApiUser) {
            const deletedFromStorage = deleteUser(currentUserId); // From auth.js
            if (!deletedFromStorage) {
                console.warn("Failed to delete user from local storage, but proceeding with UI removal.");
            }
        }

        // Remove from the main users array
        users.splice(userIndex, 1);

        // Remove from the filtered users array
        const filteredIndex = filteredUsers.findIndex(u => u.id === currentUserId);
        if (filteredIndex !== -1) {
            filteredUsers.splice(filteredIndex, 1);
        }

        // Update total count
        totalResults.textContent = filteredUsers.length;

        // Re-render the current page or adjust if the page becomes empty
        const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages; // Go to the last page if current page is now out of bounds
        }
        if (filteredUsers.length === 0) {
             currentPage = 1; // Reset to page 1 if no users left
        }

        // Refresh the table and pagination
        renderTable();
        renderPagination();

        // Hide the confirmation modal
        const deleteConfirmModal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
        if (deleteConfirmModal) {
            deleteConfirmModal.hide();
        }

        currentUserId = null; // Reset current user ID
    };
    
    // Logout function
    const logout = () => {
        // Clear auth data
        clearAuth();
        
        // Redirect to login page
        window.location.href = 'index.html';
    };
    
    // Setup event listeners
    const setupEventListeners = () => {
        // Logout button
        logoutBtn.addEventListener('click', logout);
        
        // Search input (search on input)
        searchInput.addEventListener('input', () => {
            filterUsers(searchInput.value.trim());
        });
        
        // Delete confirmation button
        confirmDeleteBtn.addEventListener('click', deleteUserById);
    };
    
    // Initialize page
    const initPage = () => {
        displayUserInfo();
        fetchUsers();
        setupEventListeners();
    };
    
    // Run initialization
    initPage();
}); 