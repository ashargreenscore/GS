// Enhanced Seller Dashboard JavaScript with all new features

let currentUser = null;
let materials = [];
let categories = [];
let projects = [];
let orderRequests = [];
let transactionHistory = [];
let currentMaterialRequests = [];
let currentView = 'grid';
let selectedFile = null; // Store the selected file globally

// Initialize the enhanced seller dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔥 DOM LOADED - Initializing seller dashboard...');
    
    // Check authentication - validate with server
    currentUser = getCurrentUser();
    console.log('👤 Current user on load:', currentUser);
    
    if (!currentUser) {
        console.log(' No user found, redirecting to auth');
        window.location.href = '/auth.html';
        return;
    }
    
    // Validate user exists on server (will call initializeDashboard if valid)
    validateUserWithServer();
});

// Authentication functions
function getCurrentUser() {
    const userStr = localStorage.getItem('greenscore-user');
    return userStr ? JSON.parse(userStr) : null;
}

async function validateUserWithServer() {
    if (!currentUser || !currentUser.id) {
        redirectToAuth();
        return;
    }
    
    try {
        console.log('🔍 Validating user with server...');
        const response = await fetch(`/api/users/${currentUser.id}/validate`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok || response.status === 404) {
            console.log('❌ User validation failed - user not found in database');
            redirectToAuth();
            return;
        }
        
        const result = await response.json();
        
        if (!result.success) {
            console.log('❌ User validation failed');
            redirectToAuth();
            return;
        }
        
        console.log('✅ User validation successful');
        // Continue with initialization
        initializeDashboard();
        
    } catch (error) {
        console.error('❌ Error validating user:', error);
        redirectToAuth();
    }
}

function redirectToAuth() {
    localStorage.removeItem('greenscore-user'); // Clear invalid session
    window.location.href = '/auth.html';
}

function initializeDashboard() {
    // Update user type to seller for this session
    if (currentUser.userType !== 'seller') {
        currentUser.userType = 'seller';
        localStorage.setItem('greenscore-user', JSON.stringify(currentUser));
        console.log('✅ Updated user type to seller');
    }
    
    // Set user name
    const sellerNameElement = document.getElementById('seller-name');
    if (sellerNameElement) {
        sellerNameElement.textContent = currentUser.name;
        console.log('✅ Set seller name:', currentUser.name);
    }
    
    // Initialize user profile dropdown
    initializeUserProfile();
    
    // Fix tab button onclick handlers to ensure correct tab switching
    setTimeout(() => {
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            const onclickStr = btn.getAttribute('onclick');
            if (onclickStr) {
                // Extract tab ID from onclick attribute
                const match = onclickStr.match(/showTab\(['"]([^'"]+)['"]\)/);
                if (match && match[1]) {
                    const tabId = match[1];
                    // Remove old onclick and add new event listener
                    btn.removeAttribute('onclick');
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        console.log(`📌 Tab button clicked for: ${tabId}`);
                        showTab(tabId);
                    });
                }
            }
        });
        console.log('✅ Tab buttons re-initialized');
    }, 100);
    
    // Check if critical elements exist
    const criticalElements = {
        'csv-file': document.getElementById('csv-file'),
        'current-project': document.getElementById('current-project'),
        'upload-btn': document.getElementById('upload-btn'),
        'upload-progress': document.getElementById('upload-progress')
    };
    
    console.log('🔍 Critical elements check:', Object.keys(criticalElements).map(key => ({
        [key]: !!criticalElements[key]
    })));
    
    // Continue with dashboard initialization
    loadCategories();
    loadProjects();
    loadInventory();
    setupEventListeners();
    loadNotifications();
    
    // Set up auto-refresh system
    setupAutoRefresh();
    updateStats();
    
    console.log('✅ Seller dashboard initialization complete');
}

function signOut() {
    localStorage.removeItem('greenscore-user');
    window.location.href = '/';
}

// User Profile Dropdown Functions
async function initializeUserProfile() {
    // Set name in button
    const profileUserName = document.getElementById('profile-user-name');
    if (profileUserName && currentUser) {
        profileUserName.textContent = currentUser.name || 'User';
    }
    
    // Load full user details
    await loadUserProfileDetails();
}

async function loadUserProfileDetails() {
    if (!currentUser || !currentUser.id) return;
    
    try {
        // Try to fetch full user details from API
        const response = await fetch(`/api/users/${currentUser.id}`);
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.user) {
                updateProfileDetails(result.user);
                return;
            }
        }
    } catch (error) {
        console.error('Error fetching user details:', error);
    }
    
    // Fallback to currentUser data if API fails
    updateProfileDetails(currentUser);
}

function updateProfileDetails(user) {
    // Update profile detail fields
    const detailName = document.getElementById('profile-detail-name');
    const detailEmail = document.getElementById('profile-detail-email');
    const detailCompany = document.getElementById('profile-detail-company');
    const detailPhone = document.getElementById('profile-detail-phone');
    const detailProject = document.getElementById('profile-detail-project');
    const detailDesignation = document.getElementById('profile-detail-designation');
    
    if (detailName) detailName.textContent = user.name || '-';
    if (detailEmail) detailEmail.textContent = user.email || '-';
    if (detailCompany) detailCompany.textContent = user.company_name || user.companyName || 'Not specified';
    if (detailPhone) detailPhone.textContent = user.phone || 'Not provided';
    
    // Project Name - above designation
    if (detailProject) {
        detailProject.textContent = user.project_name || 'Not specified';
    }
    
    // Designation
    if (detailDesignation) {
        if (user.designation) {
            detailDesignation.textContent = user.designation;
        } else {
            detailDesignation.textContent = 'Not specified';
        }
    }
}

function toggleUserProfile() {
    const menu = document.getElementById('user-profile-menu');
    if (!menu) return;
    
    const isVisible = menu.style.display !== 'none';
    menu.style.display = isVisible ? 'none' : 'block';
    
    // Close menu when clicking outside
    if (!isVisible) {
        setTimeout(() => {
            document.addEventListener('click', closeUserProfileOnOutsideClick, true);
        }, 0);
    }
}

function closeUserProfileOnOutsideClick(event) {
    const menu = document.getElementById('user-profile-menu');
    const btn = document.querySelector('.user-profile-btn');
    
    if (menu && btn && !menu.contains(event.target) && !btn.contains(event.target)) {
        menu.style.display = 'none';
        document.removeEventListener('click', closeUserProfileOnOutsideClick, true);
    }
}

// Account Page Functions
function openAccountPage() {
    // Close profile dropdown first
    const menu = document.getElementById('user-profile-menu');
    if (menu) menu.style.display = 'none';
    
    // Load current user data into form
    loadAccountData();
    
    // Open account modal
    const modal = document.getElementById('account-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeAccountModal() {
    const modal = document.getElementById('account-modal');
    if (modal) {
        modal.classList.remove('show');
    }
    document.getElementById('account-form').reset();
}

async function loadAccountData() {
    if (!currentUser || !currentUser.id) return;
    
    try {
        // Fetch full user details
        const response = await fetch(`/api/users/${currentUser.id}`);
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.user) {
                populateAccountForm(result.user);
                return;
            }
        }
    } catch (error) {
        console.error('Error loading account data:', error);
    }
    
    // Fallback to currentUser data
    populateAccountForm(currentUser);
}

function populateAccountForm(user) {
    document.getElementById('account-name').value = user.name || '';
    document.getElementById('account-email').value = user.email || '';
    document.getElementById('account-email').disabled = true; // Email cannot be changed
    document.getElementById('account-company').value = user.company_name || user.companyName || '';
    document.getElementById('account-phone').value = user.phone || '';
    document.getElementById('account-address').value = user.address || '';
    
    // Set project name if available
    const projectInput = document.getElementById('account-project');
    if (projectInput) {
        // Use project_name if available, otherwise empty
        projectInput.value = user.project_name || '';
    }
    
    // Set designation if available
    const designationSelect = document.getElementById('account-designation');
    if (designationSelect) {
        designationSelect.value = user.designation || '';
    }
}

// Handle account form submission and setup profile account form
document.addEventListener('DOMContentLoaded', function() {
    // Setup profile account form
    setupProfileAccountForm();
    
    const accountForm = document.getElementById('account-form');
    if (accountForm) {
        accountForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!currentUser || !currentUser.id) {
                showNotification('User not found. Please sign in again.', 'error');
                return;
            }
            
            const updateData = {
                name: document.getElementById('account-name').value.trim(),
                company_name: document.getElementById('account-company').value.trim(),
                phone: document.getElementById('account-phone').value.trim(),
                designation: document.getElementById('account-designation').value,
                project_name: document.getElementById('account-project').value.trim() || null,
                address: document.getElementById('account-address').value.trim() || null
            };
            
            // Validate required fields
            if (!updateData.name) {
                showNotification('Name is required', 'error');
                return;
            }
            
            try {
                const response = await fetch(`/api/users/${currentUser.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showNotification('Account updated successfully!', 'success');
                    
                    // Update currentUser in localStorage
                    currentUser.name = updateData.name;
                    currentUser.companyName = updateData.company_name;
                    currentUser.company_name = updateData.company_name;
                    currentUser.phone = updateData.phone;
                    currentUser.designation = updateData.designation;
                    currentUser.project_name = updateData.project_name;
                    currentUser.address = updateData.address;
                    localStorage.setItem('greenscore-user', JSON.stringify(currentUser));
                    
                    // Update profile display
                    updateProfileDetails({
                        ...currentUser,
                        company_name: updateData.company_name,
                        phone: updateData.phone,
                        designation: updateData.designation
                    });
                    
                    // Update seller name if displayed
                    const sellerNameElement = document.getElementById('seller-name');
                    if (sellerNameElement) {
                        sellerNameElement.textContent = updateData.name;
                    }
                    
                    // Update profile button name
                    const profileUserName = document.getElementById('profile-user-name');
                    if (profileUserName) {
                        profileUserName.textContent = updateData.name;
                    }
                    
                    // Close modal after a short delay
                    setTimeout(() => {
                        closeAccountModal();
                    }, 1000);
                } else {
                    showNotification(result.error || 'Failed to update account', 'error');
                }
            } catch (error) {
                console.error('Error updating account:', error);
                showNotification('Error updating account. Please try again.', 'error');
            }
        });
    }
});

// Load categories from API
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        categories = await response.json();
        populateCategoryFilters();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load projects for current seller
async function loadProjects() {
    try {
        const response = await fetch(`/api/projects/${currentUser.id}`);
        projects = await response.json();
        populateProjectSelectors();
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

// Populate project selectors
function populateProjectSelectors() {
    const currentProject = document.getElementById('current-project');
    const projectFilter = document.getElementById('project-filter');
    const targetProject = document.getElementById('target-project');
    
    // Clear existing options
    [currentProject, projectFilter, targetProject].forEach(select => {
        if (select) {
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
        }
    });
    
    // Add "All Projects" option to current project selector
    if (currentProject) {
        const allOption = document.createElement('option');
        allOption.value = 'all-projects';
        allOption.textContent = '📊 All Projects (Combined View)';
        currentProject.appendChild(allOption);
    }
    
    projects.forEach(project => {
        [currentProject, projectFilter, targetProject].forEach(select => {
            if (select) {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                select.appendChild(option);
            }
        });
    });
}

// Populate category dropdowns
function populateCategoryFilters() {
    const categoryFilter = document.getElementById('category-filter');
    const itemCategory = document.getElementById('item-category');
    const editCategory = document.getElementById('edit-category');
    
    categories.forEach(category => {
        [categoryFilter, itemCategory, editCategory].forEach(select => {
            if (select) {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                select.appendChild(option);
            }
        });
    });
}

// Load seller's inventory with enhanced filtering
async function loadInventory() {
    try {
        // Check both project dropdowns - use current-project if set, otherwise project-filter
        const currentProject = document.getElementById('current-project')?.value;
        const projectFilter = document.getElementById('project-filter')?.value;
        let projectId = currentProject || projectFilter || 'all';
        
        // Handle "all-projects" selection
        if (projectId === 'all-projects') {
            projectId = 'all';
        }
        
        const inventoryType = document.getElementById('inventory-type-filter')?.value || 'all';
        const listingType = document.getElementById('listing-type-filter')?.value || 'all';
        
        let url = `/api/seller/${currentUser.id}/materials?`;
        const params = new URLSearchParams();
        
        if (projectId !== 'all') params.append('projectId', projectId);
        if (inventoryType !== 'all') params.append('inventoryType', inventoryType);
        if (listingType !== 'all') params.append('listingType', listingType);
        
        const response = await fetch(url + params.toString());
        materials = await response.json();
        
        displayInventory();
        updateStats();
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

// Display inventory in current view (grid or table)
function displayInventory() {
    const categoryFilter = document.getElementById('category-filter').value;
    const searchTerm = document.getElementById('search-inventory').value.toLowerCase();
    
    let filteredMaterials = [...materials];
    
    // Filter by category
    if (categoryFilter && categoryFilter !== 'all') {
        filteredMaterials = filteredMaterials.filter(material => 
            material.category === categoryFilter
        );
    }
    
    // Filter by search term
    if (searchTerm) {
        filteredMaterials = filteredMaterials.filter(material =>
            material.material.toLowerCase().includes(searchTerm) ||
            (material.brand && material.brand.toLowerCase().includes(searchTerm)) ||
            (material.specs && material.specs.toLowerCase().includes(searchTerm))
        );
    }
    
    if (currentView === 'grid') {
        displayGridView(filteredMaterials);
    } else {
        displayTableView(filteredMaterials);
    }
}

// Display materials in grid view
function displayGridView(filteredMaterials) {
    const inventoryGrid = document.getElementById('inventory-grid');
    const inventoryTable = document.getElementById('inventory-table');
    
    inventoryGrid.style.display = 'grid';
    inventoryTable.style.display = 'none';
    
    if (filteredMaterials.length === 0) {
        inventoryGrid.innerHTML = `
            <div class="no-inventory">
                <i class="fas fa-boxes"></i>
                <h3>No inventory found</h3>
                <p>Upload your first CSV file or add items manually to get started.</p>
            </div>
        `;
        return;
    }
    
    inventoryGrid.innerHTML = filteredMaterials.map(material => {
        // Parse photos - could be single string or JSON array
        let photos = [];
        if (material.photo) {
            try {
                photos = JSON.parse(material.photo);
                if (!Array.isArray(photos)) photos = [material.photo];
            } catch {
                photos = [material.photo];
            }
        }
        
        return `
        <div class="inventory-item" onclick="viewMaterialDetail('${material.id}')" style="cursor: pointer;">
            ${photos.length > 0 ? `
                <div class="item-photo-slideshow" data-material-id="${material.id}">
                    ${photos.length > 1 ? `
                        <button class="slideshow-prev" onclick="changeSlide('${material.id}', -1)">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button class="slideshow-next" onclick="changeSlide('${material.id}', 1)">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    ` : ''}
                    <div class="slideshow-container">
                        ${photos.map((photo, index) => `
                            <img src="${photo}" 
                                 alt="${material.material} - Photo ${index + 1}" 
                                 class="slideshow-image ${index === 0 ? 'active' : ''}"
                                 data-index="${index}"
                                 onerror="this.style.display='none'">
                        `).join('')}
                    </div>
                    ${photos.length > 1 ? `
                        <div class="slideshow-indicators">
                            ${photos.map((_, index) => `
                                <span class="indicator ${index === 0 ? 'active' : ''}" 
                                      onclick="goToSlide('${material.id}', ${index})"></span>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            <div class="item-actions" onclick="event.stopPropagation()">
                <div class="dropdown">
                    <button class="dropdown-btn" onclick="event.stopPropagation(); toggleDropdown('${material.id}')">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="dropdown-content" id="dropdown-${material.id}">
                        <div class="dropdown-item edit" onclick="event.stopPropagation(); editMaterial('${material.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </div>
                        ${material.acquisitionType === 'acquired' ? 
                            `<div class="dropdown-item resale" onclick="event.stopPropagation(); markAcquiredForSale('${material.id}')">
                                <i class="fas fa-store"></i> Mark for Sale
                            </div>` : 
                            `<div class="dropdown-item resale" onclick="event.stopPropagation(); updateListingType('${material.id}', 'resale')">
                            <i class="fas fa-store"></i> For Resale
                            </div>`
                        }
                        <div class="dropdown-item sold" onclick="event.stopPropagation(); updateListingType('${material.id}', 'sold')">
                            <i class="fas fa-check-circle"></i> Mark as Sold
                        </div>
                        <div class="dropdown-item delete" onclick="event.stopPropagation(); deleteMaterial('${material.id}')" style="color: #ef4444;">
                            <i class="fas fa-trash"></i> Delete
                        </div>
                    </div>
                </div>
            </div>
            <div class="item-header">
                <span class="item-category">${material.category || 'Other'}</span>
                <span class="status-badge status-${material.acquisitionType === 'acquired' ? 'acquired' : (material.listingType || 'resale')}">${getStatusText(material.listingType, material.acquisitionType)}</span>
            </div>
            <div class="item-details">
                <h4>${material.material}</h4>
                <div class="item-meta">
                    <span><strong>Brand:</strong> ${material.brand || 'N/A'}</span>
                    <span><strong>Condition:</strong> ${material.condition || 'N/A'}</span>
                    <span><strong>Quantity:</strong> ${material.qty} ${material.unit || 'pcs'}</span>
                    <span><strong>Project:</strong> ${getProjectName(material.projectId)}</span>
                </div>
                <p><strong>Specs:</strong> ${material.specs || 'No specifications'}</p>
                <div class="request-actions">
                    <button class="btn btn-sm btn-info" onclick="viewRequestsForMaterial('${material.id}')">
                        <i class="fas fa-shopping-cart"></i> View Requests
                    </button>
                </div>
            </div>
            <div class="item-price">
                <div class="price">₹${material.priceToday || 0}</div>
                <small>Per ${material.unit || 'piece'}</small>
            </div>
        </div>
    `}).join('');
}

// Display materials in table view
function displayTableView(filteredMaterials) {
    const inventoryGrid = document.getElementById('inventory-grid');
    const inventoryTable = document.getElementById('inventory-table');
    const tableBody = document.getElementById('inventory-table-body');
    
    inventoryGrid.style.display = 'none';
    inventoryTable.style.display = 'block';
    
    if (filteredMaterials.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 3rem; color: #64748b;">
                    <i class="fas fa-boxes" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <div>No inventory found</div>
                    <small>Upload your first CSV file or add items manually to get started.</small>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = filteredMaterials.map(material => `
        <tr onclick="viewMaterialDetail('${material.id}')" style="cursor: pointer;">
            <td>
                <strong>${material.material}</strong>
                <br><small>${material.specs || 'No specifications'}</small>
            </td>
            <td>${material.brand || 'Generic'}</td>
            <td><span class="item-category">${material.category || 'Other'}</span></td>
            <td>${material.qty} ${material.unit || 'pcs'}</td>
            <td>₹${material.priceToday || 0}</td>
            <td>${getProjectName(material.projectId)}</td>
            <td><span class="status-badge status-${material.listingType || 'resale'}">${getStatusText(material.listingType)}</span></td>
            <td onclick="event.stopPropagation();">
                <div class="action-buttons">
                    <button class="action-btn primary" onclick="event.stopPropagation(); editMaterial('${material.id}')" title="Edit Material">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn danger" onclick="event.stopPropagation(); deleteMaterial('${material.id}')" title="Delete Material">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Helper functions
function getProjectName(projectId) {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Default Project';
}

function getStatusText(listingType, acquisitionType = null) {
    if (acquisitionType === 'acquired') {
        return 'Acquired';
    }
    
    switch (listingType) {
        case 'resale': return 'For Sale';
        case 'acquired': return 'Acquired';
        case 'sold': return 'Sold';
        default: return 'For Sale';
    }
}

// Set view (grid or table)
function setView(view) {
    currentView = view;
    
    // Update button states
    document.getElementById('grid-view-btn').classList.toggle('active', view === 'grid');
    document.getElementById('table-view-btn').classList.toggle('active', view === 'table');
    
    displayInventory();
}

// Toggle dropdown menu
function toggleDropdown(materialId) {
    const dropdown = document.getElementById(`dropdown-${materialId}`);
    
    // Close all other dropdowns
    document.querySelectorAll('.dropdown-content').forEach(d => {
        if (d.id !== `dropdown-${materialId}`) {
            d.classList.remove('show');
        }
    });
    
    dropdown.classList.toggle('show');
}

// Update listing type directly
async function updateListingType(materialId, listingType) {
    try {
        const response = await fetch(`/api/materials/${materialId}/listing-type`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ listingType })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Listing updated to ${getStatusText(listingType)}`, 'success');
            loadInventory(); // Refresh inventory
        } else {
            showNotification('Error updating listing', 'error');
        }
    } catch (error) {
        showNotification('Error updating listing', 'error');
        console.error('Update listing error:', error);
    }
    
    // Close dropdown
    document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
}

// Delete material function
async function deleteMaterial(materialId) {
    const material = materials.find(m => m.id === materialId);
    if (!material) {
        showNotification('Material not found', 'error');
        return;
    }
    
    const confirmed = confirm(`Are you sure you want to delete "${material.material}"? This action cannot be undone.`);
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/materials/${materialId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sellerId: currentUser.id
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Material "${material.material}" deleted successfully`, 'success');
            // Remove material from local array
            materials = materials.filter(m => m.id !== materialId);
            // Refresh display
            displayInventory();
            updateStats();
        } else {
            showNotification(result.error || 'Failed to delete material', 'error');
        }
    } catch (error) {
        console.error('Error deleting material:', error);
        showNotification('Failed to delete material', 'error');
    }
    
    // Close dropdown if open
    document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
}

// Show listing action modal
// Edit material function
async function editMaterial(materialId) {
    const material = materials.find(m => m.id === materialId);
    if (!material) {
        showNotification('Material not found', 'error');
        return;
    }
    
    try {
        // Try to lock the material for editing
        const lockResponse = await fetch(`/api/materials/${materialId}/lock`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: currentUser.id })
        });
        
        const lockResult = await lockResponse.json();
        
        if (!lockResult.success && !lockResult.locked) {
            // Material is locked by another user
            document.getElementById('edit-material-modal').classList.add('show');
            document.getElementById('edit-material-form').style.display = 'none';
            document.getElementById('edit-lock-warning').style.display = 'block';
            return;
        }
        
        // Successfully locked, show edit form
        // Populate the edit form
        document.getElementById('edit-material-id').value = material.id;
        document.getElementById('edit-material-name').value = material.material;
        document.getElementById('edit-brand').value = material.brand || '';
        
        // Get categories and populate
        const categoriesResponse = await fetch('/api/categories');
        const categoriesData = await categoriesResponse.json();
        const editCategorySelect = document.getElementById('edit-category');
        if (editCategorySelect) {
            editCategorySelect.innerHTML = '<option value="">Select Category</option>';
            categoriesData.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                if (category === material.category) {
                    option.selected = true;
                }
                editCategorySelect.appendChild(option);
            });
        }
        
        document.getElementById('edit-qty').value = material.qty;
        document.getElementById('edit-unit').value = material.unit || 'pcs';
        document.getElementById('edit-condition').value = material.condition || 'good';
        document.getElementById('edit-mrp').value = material.mrp || 0;
        document.getElementById('edit-price-today').value = material.priceToday || material.price_today || 0;
        document.getElementById('edit-specs').value = material.specs || '';
        
        // Handle photos - could be single string, JSON array, or base64
        editUploadedPhotos = []; // Clear previous uploads
        let existingPhotos = [];
        if (material.photo) {
            try {
                existingPhotos = JSON.parse(material.photo);
                if (!Array.isArray(existingPhotos)) {
                    existingPhotos = [material.photo];
                }
            } catch {
                existingPhotos = [material.photo];
            }
        }
        editUploadedPhotos = [...existingPhotos]; // Copy existing photos
        updateEditPhotoPreview(); // Display existing photos
        
        // Set photo URL field if no photos exist
        const photoUrlInput = document.getElementById('edit-photo-url');
        if (photoUrlInput) {
            photoUrlInput.value = existingPhotos.length > 0 && !existingPhotos[0].startsWith('data:') ? existingPhotos[0] : '';
        }
        
        // Show the modal
        document.getElementById('edit-material-modal').classList.add('show');
        document.getElementById('edit-material-form').style.display = 'block';
        const lockWarning = document.getElementById('edit-lock-warning');
        if (lockWarning) lockWarning.style.display = 'none';
        
    } catch (error) {
        console.error('Error locking material for edit:', error);
        showNotification('Error starting edit session', 'error');
    }
}

async function closeEditModal() {
    const materialId = document.getElementById('edit-material-id').value;
    if (materialId) {
        // Unlock the material
        try {
            await fetch(`/api/materials/${materialId}/unlock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: currentUser.id })
            });
        } catch (error) {
            console.error('Error unlocking material:', error);
        }
    }
    
    // Clear uploaded photos
    editUploadedPhotos = [];
    updateEditPhotoPreview();
    
    document.getElementById('edit-material-modal').classList.remove('show');
    document.getElementById('edit-material-form').reset();
}

function cancelEdit() {
    closeEditModal();
}

// Handle edit form submission
document.addEventListener('DOMContentLoaded', function() {
    const editForm = document.getElementById('edit-material-form');
    if (editForm) {
        editForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const materialId = document.getElementById('edit-material-id').value;
            
            // Determine photo value: use uploaded photos if any, otherwise use URL
            let photoValue = '';
            const photoUrlInput = document.getElementById('edit-photo-url');
            if (editUploadedPhotos.length > 0) {
                // Use uploaded photos (base64 or URLs)
                photoValue = editUploadedPhotos.length === 1 ? editUploadedPhotos[0] : JSON.stringify(editUploadedPhotos);
            } else if (photoUrlInput && photoUrlInput.value.trim()) {
                // Use URL if provided
                photoValue = photoUrlInput.value.trim();
            }
            
            const updateData = {
                userId: currentUser.id,
                material: document.getElementById('edit-material-name').value,
                brand: document.getElementById('edit-brand').value,
                category: document.getElementById('edit-category').value,
                qty: parseInt(document.getElementById('edit-qty').value),
                unit: document.getElementById('edit-unit').value,
                condition: document.getElementById('edit-condition').value,
                mrp: parseFloat(document.getElementById('edit-mrp').value) || 0,
                priceToday: parseFloat(document.getElementById('edit-price-today').value),
                specs: document.getElementById('edit-specs').value,
                photo: photoValue
            };
            
            try {
                const response = await fetch(`/api/materials/${materialId}/edit`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showNotification('Material updated successfully', 'success');
                    
                    // Close modal first
                    await closeEditModal();
                    
                    // Reload inventory to show updates in seller dashboard
                    await loadInventory();
                    updateStats();
                    
                    // Force a page refresh after a short delay to ensure all panels see the update
                    // This ensures buyer marketplace and admin panel also see changes
                    setTimeout(() => {
                        // Only reload if we're not in a modal or important state
                        if (!document.getElementById('edit-material-modal')?.classList.contains('show')) {
                            // Trigger a custom event that other parts of the app can listen to
                            window.dispatchEvent(new CustomEvent('materialUpdated', { detail: { materialId } }));
                        }
                    }, 500);
                } else {
                    showNotification(result.error || 'Error updating material', 'error');
                }
            } catch (error) {
                console.error('Error updating material:', error);
                console.error('Error details:', error.message, error.stack);
                
                // Show more detailed error message
                let errorMessage = 'Error updating material';
                if (error.message) {
                    errorMessage += ': ' + error.message;
                }
                showNotification(errorMessage, 'error');
            }
        });
    }
});

// Edit photo upload functions
let editUploadedPhotos = [];

// Trigger photo upload for edit modal
function triggerEditPhotoUpload() {
    document.getElementById('edit-photo-input').click();
}

// Handle photo file uploads for edit modal
async function handleEditPhotoFiles(input) {
    const files = Array.from(input.files);
    const previewGrid = document.getElementById('edit-photo-preview-grid');
    
    for (const file of files) {
        if (file.type.startsWith('image/')) {
            // Upload to server first
            try {
                const formData = new FormData();
                formData.append('image', file);
                
                const uploadResponse = await fetch('/api/upload-image', {
                    method: 'POST',
                    body: formData
                });
                
                const uploadResult = await uploadResponse.json();
                
                if (uploadResult.success) {
                    // Add the server URL to the photos array
                    editUploadedPhotos.push(uploadResult.imageUrl);
                    updateEditPhotoPreview();
                } else {
                    showNotification('Failed to upload image: ' + uploadResult.error, 'error');
                }
            } catch (error) {
                console.error('Error uploading image:', error);
                showNotification('Error uploading image', 'error');
            }
        }
    }
    
    // Clear the input for next selection
    input.value = '';
}

// Remove uploaded photo from edit modal
function removeEditPhoto(index) {
    editUploadedPhotos.splice(index, 1);
    updateEditPhotoPreview();
}

// Update photo preview grid for edit modal
function updateEditPhotoPreview() {
    const previewGrid = document.getElementById('edit-photo-preview-grid');
    if (!previewGrid) return;
    
    previewGrid.innerHTML = '';
    
    editUploadedPhotos.forEach((photo, index) => {
        const preview = document.createElement('div');
        preview.className = 'photo-preview-item';
        preview.innerHTML = `
            <img src="${photo}" alt="Preview" onerror="this.src='https://via.placeholder.com/150/f3f4f6/9ca3af?text=Image+Error'">
            <button type="button" class="remove-photo" onclick="removeEditPhoto(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        previewGrid.appendChild(preview);
    });
}

// View material detail modal (similar to buyer marketplace)
function viewMaterialDetail(materialId) {
    const material = materials.find(m => m.id === materialId);
    if (!material) {
        showNotification('Material not found', 'error');
        return;
    }
    
    const modal = document.getElementById('material-detail-modal');
    const modalTitle = document.getElementById('detail-modal-title');
    const modalContent = document.getElementById('material-detail-content');
    
    modalTitle.textContent = material.material;
    
    // Parse photos - could be single string or JSON array
    let photos = [];
    if (material.photo) {
        try {
            photos = JSON.parse(material.photo);
            if (!Array.isArray(photos)) photos = [material.photo];
        } catch {
            photos = [material.photo];
        }
    }
    
    modalContent.innerHTML = `
        <!-- Full width image slideshow on top -->
        <div class="product-image" style="width: 100%; height: 400px; border-radius: 10px; overflow: hidden; margin-bottom: 1.25rem; background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.08); position: relative;">
            ${photos.length > 0 ? `
                ${photos.length > 1 ? `
                    <button onclick="changeDetailSlide('detail-${materialId}', -1)" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); background: rgba(0, 0, 0, 0.6); color: white; border: none; padding: 0.75rem; cursor: pointer; z-index: 2; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; transition: background 0.3s;" onmouseover="this.style.background='rgba(0,0,0,0.8)'" onmouseout="this.style.background='rgba(0,0,0,0.6)'">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button onclick="changeDetailSlide('detail-${materialId}', 1)" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: rgba(0, 0, 0, 0.6); color: white; border: none; padding: 0.75rem; cursor: pointer; z-index: 2; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; transition: background 0.3s;" onmouseover="this.style.background='rgba(0,0,0,0.8)'" onmouseout="this.style.background='rgba(0,0,0,0.6)'">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                ` : ''}
                <div id="detail-slideshow-${materialId}" style="width: 100%; height: 100%; position: relative;">
                    ${photos.map((photo, index) => `
                        <img src="${photo}" 
                             alt="${material.material} - Photo ${index + 1}" 
                             class="detail-slideshow-image ${index === 0 ? 'active' : ''}"
                             data-photo-index="${index}"
                             style="width: 100%; height: 100%; object-fit: contain; background: #fff; padding: 0.75rem; position: absolute; top: 0; left: 0; opacity: ${index === 0 ? '1' : '0'}; transition: opacity 0.3s ease;"
                             onerror="this.style.display='none'">
                    `).join('')}
                    ${photos.length > 1 ? `
                        <div style="position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; z-index: 2;">
                            ${photos.map((_, index) => `
                                <span class="detail-slide-indicator ${index === 0 ? 'active' : ''}" 
                                      onclick="goToDetailSlide('detail-${materialId}', ${index})"
                                      data-indicator-index="${index}"
                                      style="width: 10px; height: 10px; border-radius: 50%; background: ${index === 0 ? 'white' : 'rgba(255,255,255,0.5)'}; cursor: pointer; transition: background 0.3s;"></span>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                ${photos.every(p => !p || p.startsWith('data:')) ? '' : `
                    <div style="display:none; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#9ca3af;">
                        <i class="fas fa-image" style="font-size:2rem; margin-bottom:0.5rem; opacity: 0.5;"></i>
                        <span style="font-size: 0.875rem; font-weight: 500;">No Image</span>
                    </div>
                `}
            ` : `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#9ca3af;">
                    <i class="fas fa-image" style="font-size:2rem; margin-bottom:0.5rem; opacity: 0.5;"></i>
                    <span style="font-size: 0.875rem; font-weight: 500;">No Image</span>
                </div>
            `}
        </div>
        
        <style>
            .detail-slideshow-image {
                transition: opacity 0.3s ease;
            }
            .detail-slideshow-image.active {
                opacity: 1 !important;
            }
            .detail-slide-indicator.active {
                background: white !important;
            }
        </style>

        <!-- Material info sections -->
        <div style="display: grid; grid-template-columns: 1.75fr 1fr; gap: 1.25rem;">
            <!-- Left column: Details -->
            <div>
                <div style="margin-bottom: 0.75rem;">
                    <span class="product-category" style="display: inline-block; padding: 0.375rem 0.75rem; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); color: #1e40af; border-radius: 1rem; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                        ${material.category || 'Other'}
                    </span>
                    <span class="status-badge status-${material.listingType || 'resale'}" style="margin-left: 0.5rem;">
                        ${getStatusText(material.listingType, material.acquisitionType)}
                    </span>
                </div>
                
                <h3 style="font-size: 1.375rem; margin-bottom: 0.5rem; color: #111827; font-weight: 700; line-height: 1.3;">${material.material}</h3>
                ${material.brand ? `
                <div style="font-size: 1rem; color: #6b7280; margin-bottom: 1rem; font-weight: 600;">
                    ${material.brand}
                </div>` : ''}
                
                <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 1rem; border-radius: 8px; margin-bottom: 0.875rem; border: 1px solid #e2e8f0;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.875rem;">
                        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                            <div style="color: #64748b; font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.025em;">Condition</div>
                            <div style="font-weight: 700; color: #0f172a; font-size: 0.875rem;">${material.condition ? material.condition.charAt(0).toUpperCase() + material.condition.slice(1) : 'Good'}</div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                            <div style="color: #64748b; font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.025em;">Available Qty</div>
                            <div style="font-weight: 700; color: #0f172a; font-size: 1.125rem;">${material.qty} <span style="font-size: 0.875rem; color: #64748b;">${material.unit || 'pcs'}</span></div>
                        </div>
                        ${material.mrp ? `
                        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                            <div style="color: #64748b; font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.025em;">MRP</div>
                            <div style="font-weight: 700; color: #0f172a; font-size: 0.875rem;">₹${material.mrp}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                ${(material.projectId || material.project_name || material.project_location || material.location_details) ? `
                <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 1rem; border-radius: 8px; margin-bottom: 0.875rem; border: 1px solid #a7f3d0;">
                    <h4 style="margin: 0 0 0.625rem 0; color: #065f46; display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em;">
                        <i class="fas fa-map-marker-alt" style="font-size: 0.625rem;"></i>
                        <span>Location & Project</span>
                    </h4>
                    ${(material.project_location || material.location_details) ? `
                    <div style="margin-bottom: ${(material.projectId || material.project_name) ? '0.5rem' : '0'};">
                        <div style="color: #047857; font-size: 0.625rem; margin-bottom: 0.25rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.025em;">Location</div>
                        <div style="font-weight: 700; color: #064e3b; display: flex; align-items: center; gap: 0.25rem; font-size: 0.8125rem;">
                            <i class="fas fa-location-arrow" style="color: #10b981; font-size: 0.625rem;"></i>
                            <span>${material.project_location || material.location_details || 'Not specified'}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${(material.project_name || (material.projectId && getProjectName(material.projectId) !== 'Default Project')) ? `
                    <div>
                        <div style="color: #047857; font-size: 0.625rem; margin-bottom: 0.25rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.025em;">Project</div>
                        <div style="font-weight: 700; color: #064e3b; display: flex; align-items: center; gap: 0.25rem; font-size: 0.8125rem;">
                            <i class="fas fa-project-diagram" style="color: #10b981; font-size: 0.625rem;"></i>
                            <span>${material.project_name || getProjectName(material.projectId)}</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                ${material.specs && material.specs.trim() ? `
                <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); padding: 1rem; border-radius: 8px; border: 1px solid #fde68a;">
                    <h4 style="margin: 0 0 0.625rem 0; color: #92400e; display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em;">
                        <i class="fas fa-list-ul" style="font-size: 0.625rem;"></i>
                        <span>Specifications</span>
                    </h4>
                    <p style="line-height: 1.6; color: #78350f; white-space: pre-wrap; margin: 0; font-size: 0.8125rem; font-weight: 500;">${material.specs}</p>
                </div>
                ` : ''}
            </div>

            <!-- Right column: Price and actions -->
            <div>
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 1rem; border-radius: 10px; margin-bottom: 1rem; color: white; text-align: center; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 0; right: 0; width: 50px; height: 50px; background: rgba(255,255,255,0.1); border-radius: 50%; transform: translate(30%, -30%);"></div>
                    <div style="position: absolute; bottom: 0; left: 0; width: 40px; height: 40px; background: rgba(255,255,255,0.08); border-radius: 50%; transform: translate(-40%, 40%);"></div>
                    <div style="position: relative; z-index: 1;">
                        <div style="font-size: 0.625rem; margin-bottom: 0.375rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">Selling Price per ${material.unit || 'piece'}</div>
                        <div style="font-size: 1.5rem; font-weight: 900; margin-bottom: 0.25rem; text-shadow: 0 2px 4px rgba(0,0,0,0.15); line-height: 1;">₹${material.priceToday || material.price_today || 0}</div>
                        ${material.mrp && material.mrp > (material.priceToday || material.price_today || 0) ? `
                        <div style="font-size: 0.6875rem; opacity: 0.95; margin-top: 0.375rem;">
                            <span style="text-decoration: line-through; opacity: 0.85;">₹${material.mrp}</span>
                            <span style="margin-left: 0.375rem; background: rgba(255,255,255,0.3); padding: 0.2rem 0.5rem; border-radius: 1rem; font-weight: 700; font-size: 0.625rem;">
                                ${Math.round((1 - (material.priceToday || material.price_today || 0) / material.mrp) * 100)}% OFF
                            </span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <button class="btn btn-primary" onclick="closeMaterialDetailModal(); editMaterial('${material.id}')" style="width: 100%; padding: 0.875rem; font-size: 0.875rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.5rem; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);">
                        <i class="fas fa-edit"></i>
                        Edit Material
                    </button>
                    
                    <button class="btn" onclick="closeMaterialDetailModal(); viewRequestsForMaterial('${material.id}')" style="width: 100%; padding: 0.875rem; font-size: 0.875rem; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.5rem; box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);">
                        <i class="fas fa-shopping-cart"></i>
                        View Order Requests
                    </button>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

// Close material detail modal
function closeMaterialDetailModal() {
    document.getElementById('material-detail-modal').classList.remove('show');
}

// Slideshow navigation for detail modal
function changeDetailSlide(slideshowId, direction) {
    const materialId = slideshowId.replace('detail-', '');
    const slideshow = document.getElementById(`detail-slideshow-${materialId}`);
    if (!slideshow) return;
    
    const images = slideshow.querySelectorAll('.detail-slideshow-image');
    const indicators = slideshow.querySelectorAll('.detail-slide-indicator');
    
    let currentIndex = Array.from(images).findIndex(img => img.classList.contains('active'));
    if (currentIndex === -1) currentIndex = 0;
    
    // Remove active class from current
    images[currentIndex].classList.remove('active');
    if (indicators[currentIndex]) indicators[currentIndex].classList.remove('active');
    
    // Calculate new index
    let newIndex = currentIndex + direction;
    if (newIndex >= images.length) newIndex = 0;
    if (newIndex < 0) newIndex = images.length - 1;
    
    // Add active class to new
    images[newIndex].classList.add('active');
    if (indicators[newIndex]) indicators[newIndex].classList.add('active');
}

function goToDetailSlide(slideshowId, index) {
    const materialId = slideshowId.replace('detail-', '');
    const slideshow = document.getElementById(`detail-slideshow-${materialId}`);
    if (!slideshow) return;
    
    const images = slideshow.querySelectorAll('.detail-slideshow-image');
    const indicators = slideshow.querySelectorAll('.detail-slide-indicator');
    
    // Remove all active classes
    images.forEach(img => img.classList.remove('active'));
    indicators.forEach(ind => ind.classList.remove('active'));
    
    // Add active to specified index
    if (images[index]) images[index].classList.add('active');
    if (indicators[index]) indicators[index].classList.add('active');
}

function showListingActionModal(materialId, listingType = null) {
    const modal = document.getElementById('listing-action-modal');
    const materialIdInput = document.getElementById('action-material-id');
    const listingTypeSelect = document.getElementById('listing-type');
    
    materialIdInput.value = materialId;
    
    if (listingType) {
        listingTypeSelect.value = listingType;
    }
    
    modal.classList.add('show');
    
    // Close dropdown
    document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
}

// Close listing action modal
function closeListingActionModal() {
    document.getElementById('listing-action-modal').classList.remove('show');
}

// Show create project modal
function showCreateProjectModal() {
    document.getElementById('project-modal').classList.add('show');
}

// Close project modal
function closeProjectModal() {
    document.getElementById('project-modal').classList.remove('show');
    document.getElementById('project-form').reset();
}

// Update dashboard statistics
function updateStats() {
    const totalItems = materials.reduce((sum, material) => sum + (material.qty || 0), 0);
    const totalValue = materials.reduce((sum, material) => 
        sum + ((material.priceToday || 0) * (material.qty || 0)), 0
    );
    const activeListings = materials.filter(material => 
        material.qty > 0 && material.listingType === 'resale'
    ).length;
    
    document.getElementById('total-items').textContent = formatIndianNumber(totalItems);
    document.getElementById('total-value').textContent = formatIndianCurrency(totalValue);
    document.getElementById('active-listings').textContent = activeListings;
}

// Setup event listeners
function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const buttonText = e.target.closest('.tab-btn').textContent;
            let tabId;
            
            if (buttonText.includes('Upload')) {
                tabId = 'upload-tab';
            } else if (buttonText.includes('Inventory')) {
                tabId = 'inventory-tab';
            } else if (buttonText.includes('Add Single')) {
                tabId = 'manual-tab';
            } else if (buttonText.includes('Notifications')) {
                tabId = 'notifications-tab';
            } else {
                tabId = 'manual-tab'; // fallback
            }
            
            showTab(tabId);
        });
    });
    
    // File upload elements - with retry mechanism
    let fileInput = document.getElementById('csv-file');
    let uploadArea = document.getElementById('upload-area');
    let uploadBtn = document.getElementById('upload-btn');
    
    console.log('🔍 Upload elements check (first attempt):', {
        fileInput: !!fileInput,
        uploadArea: !!uploadArea,
        uploadBtn: !!uploadBtn
    });
    
    // Retry finding elements after a short delay
    if (!fileInput || !uploadArea || !uploadBtn) {
        console.log('⏳ Some elements not found, retrying in 100ms...');
        setTimeout(() => {
            fileInput = document.getElementById('csv-file');
            uploadArea = document.getElementById('upload-area');
            uploadBtn = document.getElementById('upload-btn');
            
            console.log('🔍 Upload elements check (retry):', {
                fileInput: !!fileInput,
                uploadArea: !!uploadArea,
                uploadBtn: !!uploadBtn
            });
            
            // Set up the remaining listeners
            if (fileInput && !fileInput.hasAttribute('data-listener-added')) {
                fileInput.addEventListener('change', handleFileSelect);
                fileInput.setAttribute('data-listener-added', 'true');
                console.log('✅ File input listener added (retry)');
            }
            
            if (uploadBtn && !uploadBtn.hasAttribute('data-listener-added')) {
                uploadBtn.addEventListener('click', uploadCSV);
                uploadBtn.setAttribute('data-listener-added', 'true');
                console.log('✅ Upload button listener added (retry)');
            }
        }, 100);
    }
    
    if (uploadArea) {
        uploadArea.addEventListener('click', () => {
            console.log('📁 Upload area clicked');
            if (fileInput) {
                fileInput.click();
            } else {
                console.log('❌ File input not found when upload area clicked');
            }
        });
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('drop', handleDrop);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        console.log('✅ Upload area listeners added');
    } else {
        console.log('❌ Upload area not found');
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
        console.log('✅ File input change listener added');
    } else {
        console.log('❌ File input not found - this will cause upload issues');
    }
    
    if (uploadBtn) {
        uploadBtn.addEventListener('click', uploadCSV);
        console.log('✅ Upload button listener added');
    } else {
        console.log('❌ Upload button not found');
    }
    
    // Forms
    const manualForm = document.getElementById('manual-item-form');
    if (manualForm) {
        manualForm.addEventListener('submit', addManualItem);
    }
    
    const projectForm = document.getElementById('project-form');
    if (projectForm) {
        projectForm.addEventListener('submit', createProject);
    }
    
    const listingActionForm = document.getElementById('listing-action-form');
    if (listingActionForm) {
        listingActionForm.addEventListener('submit', handleListingAction);
    }
    
    // Search and filters
    const searchInput = document.getElementById('search-inventory');
    if (searchInput) {
        searchInput.addEventListener('input', displayInventory);
    }
    
    ['project-filter', 'category-filter', 'inventory-type-filter', 'listing-type-filter', 'current-project'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => {
                if (id === 'current-project') {
                    // Sync current-project with project-filter
                    const projectFilter = document.getElementById('project-filter');
                    if (projectFilter && element.value) {
                        projectFilter.value = element.value;
                    }
                }
                loadInventory();
            });
        }
    });
    
    // Listing type change handler (removed internal transfer logic)
    const listingTypeSelect = document.getElementById('listing-type');
    if (listingTypeSelect) {
        listingTypeSelect.addEventListener('change', function() {
            // No special handling needed anymore
        });
    }
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
        }
    });
}

// Tab switching function
function showTab(tabId) {
    console.log('🔄 Switching to tab:', tabId);
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
        console.log('✅ Tab activated:', tabId);
        
        // Add active class to corresponding button based on onclick attribute
        const buttons = document.querySelectorAll('.tab-btn');
        buttons.forEach((btn) => {
            const onclickAttr = btn.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes(`'${tabId}'`)) {
                btn.classList.add('active');
                console.log('✅ Button activated for tab:', tabId);
            }
        });
        
        // Special handling for different tabs
        if (tabId === 'notifications-tab') {
            console.log('📬 Loading notifications for notifications tab...');
            loadNotifications();
            // Hide notification badge after viewing
            setTimeout(() => {
                const badge = document.getElementById('notification-count');
                if (badge) {
                    badge.style.display = 'none';
                }
            }, 500);
        } else if (tabId === 'inventory-tab') {
            console.log('📦 Refreshing inventory for inventory tab...');
            loadInventory();
            updateStats();
        } else if (tabId === 'orders-tab') {
            console.log('🛒 Loading order requests for orders tab...');
            loadOrderRequests();
        } else if (tabId === 'history-tab') {
            console.log('📜 Loading transaction history for history tab...');
            loadTransactionHistory();
        }
    } else {
        console.error('❌ Tab not found:', tabId);
        // Log all available tabs for debugging
        const allTabs = document.querySelectorAll('.tab-content');
        console.log('Available tabs:', Array.from(allTabs).map(t => t.id));
    }
}

// File handling functions (same as before but enhanced)
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            document.getElementById('csv-file').files = files;
            handleFileSelect();
        } else {
            showNotification('Please upload a CSV file', 'error');
        }
    }
}

function handleFileSelect() {
    console.log('📁 File selected - updating display...');
    
    const fileInput = document.getElementById('csv-file');
    const uploadBtn = document.getElementById('upload-btn');
    const uploadArea = document.getElementById('upload-area');
    
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        selectedFile = file; // Store globally
        const fileIcon = getFileIcon(file);
        const fileType = getFileTypeDisplay(file);
        
        console.log('📁 File details:', {
            name: file.name,
            type: file.type,
            size: file.size
        });
        console.log('✅ File stored globally for upload');
        
        // Update the upload area but preserve the file input
        uploadArea.innerHTML = `
            <div class="upload-content">
                <i class="${fileIcon}"></i>
                <h3>${file.name}</h3>
                <p>${fileType} - Ready to upload</p>
            </div>
            <input type="file" id="csv-file" accept=".csv,.xlsx,.xls,.pdf,.zip" style="display: none;">
        `;
        
        // Re-attach event listeners to the new file input
        const newFileInput = document.getElementById('csv-file');
        if (newFileInput) {
            newFileInput.addEventListener('change', handleFileSelect);
            console.log('✅ File input recreated with event listener');
        }
        
        // Also re-attach upload area click listener
        const newUploadArea = document.getElementById('upload-area');
        if (newUploadArea) {
            newUploadArea.addEventListener('click', () => {
                console.log('📁 Upload area clicked (after file select)');
                const currentFileInput = document.getElementById('csv-file');
                if (currentFileInput) {
                    currentFileInput.click();
                }
            });
        }
        
        if (uploadBtn) {
            uploadBtn.disabled = false;
            console.log('✅ Upload button enabled');
        }
    }
}

function getFileIcon(file) {
    const ext = file.name.toLowerCase().split('.').pop();
    switch(ext) {
        case 'csv': return 'fas fa-file-csv';
        case 'xlsx':
        case 'xls': return 'fas fa-file-excel';
        case 'pdf': return 'fas fa-file-pdf';
        case 'zip': return 'fas fa-file-archive';
        default: return 'fas fa-file';
    }
}

function getFileTypeDisplay(file) {
    const ext = file.name.toLowerCase().split('.').pop();
    switch(ext) {
        case 'csv': return 'CSV File';
        case 'xlsx': return 'Excel File';
        case 'xls': return 'Excel File (Legacy)';
        case 'pdf': return 'PDF Document';
        case 'zip': return 'ZIP Archive';
        default: return 'File';
    }
}

function isValidFileType(file) {
    const validExtensions = ['csv', 'xlsx', 'xls', 'pdf', 'zip'];
    const ext = file.name.toLowerCase().split('.').pop();
    return validExtensions.includes(ext);
}

// Enhanced file upload supporting CSV, Excel, and PDF
async function uploadCSV() {
    console.log('🔥 UPLOAD BUTTON CLICKED');
    
    const fileInput = document.getElementById('csv-file');
    const currentProject = document.getElementById('current-project');
    const uploadProgress = document.getElementById('upload-progress');
    const uploadBtn = document.getElementById('upload-btn');
    
    console.log('📋 Elements found:', {
        fileInput: !!fileInput,
        currentProject: !!currentProject,
        uploadProgress: !!uploadProgress,
        uploadBtn: !!uploadBtn
    });
    
    // Check for missing elements
    if (!fileInput) {
        console.log('❌ CRITICAL: File input element not found!');
        showNotification('File input not found. Please refresh the page.', 'error');
        return;
    }
    
    if (!currentProject) {
        console.log('❌ CRITICAL: Project selector not found!');
        showNotification('Project selector not found. Please refresh the page.', 'error');
        return;
    }
    
    console.log('👤 Current user:', currentUser);
    
    // Use globally stored file if fileInput is not available
    let file = null;
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
        file = fileInput.files[0];
        console.log('📁 Using file from input element');
    } else if (selectedFile) {
        file = selectedFile;
        console.log('📁 Using globally stored file');
    } else {
        console.log('❌ No file selected');
        showNotification('Please select a file', 'error');
        return;
    }
    
    const selectedProject = currentProject.value;
    console.log('🏗️ Selected project:', selectedProject);
    
    if (!selectedProject) {
        console.log('❌ No project selected');
        showNotification('Please select a project first', 'error');
        return;
    }
    console.log('📁 Selected file:', {
        name: file.name,
        size: file.size,
        type: file.type
    });
    
    // Validate file type
    if (!isValidFileType(file)) {
        console.log('❌ Invalid file type');
        showNotification('Please upload CSV, Excel (.xlsx/.xls), PDF, or ZIP files only', 'error');
        return;
    }
    
    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
        console.log('❌ File too large');
        showNotification('File size must be less than 50MB', 'error');
        return;
    }
    
    console.log('✅ File validation passed');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sellerId', currentUser.id);
    formData.append('projectId', selectedProject);
    
    console.log('📦 FormData prepared:', {
        sellerId: currentUser.id,
        projectId: selectedProject,
        fileName: file.name
    });
    
    uploadBtn.disabled = true;
    uploadProgress.style.display = 'block';
    
    const fileType = getFileTypeDisplay(file);
    
    // Update progress bar text
    const progressText = uploadProgress.querySelector('p');
    progressText.textContent = `Processing ${fileType} file...`;
    
    // Start progress animation
    const progressFill = uploadProgress.querySelector('.progress-fill');
    progressFill.style.width = '20%';
    
    // Create AbortController for timeout (48 seconds - Render free tier has 50s limit)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('⏱️ Request timeout - aborting (48s limit reached)');
    }, 48000); // 48 seconds to allow time for server response before Render's 50s limit
    
    try {
        console.log('🌐 Sending request to /api/upload-file...');
        
        const response = await fetch('/api/upload-file', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId); // Clear timeout if request completes successfully
        
        console.log('📡 Response received:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            contentType: response.headers.get('content-type')
        });
        
        // Check if response is ok
        if (!response.ok) {
            // Try to get error message from response
            let errorData;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                try {
                    errorData = await response.json();
                } catch (jsonError) {
                    console.error('Failed to parse error response as JSON:', jsonError);
                    const text = await response.text();
                    throw new Error(`Server error (${response.status}): ${text || response.statusText}`);
                }
            } else {
                const text = await response.text();
                throw new Error(`Server error (${response.status}): ${text || response.statusText}`);
            }
            
            throw new Error(errorData?.message || errorData?.error || `Server returned error: ${response.status} ${response.statusText}`);
        }
        
        // Update progress to completion
        progressFill.style.width = '90%';
        progressText.textContent = 'Processing completed, saving to database...';
        
        // Parse JSON response
        let result;
        try {
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Unexpected response format: ${contentType}. Response: ${text.substring(0, 100)}`);
            }
            result = await response.json();
            console.log('📊 Server response:', result);
        } catch (parseError) {
            console.error('❌ Failed to parse response:', parseError);
            throw new Error('Invalid response from server. Please try again.');
        }
        
        // Complete progress
        progressFill.style.width = '100%';
        progressText.textContent = 'Upload completed successfully!';
        
        if (result.success) {
            console.log('✅ Upload successful! Materials imported:', result.count);
            let message = `Successfully imported ${result.count} items from ${fileType}`;
            
            if (result.partialSuccess) {
                message = `Partially successful: ${result.count} items imported, ${result.failedRows} items had errors`;
                
                if (result.errors && result.errors.length > 0) {
                    message += '\n\nFirst few errors:\n';
                    result.errors.slice(0, 3).forEach(error => {
                        message += '• ' + error + '\n';
                    });
                }
            }
            
            showNotification(message, result.partialSuccess ? 'warning' : 'success');
            
            // Wait a moment to show completion, then refresh
            setTimeout(() => {
                loadInventory(); // Refresh inventory
                updateStats(); // Update stats
            }, 1000);
            
            // Reset upload form
            fileInput.value = '';
            document.getElementById('upload-area').innerHTML = `
                <div class="upload-content">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <h3>Drop your file here</h3>
                    <p>or <span class="upload-link">click to browse</span></p>
                    <small>Supports CSV, Excel (.xlsx/.xls), and PDF files</small>
                </div>
            `;
        } else {
            // Show error in progress bar
            progressFill.style.width = '100%';
            progressFill.style.backgroundColor = '#ef4444';
            progressText.textContent = 'Upload failed!';
            
            let errorMessage = 'Error uploading file';
            
            if (result.errors && result.errors.length > 0) {
                errorMessage += ':\n';
                result.errors.slice(0, 5).forEach(error => {
                    errorMessage += '• ' + error + '\n';
                });
                if (result.errors.length > 5) {
                    errorMessage += `... and ${result.errors.length - 5} more errors`;
                }
            } else if (result.error) {
                errorMessage += ': ' + result.error;
            } else if (result.message) {
                errorMessage += ': ' + result.message;
            }
            
            showNotification(errorMessage, 'error');
        }
    } catch (error) {
        clearTimeout(timeoutId); // Make sure to clear timeout
        
        // Show error in progress bar
        progressFill.style.width = '100%';
        progressFill.style.backgroundColor = '#ef4444';
        progressText.textContent = 'Network error occurred!';
        
        let errorMessage = 'Error uploading file';
        
        // Handle specific error types
        if (error.name === 'AbortError' || error.name === 'TimeoutError' || (error.message && error.message.includes('timeout'))) {
            errorMessage = 'Upload timeout: The file is too large or processing takes too long. Try:\n• Splitting the ZIP file into smaller files\n• Compressing files more efficiently\n• Uploading CSV/Excel files instead\n• Contact support if issue persists';
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = 'Network connection error. Please check your internet connection and try again.';
        } else if (error.message) {
            errorMessage = `Error: ${error.message}`;
        } else if (error.toString) {
            errorMessage = `Error: ${error.toString()}`;
        }
        
        showNotification(errorMessage, 'error');
        console.error('Upload error:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
    } finally {
        // Reset progress bar after delay
        setTimeout(() => {
            uploadBtn.disabled = false;
            uploadProgress.style.display = 'none';
            progressFill.style.width = '0%';
            progressFill.style.backgroundColor = '#10b981';
            progressText.textContent = 'Processing your inventory...';
        }, 3000);
    }
}

// Create new project
async function createProject(e) {
    e.preventDefault();
    
    const projectData = {
        sellerId: currentUser.id,
        name: document.getElementById('project-name').value,
        location: document.getElementById('project-location').value,
        description: document.getElementById('project-description').value
    };
    
    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(projectData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Project created successfully', 'success');
            closeProjectModal();
            loadProjects(); // Refresh projects
        } else {
            showNotification('Error creating project', 'error');
        }
    } catch (error) {
        showNotification('Error creating project', 'error');
        console.error('Create project error:', error);
    }
}

// Handle listing action form submission
async function handleListingAction(e) {
    e.preventDefault();
    
    const materialId = document.getElementById('action-material-id').value;
    const listingType = document.getElementById('listing-type').value;
    
    // Handle regular listing type updates (internal transfer removed)
    try {
        const response = await fetch(`/api/materials/${materialId}/listing-type`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ listingType, targetProjectId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Listing updated to ${getStatusText(listingType)}`, 'success');
            closeListingActionModal();
            loadInventory(); // Refresh inventory
        } else {
            showNotification('Error updating listing', 'error');
        }
    } catch (error) {
        showNotification('Error updating listing', 'error');
        console.error('Update listing error:', error);
    }
}

// Add manual item (enhanced with project selection)
async function addManualItem(e) {
    e.preventDefault();
    
    const currentProject = document.getElementById('current-project');
    const selectedProject = currentProject.value;
    
    if (!selectedProject || selectedProject === 'all-projects') {
        showNotification('Please select a specific project to add items', 'error');
        return;
    }
    
    const material = {
        sellerId: currentUser.id,
        projectId: selectedProject,
        material: document.getElementById('item-material').value,
        brand: document.getElementById('item-brand').value,
        category: document.getElementById('item-category').value || 'Other',
        qty: parseInt(document.getElementById('item-qty').value),
        unit: document.getElementById('item-unit').value || 'pcs',
        condition: document.getElementById('item-condition').value,
        mrp: parseFloat(document.getElementById('item-mrp').value) || 0,
        priceToday: parseFloat(document.getElementById('item-price-today').value),
        specs: document.getElementById('item-specs').value,
        photo: (() => {
            // Only use uploaded photos (no URLs)
            return uploadedPhotos.length > 0 ? JSON.stringify(uploadedPhotos) : '';
        })(),
        pricePurchased: 0,
        inventoryValue: 0,
        inventoryType: 'manual',
        listingType: 'resale'
    };
    
    try {
        const response = await fetch('/api/materials', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(material)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Item added successfully', 'success');
            e.target.reset();
            uploadedPhotos = []; // Clear uploaded photos
            updatePhotoPreview(); // Clear preview
            loadInventory(); // Refresh inventory
        } else {
            showNotification('Error adding item', 'error');
        }
    } catch (error) {
        showNotification('Error adding item', 'error');
        console.error('Add item error:', error);
    }
}

// Mark acquired item for sale
async function markAcquiredForSale(materialId) {
    try {
        console.log('🏪 Marking acquired item for sale:', materialId);
        
        const response = await fetch(`/api/materials/${materialId}/listing-type`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                listingType: 'resale',
                acquisitionType: 'purchased' // Change back to purchased so it shows to buyers
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Item marked for sale and visible to buyers', 'success');
            loadInventory(); // Refresh inventory
        } else {
            showNotification('Error marking item for sale', 'error');
        }
    } catch (error) {
        console.error('❌ Error marking for sale:', error);
        showNotification('Error marking item for sale', 'error');
    }
}

// Notification system
let notifications = [];

async function loadNotifications() {
    try {
        // Store previous notification count to detect new notifications
        const previousCount = notifications.length;
        const previousNotificationIds = notifications.map(n => n.id);
        
        // First try to load from server
        const response = await fetch(`/api/notifications/${currentUser.id}`);
        if (response.ok) {
            const result = await response.json();
            notifications = result.notifications || [];
            console.log('Loaded notifications from server:', notifications.length);
            
            // Check if we have new notifications
            const newNotifications = notifications.filter(n => !previousNotificationIds.includes(n.id));
            
            if (newNotifications.length > 0) {
                console.log(`🔔 ${newNotifications.length} new notification(s) received!`);
                
                // Auto-refresh inventory when new notifications arrive
                console.log('🔄 Auto-refreshing inventory due to new notifications...');
                await loadInventory();
                updateStats();
                
                // Note: Popup notifications disabled - notifications available in notifications tab
            }
            
        } else {
            console.log('Failed to load notifications from server, using localStorage fallback');
            // Fallback to localStorage
            const savedNotifications = localStorage.getItem(`greenscore-notifications-${currentUser.id}`);
            notifications = savedNotifications ? JSON.parse(savedNotifications) : [];
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        // Fallback to localStorage
        const savedNotifications = localStorage.getItem(`greenscore-notifications-${currentUser.id}`);
        notifications = savedNotifications ? JSON.parse(savedNotifications) : [];
    }
    
    updateNotificationDisplay();
    updateNotificationBadge();
}

function saveNotifications() {
    localStorage.setItem(`greenscore-notifications-${currentUser.id}`, JSON.stringify(notifications));
}

function addNotification(title, message, type = 'sale') {
    const notification = {
        id: Date.now().toString(),
        title,
        message,
        type,
        timestamp: new Date().toISOString(),
        read: false
    };
    
    notifications.unshift(notification);
    saveNotifications();
    updateNotificationDisplay();
    updateNotificationBadge();
}

async function markNotificationRead(notificationId) {
    try {
        // Mark as read on server
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            // Update local state
            const notification = notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
                updateNotificationDisplay();
                updateNotificationBadge();
            }
        } else {
            console.error('Failed to mark notification as read on server');
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function markAllNotificationsRead() {
    try {
        // Mark all as read on server
        const response = await fetch(`/api/notifications/${currentUser.id}/mark-all-read`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            // Update local state
            notifications.forEach(n => n.read = true);
            updateNotificationDisplay();
            updateNotificationBadge();
        } else {
            console.error('Failed to mark all notifications as read on server');
        }
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
}

function clearAllNotifications() {
    notifications = [];
    saveNotifications();
    updateNotificationDisplay();
    updateNotificationBadge();
}

// Show alert for new notifications and auto-refresh inventory
function showNotificationAlert(count) {
    // Remove any existing notification alerts first
    const existingAlerts = document.querySelectorAll('#notification-alert');
    existingAlerts.forEach(alert => {
        if (alert.hideTimeout) clearTimeout(alert.hideTimeout);
        alert.remove();
    });
    
    // Create new notification alert
    const alert = document.createElement('div');
    alert.id = 'notification-alert';
    alert.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 12px 20px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        z-index: 2000;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        transform: translateX(400px);
        opacity: 0;
        transition: all 0.4s ease;
        cursor: pointer;
        border: 2px solid rgba(255, 255, 255, 0.2);
    `;
    document.body.appendChild(alert);
    
    // Click to dismiss
    alert.addEventListener('click', () => {
        if (alert.hideTimeout) clearTimeout(alert.hideTimeout);
        alert.style.transform = 'translateX(400px)';
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 400);
    });
    
    // Update content
    alert.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-bell" style="animation: ring 0.5s ease-in-out 3;"></i>
            <div>
                <div style="font-weight: 700;">New Sale!</div>
                <div style="font-size: 12px; opacity: 0.9;">
                    ${count} item${count > 1 ? 's' : ''} sold • Inventory updated
                </div>
            </div>
        </div>
    `;
    
    // Add animation keyframes if not already added
    if (!document.getElementById('notification-animations')) {
        const style = document.createElement('style');
        style.id = 'notification-animations';
        style.textContent = `
            @keyframes ring {
                0%, 100% { transform: rotate(0deg); }
                25% { transform: rotate(15deg); }
                75% { transform: rotate(-15deg); }
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Clear any existing timeout
    if (alert.hideTimeout) {
        clearTimeout(alert.hideTimeout);
    }
    
    // Show alert with animation
    setTimeout(() => {
        alert.style.transform = 'translateX(0)';
        alert.style.opacity = '1';
        alert.style.animation = 'pulse 2s ease-in-out 2';
    }, 100);
    
    // Auto-hide after 5 seconds and store timeout reference
    alert.hideTimeout = setTimeout(() => {
        alert.style.transform = 'translateX(400px)';
        alert.style.opacity = '0';
        // Clean up after animation completes
        setTimeout(() => {
            if (alert && alert.parentNode) {
                alert.remove();
            }
        }, 400);
    }, 5000);
}

function updateNotificationBadge() {
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notification-count');
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'inline';
    } else {
        badge.style.display = 'none';
    }
}

function updateNotificationDisplay() {
    const container = document.getElementById('notifications-list');
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="no-notifications">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications</p>
                <small>Sales notifications will appear here when buyers purchase your items</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notifications.map(notification => `
        <div class="notification-item ${!notification.read ? 'unread' : ''}" onclick="markNotificationRead('${notification.id}')">
            <div class="notification-icon">
                <i class="fas ${getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${formatNotificationTime(notification.created_at || notification.timestamp)}</div>
                ${notification.read ? '' : '<div class="notification-status">New</div>'}
            </div>
        </div>
    `).join('');
}

function getNotificationIcon(type) {
    switch (type) {
        case 'sale': return 'fa-rupee-sign';
        case 'transfer': return 'fa-exchange-alt';
        case 'system': return 'fa-info-circle';
        default: return 'fa-bell';
    }
}

function formatNotificationTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// Simulate receiving sale notification (this would normally come from server)
function simulateSaleNotification(materialName, quantity, totalPrice, buyerInfo) {
    const title = '🎉 Item Sold!';
    const message = `${quantity}x ${materialName} sold for ₹${totalPrice}`;
    addNotification(title, message, 'sale');
}

// Test notification function (for demo purposes)
function testNotification() {
    console.log('🧪 Testing notification system...');
    
    // Add a test notification directly to the array
    const testNotificationObj = {
        id: Date.now().toString(),
        title: '🎉 Test Sale!',
        message: 'Your Wash Basin Counter was sold for ₹1648',
        type: 'sale',
        timestamp: new Date().toISOString(),
        read: false
    };
    
    notifications.unshift(testNotificationObj);
    updateNotificationDisplay();
    updateNotificationBadge();
    
    console.log('✅ Test notification added successfully');
    console.log('📊 Current notifications:', notifications.length);
}

// Debug function to check tab elements
function debugTabs() {
    console.log('🔍 DEBUGGING TAB ELEMENTS:');
    
    // Check tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    console.log('📋 Tab buttons found:', tabButtons.length);
    tabButtons.forEach((btn, index) => {
        console.log(`  Button ${index}: "${btn.textContent.trim()}" - Active: ${btn.classList.contains('active')}`);
    });
    
    // Check tab content divs
    const tabContents = document.querySelectorAll('.tab-content');
    console.log('📄 Tab content divs found:', tabContents.length);
    tabContents.forEach((content, index) => {
        console.log(`  Content ${index}: ID="${content.id}" - Active: ${content.classList.contains('active')}`);
    });
    
    // Check notification specific elements
    const notificationsList = document.getElementById('notifications-list');
    const notificationBadge = document.getElementById('notification-count');
    console.log('🔔 Notification elements:');
    console.log('  notifications-list:', !!notificationsList);
    console.log('  notification-count:', !!notificationBadge);
    
    return {
        tabButtons: tabButtons.length,
        tabContents: tabContents.length,
        notificationsList: !!notificationsList,
        notificationBadge: !!notificationBadge
    };
}

// Auto-refresh system
let refreshInterval = null;
let isPageVisible = true;
let lastRefreshTime = Date.now();

function setupAutoRefresh() {
    console.log('🔄 Setting up auto-refresh system...');
    
    // Refresh when page becomes visible (user switches back to tab)
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            isPageVisible = false;
            console.log('📱 Page hidden - pausing auto-refresh');
            if (refreshInterval) {
                clearInterval(refreshInterval);
                refreshInterval = null;
            }
        } else {
            isPageVisible = true;
            console.log('📱 Page visible - resuming auto-refresh');
            
            // Refresh immediately if it's been more than 30 seconds
            const timeSinceLastRefresh = Date.now() - lastRefreshTime;
            if (timeSinceLastRefresh > 30000) {
                console.log('⏰ Refreshing data after tab switch...');
                refreshAllData();
            }
            
            // Start periodic refresh
            startPeriodicRefresh();
        }
    });
    
    // Start initial periodic refresh
    startPeriodicRefresh();
}

function startPeriodicRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    // Refresh every 15 seconds when page is visible for real-time order updates
    refreshInterval = setInterval(() => {
        if (isPageVisible) {
            console.log('🔄 Periodic refresh...');
            refreshAllData();
        }
    }, 15000); // Reduced to 15 seconds for more real-time updates
    
    console.log('✅ Periodic refresh started (15 second intervals)');
}

async function refreshAllData() {
    try {
        showRefreshIndicator(true);
        
        // Refresh all data in parallel for better performance
        const promises = [
            loadInventory(),
            loadNotifications(),
            loadProjects()
        ];
        
        // Also refresh order requests if that tab is active
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'order-requests-tab') {
            promises.push(loadOrderRequests());
        }
        
        await Promise.all(promises);
        
        lastRefreshTime = Date.now();
        console.log('✅ Data refresh completed');
        
        // Show brief success indicator
        setTimeout(() => showRefreshIndicator(false, 'success'), 500);
        
    } catch (error) {
        console.error('❌ Error refreshing data:', error);
        showRefreshIndicator(false, 'error');
    }
}

function showRefreshIndicator(isLoading, status = null) {
    let indicator = document.getElementById('refresh-indicator');
    
    if (!indicator) {
        // Create refresh indicator if it doesn't exist
        indicator = document.createElement('div');
        indicator.id = 'refresh-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            z-index: 1000;
            transition: all 0.3s ease;
            transform: translateY(-100px);
            opacity: 0;
        `;
        document.body.appendChild(indicator);
    }
    
    if (isLoading) {
        indicator.innerHTML = '<i class="fas fa-sync fa-spin"></i> Refreshing...';
        indicator.style.background = '#6b7280';
        indicator.style.transform = 'translateY(0)';
        indicator.style.opacity = '1';
    } else if (status === 'success') {
        indicator.innerHTML = '<i class="fas fa-check"></i> Updated';
        indicator.style.background = '#10b981';
        indicator.style.transform = 'translateY(0)';
        indicator.style.opacity = '1';
        
        // Hide after 2 seconds
        setTimeout(() => {
            indicator.style.transform = 'translateY(-100px)';
            indicator.style.opacity = '0';
        }, 2000);
    } else if (status === 'error') {
        indicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
        indicator.style.background = '#ef4444';
        indicator.style.transform = 'translateY(0)';
        indicator.style.opacity = '1';
        
        // Hide after 3 seconds
        setTimeout(() => {
            indicator.style.transform = 'translateY(-100px)';
            indicator.style.opacity = '0';
        }, 3000);
    } else {
        indicator.style.transform = 'translateY(-100px)';
        indicator.style.opacity = '0';
    }
}

// Manual refresh function
function manualRefresh() {
    console.log('🔄 Manual refresh triggered');
    refreshAllData();
}

// Make functions available globally
window.testNotification = testNotification;
window.debugTabs = debugTabs;
window.refreshAllData = refreshAllData;
window.manualRefresh = manualRefresh;

// Show transfer history
async function showTransferHistory() {
    if (!currentUser) return;
    
    try {
        console.log('📋 Loading transfer history...');
        const response = await fetch(`/api/internal-transfers/${currentUser.id}`);
        const transfers = await response.json();
        
        console.log('✅ Transfer history loaded:', transfers.length);
        
        if (transfers.length === 0) {
            showNotification('No transfer history found', 'info');
            return;
        }
        
        // Display transfers in console for now (could create a modal later)
        console.table(transfers);
        showNotification(`Found ${transfers.length} transfers. Check console for details.`, 'success');
        
    } catch (error) {
        console.error('❌ Error loading transfer history:', error);
        showNotification('Error loading transfer history', 'error');
    }
}

function showNotification(message, type = 'success') {
    // Professional mode: Only log to console, no popup notifications
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Order subtab management
function showOrderSubtab(subtab) {
    // Hide all subtab contents
    document.querySelectorAll('.order-subtab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active from all subtab buttons
    document.querySelectorAll('.order-subtab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected subtab
    if (subtab === 'requests') {
        document.getElementById('order-requests-section').classList.add('active');
    } else if (subtab === 'history') {
        document.getElementById('order-history-section').classList.add('active');
        loadOrderHistory(); // Auto-load history when tab is opened
    }
    
    // Set active button
    event.target.classList.add('active');
}

// Load order history
async function loadOrderHistory() {
    try {
        const response = await fetch(`/api/seller/${currentUser.id}/orders`);
        if (!response.ok) throw new Error('Failed to fetch order history');
        
        const orders = await response.json();
        displayOrderHistory(orders);
    } catch (error) {
        console.error('Error loading order history:', error);
        document.getElementById('order-history-list').innerHTML = `
            <div class="no-orders">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading order history</p>
                <small>${error.message}</small>
            </div>
        `;
    }
}

// Display order history
function displayOrderHistory(orders) {
    const historyList = document.getElementById('order-history-list');
    const statusFilter = document.getElementById('history-status-filter')?.value || 'all';
    
    // Filter orders
    let filteredOrders = orders;
    if (statusFilter !== 'all') {
        filteredOrders = orders.filter(order => order.status === statusFilter);
    }
    
    if (filteredOrders.length === 0) {
        historyList.innerHTML = `
            <div class="no-orders">
                <i class="fas fa-history"></i>
                <p>No orders found</p>
                <small>Completed orders will appear here</small>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = filteredOrders.map(order => {
        const isTransfer = order.buyer_company === 'Internal Transfer';
        
        // Parse photo - could be single string or JSON array
        let photos = [];
        if (order.photo) {
            try {
                photos = JSON.parse(order.photo);
                if (!Array.isArray(photos)) photos = [order.photo];
            } catch {
                photos = [order.photo];
            }
        }
        const firstPhoto = photos.length > 0 ? photos[0] : null;
        
        return `
        <div class="order-history-item ${isTransfer ? 'internal-transfer' : ''}" style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 15px; background: white;">
            <div style="display: grid; grid-template-columns: 150px 1fr; gap: 20px;">
                ${firstPhoto ? `
                <div style="width: 150px; height: 150px; border-radius: 8px; overflow: hidden; background: #f3f4f6; border: 1px solid #e5e7eb;">
                    <img src="${firstPhoto}" alt="${order.material_name}" style="width: 100%; height: 100%; object-fit: contain; padding: 8px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div style="display:none; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#9ca3af;">
                        <i class="fas fa-image" style="font-size:1.5rem; margin-bottom:0.5rem; opacity: 0.5;"></i>
                        <span style="font-size: 0.75rem;">No Image</span>
                    </div>
                </div>
                ` : `
                <div style="width: 150px; height: 150px; border-radius: 8px; background: #f3f4f6; border: 1px solid #e5e7eb; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#9ca3af;">
                    <i class="fas fa-image" style="font-size:1.5rem; margin-bottom:0.5rem; opacity: 0.5;"></i>
                    <span style="font-size: 0.75rem;">No Image</span>
                </div>
                `}
                <div>
                    <div class="order-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div>
                            <h4 style="margin: 0 0 4px 0;">${isTransfer ? 'Transfer' : 'Order'} #${order.id.substring(0, 8)}</h4>
                            <span class="status-badge status-${order.status}">
                                ${isTransfer ? 'INTERNAL TRANSFER' : order.status.toUpperCase()}
                            </span>
                        </div>
                        <div class="order-date">
                            <small>${formatDateTime(order.created_at)}</small>
                        </div>
                    </div>
                    <div class="order-details">
                        <p style="margin: 4px 0;"><strong>Material:</strong> ${order.material_name}</p>
                        ${order.brand ? `<p style="margin: 4px 0;"><strong>Brand:</strong> ${order.brand}</p>` : ''}
                        ${order.category ? `<p style="margin: 4px 0;"><strong>Category:</strong> ${order.category}</p>` : ''}
                        ${order.condition ? `<p style="margin: 4px 0;"><strong>Condition:</strong> ${order.condition.charAt(0).toUpperCase() + order.condition.slice(1)}</p>` : ''}
                        <p style="margin: 4px 0;"><strong>Quantity:</strong> ${order.quantity} ${order.unit || 'units'}</p>
                        ${order.dimensions ? `<p style="margin: 4px 0;"><strong>Dimensions:</strong> ${order.dimensions}</p>` : ''}
                        ${order.weight ? `<p style="margin: 4px 0;"><strong>Weight:</strong> ${order.weight} kg</p>` : ''}
                        ${order.specs ? `<p style="margin: 4px 0;"><strong>Specifications:</strong> ${order.specs.substring(0, 100)}${order.specs.length > 100 ? '...' : ''}</p>` : ''}
                        ${!isTransfer ? `<p style="margin: 4px 0;"><strong>Total Amount:</strong> ${formatIndianCurrency(order.total_amount)}</p>` : ''}
                        ${order.mrp ? `<p style="margin: 4px 0;"><strong>MRP:</strong> ₹${order.mrp}</p>` : ''}
                        ${isTransfer ? 
                            `<p style="margin: 4px 0;"><strong>From Project:</strong> ${order.buyer_contact_person || 'N/A'}</p>
                             <p style="margin: 4px 0;"><strong>To Project:</strong> ${order.shipping_address || 'N/A'}</p>` :
                            `<p style="margin: 4px 0;"><strong>Buyer:</strong> ${order.buyer_name} (${order.buyer_company || 'N/A'})</p>
                             ${order.shipping_address ? `<p style="margin: 4px 0;"><strong>Shipping:</strong> ${order.shipping_address}</p>` : ''}`
                        }
                        ${order.delivery_notes ? `<p style="margin: 4px 0;"><strong>Notes:</strong> ${order.delivery_notes}</p>` : ''}
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// Export order history
async function exportOrderHistory() {
    try {
        window.location.href = `/api/seller/${currentUser.id}/orders/export`;
        showNotification('Exporting order history...', 'success');
    } catch (error) {
        console.error('Error exporting order history:', error);
        showNotification('Failed to export order history', 'error');
    }
}

// Slideshow control functions
function changeSlide(materialId, direction) {
    const slideshow = document.querySelector(`[data-material-id="${materialId}"] .slideshow-container`);
    if (!slideshow) return;
    
    const images = slideshow.querySelectorAll('.slideshow-image');
    const indicators = document.querySelectorAll(`[data-material-id="${materialId}"] .indicator`);
    
    let currentIndex = Array.from(images).findIndex(img => img.classList.contains('active'));
    if (currentIndex === -1) currentIndex = 0;
    
    // Remove active class from current
    images[currentIndex].classList.remove('active');
    if (indicators[currentIndex]) indicators[currentIndex].classList.remove('active');
    
    // Calculate new index
    let newIndex = currentIndex + direction;
    if (newIndex >= images.length) newIndex = 0;
    if (newIndex < 0) newIndex = images.length - 1;
    
    // Add active class to new
    images[newIndex].classList.add('active');
    if (indicators[newIndex]) indicators[newIndex].classList.add('active');
}

function goToSlide(materialId, index) {
    const slideshow = document.querySelector(`[data-material-id="${materialId}"] .slideshow-container`);
    if (!slideshow) return;
    
    const images = slideshow.querySelectorAll('.slideshow-image');
    const indicators = document.querySelectorAll(`[data-material-id="${materialId}"] .indicator`);
    
    // Remove all active classes
    images.forEach(img => img.classList.remove('active'));
    indicators.forEach(ind => ind.classList.remove('active'));
    
    // Add active to specified index
    if (images[index]) images[index].classList.add('active');
    if (indicators[index]) indicators[index].classList.add('active');
}

// Store uploaded photos
let uploadedPhotos = [];

// Trigger photo upload - single function for both camera and gallery
function triggerPhotoUpload() {
    // This will open camera on mobile (due to capture attribute) or file picker on desktop
    // On mobile, users get option to choose between camera and gallery
    document.getElementById('photo-input').click();
}

// Handle photo file uploads
async function handlePhotoFiles(input) {
    const files = Array.from(input.files);
    const previewGrid = document.getElementById('photo-preview-grid');
    
    for (const file of files) {
        if (file.type.startsWith('image/')) {
            // Convert to base64 for preview and storage
            const reader = new FileReader();
            reader.onload = function(e) {
                const photoData = e.target.result;
                uploadedPhotos.push(photoData);
                
                // Add preview
                const preview = document.createElement('div');
                preview.className = 'photo-preview-item';
                preview.innerHTML = `
                    <img src="${photoData}" alt="Preview">
                    <button type="button" class="remove-photo" onclick="removeUploadedPhoto(${uploadedPhotos.length - 1})">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                previewGrid.appendChild(preview);
            };
            reader.readAsDataURL(file);
        }
    }
    
    // Clear the input for next selection
    input.value = '';
}

// Remove uploaded photo
function removeUploadedPhoto(index) {
    uploadedPhotos.splice(index, 1);
    updatePhotoPreview();
}

// Update photo preview grid
function updatePhotoPreview() {
    const previewGrid = document.getElementById('photo-preview-grid');
    previewGrid.innerHTML = '';
    
    uploadedPhotos.forEach((photo, index) => {
        const preview = document.createElement('div');
        preview.className = 'photo-preview-item';
        preview.innerHTML = `
            <img src="${photo}" alt="Preview">
            <button type="button" class="remove-photo" onclick="removeUploadedPhoto(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        previewGrid.appendChild(preview);
    });
}

// Removed URL input functions - no longer needed

// Make functions globally available
window.showTab = showTab;
window.showOrderSubtab = showOrderSubtab;
window.loadOrderHistory = loadOrderHistory;
window.exportOrderHistory = exportOrderHistory;
window.editMaterial = editMaterial;
window.closeEditModal = closeEditModal;
window.cancelEdit = cancelEdit;
window.setView = setView;
window.toggleDropdown = toggleDropdown;
window.updateListingType = updateListingType;
window.showListingActionModal = showListingActionModal;
window.closeListingActionModal = closeListingActionModal;
window.changeSlide = changeSlide;
window.goToSlide = goToSlide;
window.triggerPhotoUpload = triggerPhotoUpload;
window.handlePhotoFiles = handlePhotoFiles;
window.removeUploadedPhoto = removeUploadedPhoto;
window.triggerEditPhotoUpload = triggerEditPhotoUpload;
window.handleEditPhotoFiles = handleEditPhotoFiles;
window.removeEditPhoto = removeEditPhoto;
window.viewMaterialDetail = viewMaterialDetail;
window.closeMaterialDetailModal = closeMaterialDetailModal;
window.changeDetailSlide = changeDetailSlide;
window.goToDetailSlide = goToDetailSlide;
window.toggleUserProfile = toggleUserProfile;
window.openAccountPage = openAccountPage;
window.closeAccountModal = closeAccountModal;
window.markAcquiredForSale = markAcquiredForSale;
window.markAllNotificationsRead = markAllNotificationsRead;
window.clearAllNotifications = clearAllNotifications;
window.markNotificationRead = markNotificationRead;

// Debug function to check elements
function debugElements() {
    console.log('🔍 DEBUGGING ELEMENTS:');
    const elements = {
        'csv-file': document.getElementById('csv-file'),
        'current-project': document.getElementById('current-project'),
        'upload-btn': document.getElementById('upload-btn'),
        'upload-area': document.getElementById('upload-area'),
        'upload-progress': document.getElementById('upload-progress')
    };
    
    Object.keys(elements).forEach(key => {
        const element = elements[key];
        console.log(`${key}:`, {
            exists: !!element,
            id: element?.id,
            tagName: element?.tagName,
            className: element?.className
        });
    });
    
    return elements;
}

// Order Request Management Functions
async function loadOrderRequests() {
    console.log('📋 loadOrderRequests called - currentUser:', currentUser);
    try {
        if (!currentUser || !currentUser.id) {
            console.error('❌ No current user found');
            const ordersList = document.getElementById('orders-list');
            if (ordersList) {
                ordersList.innerHTML = `
                    <div class="no-orders">
                        <i class="fas fa-shopping-cart"></i>
                        <p>Please log in to view order requests</p>
                    </div>
                `;
            }
            return;
        }
        
        console.log('🛒 Loading order requests for seller:', currentUser.id);
        const response = await fetch(`/api/seller/${currentUser.id}/order-requests`);
        const result = await response.json();
        
        if (result.success) {
            orderRequests = result.requests;
            console.log(`✅ Loaded ${orderRequests.length} order requests`);
            displayOrderRequests();
            updateOrdersBadge();
        } else {
            console.error('❌ Failed to load order requests:', result);
        }
    } catch (error) {
        console.error('❌ Error loading order requests:', error);
        const ordersList = document.getElementById('orders-list');
        if (ordersList) {
            ordersList.innerHTML = `
                <div class="no-orders">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading order requests</p>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }
}

function displayOrderRequests() {
    const ordersList = document.getElementById('orders-list');
    
    if (orderRequests.length === 0) {
        ordersList.innerHTML = `
            <div class="no-orders">
                <i class="fas fa-shopping-cart"></i>
                <p>No order requests received</p>
                <small>Order requests from buyers will appear here for your review and approval</small>
            </div>
        `;
        return;
    }
    
    // Group requests by material
    const requestsByMaterial = {};
    orderRequests.forEach(request => {
        if (!requestsByMaterial[request.material_id]) {
            requestsByMaterial[request.material_id] = {
                material: request.material_name,
                listing_id: request.listing_id,
                current_price: request.current_price,
                available_qty: request.available_qty || 0,
                photo: request.photo,
                brand: request.brand,
                category: request.category,
                condition: request.condition,
                specs: request.specs,
                dimensions: request.dimensions,
                weight: request.weight,
                mrp: request.mrp,
                requests: []
            };
        }
        requestsByMaterial[request.material_id].requests.push(request);
    });
    
    const requestsHTML = Object.entries(requestsByMaterial).map(([materialId, materialData]) => {
        const sortedRequests = materialData.requests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const requestCount = sortedRequests.length;
        const totalRequestedQty = sortedRequests.reduce((sum, req) => sum + req.quantity, 0);
        
        // Parse photo - could be single string or JSON array
        let photos = [];
        if (materialData.photo) {
            try {
                photos = JSON.parse(materialData.photo);
                if (!Array.isArray(photos)) photos = [materialData.photo];
            } catch {
                photos = [materialData.photo];
            }
        }
        const firstPhoto = photos.length > 0 ? photos[0] : null;
        
        return `
            <div class="material-request-group" data-material-id="${materialId}" style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px; background: white;">
                <div style="display: grid; grid-template-columns: 200px 1fr; gap: 20px; margin-bottom: 15px;">
                    ${firstPhoto ? `
                    <div style="width: 200px; height: 200px; border-radius: 8px; overflow: hidden; background: #f3f4f6; border: 1px solid #e5e7eb;">
                        <img src="${firstPhoto}" alt="${materialData.material}" style="width: 100%; height: 100%; object-fit: contain; padding: 8px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div style="display:none; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#9ca3af;">
                            <i class="fas fa-image" style="font-size:2rem; margin-bottom:0.5rem; opacity: 0.5;"></i>
                            <span style="font-size: 0.875rem; font-weight: 500;">No Image</span>
                        </div>
                    </div>
                    ` : `
                    <div style="width: 200px; height: 200px; border-radius: 8px; background: #f3f4f6; border: 1px solid #e5e7eb; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#9ca3af;">
                        <i class="fas fa-image" style="font-size:2rem; margin-bottom:0.5rem; opacity: 0.5;"></i>
                        <span style="font-size: 0.875rem; font-weight: 500;">No Image</span>
                    </div>
                    `}
                    <div class="material-header" style="display: flex; flex-direction: column; justify-content: space-between;">
                        <div class="material-info">
                            <h4 style="margin: 0 0 8px 0; color: #1f2937; font-size: 18px;">${materialData.material}</h4>
                            ${materialData.brand ? `<p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">${materialData.brand}</p>` : ''}
                            <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
                                ${materialData.category ? `<span style="padding: 4px 10px; background: #dbeafe; color: #1e40af; border-radius: 12px; font-size: 12px; font-weight: 600;">${materialData.category}</span>` : ''}
                                ${materialData.condition ? `<span style="padding: 4px 10px; background: #fef3c7; color: #92400e; border-radius: 12px; font-size: 12px; font-weight: 600;">${materialData.condition.charAt(0).toUpperCase() + materialData.condition.slice(1)}</span>` : ''}
                                <span class="current-price" style="color: #059669; font-weight: 600;">
                                    <i class="fas fa-rupee-sign"></i> ${materialData.current_price}/unit
                                </span>
                                <span style="color: #3b82f6;">
                                    <i class="fas fa-boxes"></i> Available: ${materialData.available_qty} units
                                </span>
                            </div>
                            ${materialData.specs ? `<p style="margin: 0 0 8px 0; color: #4b5563; font-size: 13px; line-height: 1.5;">${materialData.specs.substring(0, 150)}${materialData.specs.length > 150 ? '...' : ''}</p>` : ''}
                            ${materialData.dimensions ? `<p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;"><strong>Dimensions:</strong> ${materialData.dimensions}</p>` : ''}
                            ${materialData.weight ? `<p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;"><strong>Weight:</strong> ${materialData.weight} kg</p>` : ''}
                            ${materialData.mrp ? `<p style="margin: 0; color: #6b7280; font-size: 12px;"><strong>MRP:</strong> ₹${materialData.mrp}</p>` : ''}
                        </div>
                        <div class="request-summary" style="text-align: right; margin-top: 12px;">
                            <div class="request-count" style="background: #fef3c7; color: #92400e; padding: 6px 12px; border-radius: 20px; font-weight: 600; display: inline-block;">
                                ${requestCount} Buyer${requestCount > 1 ? 's' : ''} Interested
                            </div>
                            <div style="margin-top: 5px;">
                                <small style="color: #6b7280;">Total Requested: ${totalRequestedQty} units</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="buyers-comparison" style="background: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                    <h5 style="margin: 0 0 12px 0; color: #374151; font-size: 14px; font-weight: 600;">
                        <i class="fas fa-users"></i> Buyer Comparison
                    </h5>
                    <div style="display: grid; gap: 10px;">
                        ${sortedRequests.map((request, index) => `
                            <div style="display: grid; grid-template-columns: 30px 1fr auto auto; gap: 15px; align-items: center; padding: 10px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
                                <div style="background: ${index === 0 ? '#10b981' : index === 1 ? '#3b82f6' : '#6b7280'}; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 12px;">
                                    ${index + 1}
                                </div>
                                <div>
                                    <strong style="color: #1f2937;">${request.buyer_name}</strong>
                                    <span style="color: #6b7280; margin-left: 8px;">(${request.buyer_company})</span>
                                    <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                                        <i class="fas fa-phone"></i> ${request.buyer_phone} | 
                                        <i class="fas fa-map-marker-alt"></i> ${request.delivery_address ? request.delivery_address.substring(0, 30) + '...' : 'N/A'}
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: 600; color: #1f2937;">${request.quantity} units</div>
                                    <div style="font-size: 12px; color: #059669;">${formatIndianCurrency(request.total_amount)}</div>
                                </div>
                                <div style="display: flex; gap: 5px;">
                                    <button class="btn btn-success btn-sm" style="padding: 4px 10px; font-size: 12px;" 
                                            onclick="event.stopPropagation(); approveOrderRequest('${request.id}')">
                                        <i class="fas fa-check"></i>
                                    </button>
                                    <button class="btn btn-danger btn-sm" style="padding: 4px 10px; font-size: 12px;"
                                            onclick="event.stopPropagation(); declineOrderRequest('${request.id}')">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="request-actions" style="display: flex; justify-content: space-between; align-items: center;">
                    <button class="btn btn-primary btn-sm" onclick="viewRequestsForMaterial('${materialId}')" 
                            style="background: #3b82f6; border: none; padding: 8px 16px;">
                        <i class="fas fa-expand"></i> View Detailed Comparison
                    </button>
                    <button class="btn btn-success btn-sm" onclick="approveAllForMaterial('${materialId}')"
                            style="background: #10b981; border: none; padding: 8px 16px;">
                        <i class="fas fa-check-double"></i> Approve All (${requestCount})
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    ordersList.innerHTML = `
        <div style="margin-bottom: 20px; padding: 15px; background: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <h3 style="margin: 0 0 5px 0; color: #1e40af; font-size: 16px;">
                <i class="fas fa-info-circle"></i> Order Management Tips
            </h3>
            <p style="margin: 0; color: #3730a3; font-size: 14px;">
                Review buyer details, delivery locations, and quantities. You can approve multiple buyers for the same item. 
                Buyers are ranked by request time (earliest first).
            </p>
        </div>
        ${requestsHTML}
    `;
}

function updateOrdersBadge() {
    const badge = document.getElementById('orders-count');
    const pendingCount = orderRequests.filter(request => request.status === 'pending').length;
    
    if (pendingCount > 0) {
        badge.textContent = pendingCount;
        badge.style.display = 'inline';
    } else {
        badge.style.display = 'none';
    }
}

async function viewRequestsForMaterial(materialId) {
    try {
        const response = await fetch(`/api/material/${materialId}/order-requests`);
        const result = await response.json();
        
        if (result.success) {
            currentMaterialRequests = result.requests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            showMaterialRequestsModal(materialId);
        }
    } catch (error) {
        console.error('Error loading material order requests:', error);
    }
}

function showMaterialRequestsModal(materialId) {
    const material = materials.find(m => m.id === materialId);
    if (!material) return;
    
    // Sort requests by created_at for FCFS display
    currentMaterialRequests.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    document.getElementById('material-info').innerHTML = `
        <div class="material-details">
            <h4>${material.material}</h4>
            <div class="material-meta">
                <span><strong>Price:</strong> ₹${material.priceToday}/unit</span>
                <span><strong>Available Quantity:</strong> ${material.qty} ${material.unit}</span>
            </div>
            ${currentMaterialRequests.length > 0 ? `
                <div class="bulk-actions" style="margin-top: 15px; padding: 10px; background: #f0f9ff; border-radius: 8px;">
                    <button class="btn btn-sm btn-primary" onclick="selectAllRequests()" style="margin-right: 10px;">
                        <i class="fas fa-check-square"></i> Select All
                    </button>
                    <button class="btn btn-sm btn-success" onclick="approveSelectedRequests('${materialId}')" style="margin-right: 10px;">
                        <i class="fas fa-check-double"></i> Approve Selected
                    </button>
                    <button class="btn btn-sm btn-info" onclick="approveAllForMaterial('${materialId}')">
                        <i class="fas fa-check-circle"></i> Approve All (FCFS)
                    </button>
                    <span style="margin-left: 15px; color: #64748b; font-size: 12px;">
                        <i class="fas fa-info-circle"></i> Orders are processed in FCFS order
                    </span>
                </div>
            ` : ''}
        </div>
    `;
    
    const requestsHTML = currentMaterialRequests.length > 0 ? 
        currentMaterialRequests.map((request, index) => `
            <div class="request-item" data-request-id="${request.id}">
                <div class="request-header">
                    <input type="checkbox" class="request-checkbox" value="${request.id}" 
                           style="margin-right: 10px; width: 18px; height: 18px;">
                    <div class="request-rank">#${index + 1}</div>
                    <div class="request-amount">₹${request.unit_price}/unit</div>
                    <div class="request-total">Total: ${formatIndianCurrency(request.total_amount)}</div>
                </div>
                <div class="request-buyer-info">
                    <strong>Buyer:</strong> ${request.buyer_name}<br>
                    <strong>Company:</strong> ${request.buyer_company}<br>
                    <strong>Contact:</strong> ${request.buyer_contact_person} - ${request.buyer_phone}<br>
                    <strong>Email:</strong> ${request.buyer_email}<br>
                    <strong>Quantity:</strong> ${request.quantity} units<br>
                    <strong>Delivery:</strong> ${request.delivery_address}
                    ${request.delivery_notes ? `<br><strong>Notes:</strong> ${request.delivery_notes}` : ''}
                </div>
                <div class="request-date">
                    <small>Requested: ${new Date(request.created_at).toLocaleString()}</small>
                    <small style="color: #10b981; font-weight: bold;">FCFS Priority #${index + 1}</small>
                </div>
                <div class="request-item-actions">
                    <button class="btn btn-sm btn-success" onclick="approveOrderRequest('${request.id}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="declineOrderRequest('${request.id}')">
                        <i class="fas fa-times"></i> Decline
                    </button>
                </div>
            </div>
        `).join('') : '<p>No order requests for this material</p>';
    
    document.getElementById('material-bids-list').innerHTML = requestsHTML;
    
    document.getElementById('material-bids-modal').classList.add('show');
}

function closeMaterialRequestsModal() {
    document.getElementById('material-bids-modal').classList.remove('show');
    currentMaterialRequests = [];
}

async function approveOrderRequest(requestId) {
    try {
        const response = await fetch(`/api/order-requests/${requestId}/approve`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sellerNotes: 'Approved by seller' })
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification('Order request approved successfully!', 'success');
            closeMaterialRequestsModal();
            loadOrderRequests();
            loadInventory(); // Refresh inventory to show updated quantities
        } else {
            showNotification('Failed to approve order request', 'error');
        }
    } catch (error) {
        console.error('Error approving order request:', error);
        showNotification('Error approving order request', 'error');
    }
}

async function declineOrderRequest(requestId) {
    try {
        const response = await fetch(`/api/order-requests/${requestId}/decline`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sellerNotes: 'Declined by seller' })
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification('Order request declined', 'info');
            closeMaterialRequestsModal();
            loadOrderRequests();
        } else {
            showNotification('Failed to decline order request', 'error');
        }
    } catch (error) {
        console.error('Error declining order request:', error);
        showNotification('Error declining order request', 'error');
    }
}

function selectAllRequests() {
    const checkboxes = document.querySelectorAll('.request-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
}

async function approveSelectedRequests(materialId) {
    try {
        const checkboxes = document.querySelectorAll('.request-checkbox:checked');
        if (checkboxes.length === 0) {
            showNotification('Please select at least one request to approve', 'warning');
            return;
        }
        
        const requestIds = Array.from(checkboxes).map(cb => cb.value);
        
        // Use bulk approve endpoint
        const response = await fetch('/api/order-requests/bulk-approve', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                requestIds, 
                sellerNotes: 'Selected for approval by seller' 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show detailed results
            let message = `Processed ${result.totalProcessed} requests: ${result.totalApproved} approved`;
            
            // Check for partial fulfillments
            const partialFulfillments = result.results.filter(r => r.isPartial);
            if (partialFulfillments.length > 0) {
                message += ` (${partialFulfillments.length} partial)`;
            }
            
            showNotification(message, 'success');
            closeMaterialRequestsModal();
            loadOrderRequests();
            loadInventory(); // Refresh inventory
        } else {
            showNotification(result.error || 'Failed to approve selected requests', 'error');
        }
    } catch (error) {
        console.error('Error approving selected requests:', error);
        showNotification('Error approving selected requests', 'error');
    }
}

async function approveAllForMaterial(materialId) {
    try {
        // Get all pending requests for this material, sorted by created_at for FCFS
        const materialRequests = orderRequests
            .filter(req => req.material_id === materialId && req.status === 'pending')
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        if (materialRequests.length === 0) {
            showNotification('No pending requests to approve', 'info');
            return;
        }
        
        const requestIds = materialRequests.map(req => req.id);
        
        // Use bulk approve endpoint
        const response = await fetch('/api/order-requests/bulk-approve', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                requestIds, 
                sellerNotes: 'Bulk approved by seller (FCFS)' 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show detailed results
            let message = `Processed ${result.totalProcessed} requests: ${result.totalApproved} approved`;
            
            // Check for partial fulfillments
            const partialFulfillments = result.results.filter(r => r.isPartial);
            if (partialFulfillments.length > 0) {
                message += ` (${partialFulfillments.length} partial)`;
            }
            
            showNotification(message, 'success');
            closeMaterialRequestsModal();
            loadOrderRequests();
            loadInventory(); // Refresh inventory
        } else {
            showNotification(result.error || 'Failed to approve order requests', 'error');
        }
    } catch (error) {
        console.error('Error approving all requests:', error);
        showNotification('Error approving order requests', 'error');
    }
}

async function approveMaxBid() {
    if (currentMaterialBids.length === 0) return;
    
    const highestBid = currentMaterialBids[0];
    await approveSingleBid(highestBid.id);
}

async function approveMaxBidForMaterial(materialId) {
    try {
        const response = await fetch(`/api/material/${materialId}/bids`);
        const result = await response.json();
        
        if (result.success && result.bids.length > 0) {
            const highestBid = result.bids.sort((a, b) => b.bid_price - a.bid_price)[0];
            await approveSingleBid(highestBid.id);
        }
    } catch (error) {
        console.error('Error approving max bid:', error);
    }
}

async function approveSingleBid(bidId) {
    try {
        const response = await fetch(`/api/bids/${bidId}/approve`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sellerNotes: 'Approved highest bid' })
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification('Bid approved successfully!', 'success');
            closeMaterialBidsModal();
            loadBids();
            loadInventory(); // Refresh inventory to show updated quantities
        } else {
            showNotification('Failed to approve bid', 'error');
        }
    } catch (error) {
        console.error('Error approving bid:', error);
        showNotification('Error approving bid', 'error');
    }
}

async function declineSingleBid(bidId) {
    try {
        const response = await fetch(`/api/bids/${bidId}/decline`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sellerNotes: 'Declined by seller' })
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification('Bid declined', 'info');
            closeMaterialBidsModal();
            loadBids();
        } else {
            showNotification('Failed to decline bid', 'error');
        }
    } catch (error) {
        console.error('Error declining bid:', error);
        showNotification('Error declining bid', 'error');
    }
}

function reviewOrder(orderId) {
    const order = orderRequests.find(o => o.id === orderId);
    if (!order) return;
    
    // Populate order details modal
    document.getElementById('review-order-id').value = orderId;
    document.getElementById('order-details').innerHTML = `
        <div class="order-review-details">
            <h4>Order #${order.id.substring(0, 8)}</h4>
            <div class="buyer-details">
                <h5>Buyer Information</h5>
                <p><strong>Name:</strong> ${order.buyer_name}</p>
                <p><strong>Company:</strong> ${order.buyer_company || 'N/A'}</p>
                <p><strong>Contact Person:</strong> ${order.buyer_contact_person}</p>
                <p><strong>Phone:</strong> ${order.buyer_phone}</p>
                <p><strong>Email:</strong> ${order.buyer_email}</p>
                <p><strong>Delivery Address:</strong> ${order.delivery_address}</p>
                ${order.delivery_notes ? `<p><strong>Delivery Notes:</strong> ${order.delivery_notes}</p>` : ''}
            </div>
            <div class="order-summary">
                <h5>Order Summary</h5>
                <p><strong>Total Amount:</strong> ${formatIndianCurrency(order.total_amount)}</p>
                <p><strong>Platform Fee:</strong> ${formatIndianCurrency(order.platform_fee)}</p>
                <p><strong>Items:</strong> ${order.item_count} item(s)</p>
                <p><strong>Requested:</strong> ${new Date(order.created_at).toLocaleString()}</p>
            </div>
        </div>
    `;
    
    document.getElementById('order-review-modal').classList.add('show');
}

function closeOrderReviewModal() {
    document.getElementById('order-review-modal').classList.remove('show');
    document.getElementById('order-review-form').reset();
}

async function approveOrder() {
    const orderId = document.getElementById('review-order-id').value;
    const sellerNotes = document.getElementById('seller-notes').value;
    
    try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved', sellerNotes })
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification('Order approved successfully!', 'success');
            closeOrderReviewModal();
            loadOrderRequests();
        } else {
            showNotification('Failed to approve order', 'error');
        }
    } catch (error) {
        console.error('Error approving order:', error);
        showNotification('Error approving order', 'error');
    }
}

async function declineOrder() {
    const orderId = document.getElementById('review-order-id').value;
    const sellerNotes = document.getElementById('seller-notes').value;
    
    try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'declined', sellerNotes })
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification('Order declined', 'info');
            closeOrderReviewModal();
            loadOrderRequests();
        } else {
            showNotification('Failed to decline order', 'error');
        }
    } catch (error) {
        console.error('Error declining order:', error);
        showNotification('Error declining order', 'error');
    }
}

// Transaction History Functions
async function loadTransactionHistory() {
    try {
        console.log('📊 Loading transaction history...');
        const response = await fetch(`/api/seller/${currentUser.id}/transactions`);
        const result = await response.json();
        
        if (result.success) {
            transactionHistory = result.transactions;
            displayTransactionHistory();
        }
    } catch (error) {
        console.error('Error loading transaction history:', error);
    }
}

function displayTransactionHistory() {
    const historyList = document.getElementById('history-list');
    
    if (transactionHistory.length === 0) {
        historyList.innerHTML = `
            <div class="no-history">
                <i class="fas fa-history"></i>
                <p>No transaction history</p>
                <small>Your sales, transfers, and listing activities will appear here</small>
            </div>
        `;
        return;
    }
    
    const historyHTML = transactionHistory.map(tx => `
        <div class="transaction-card" data-transaction-id="${tx.id}">
            <div class="transaction-header">
                <div class="transaction-type">
                    <i class="fas ${getTransactionIcon(tx.transaction_type)}"></i>
                    <span class="type-label">${formatTransactionType(tx.transaction_type)}</span>
                </div>
                <div class="transaction-amount">
                    ${tx.total_amount ? formatIndianCurrency(tx.total_amount) : ''}
                </div>
            </div>
            <div class="transaction-details">
                <div class="material-info">
                    <strong>${tx.material_name}</strong>
                </div>
                <div class="transaction-meta">
                    <span>Qty: ${tx.quantity}</span>
                    ${tx.unit_price ? `<span>Unit: ${formatIndianCurrency(tx.unit_price)}</span>` : ''}
                    ${tx.buyer_name ? `<span>Buyer: ${tx.buyer_name}</span>` : ''}
                </div>
                <div class="transaction-date">
                    <small>${new Date(tx.created_at).toLocaleString()}</small>
                </div>
            </div>
        </div>
    `).join('');
    
    historyList.innerHTML = historyHTML;
}

function getTransactionIcon(type) {
    switch (type) {
        case 'sale': return 'fa-shopping-cart';
        case 'internal_transfer': return 'fa-exchange-alt';
        case 'listing_created': return 'fa-plus-circle';
        case 'listing_updated': return 'fa-edit';
        default: return 'fa-circle';
    }
}

function formatTransactionType(type) {
    switch (type) {
        case 'sale': return 'Sale';
        case 'internal_transfer': return 'Internal Transfer';
        case 'listing_created': return 'Listing Created';
        case 'listing_updated': return 'Listing Updated';
        default: return type;
    }
}

async function exportTransactionHistory() {
    try {
        const response = await fetch(`/api/seller/${currentUser.id}/transactions/export`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transaction-history-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showNotification('Transaction history exported successfully!', 'success');
        } else {
            showNotification('Failed to export transaction history', 'error');
        }
    } catch (error) {
        console.error('Error exporting transaction history:', error);
        showNotification('Error exporting transaction history', 'error');
    }
}

// Update the initialization to load new data
const originalInitializeDashboard = initializeDashboard;
initializeDashboard = function() {
    originalInitializeDashboard();
    loadOrderRequests();
    loadTransactionHistory();
};

// Profile Page Functions
let profileOrders = [];
let profileOrderRequests = [];
let profileInventory = [];

function openProfilePage() {
    // Close profile dropdown first
    const menu = document.getElementById('user-profile-menu');
    if (menu) menu.style.display = 'none';
    
    // Load profile data
    loadProfileData();
    
    // Open profile modal
    const modal = document.getElementById('profile-page-modal');
    if (modal) {
        modal.classList.add('show');
        // Switch to overview tab by default
        switchProfileTab('overview');
    }
}

function closeProfilePage() {
    const modal = document.getElementById('profile-page-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

async function loadProfileData() {
    if (!currentUser || !currentUser.id) return;
    
    try {
        // Load user details
        const userResponse = await fetch(`/api/users/${currentUser.id}`);
        if (userResponse.ok) {
            const userResult = await userResponse.json();
            if (userResult.success && userResult.user) {
                populateProfilePage(userResult.user);
            }
        }
        
        // Load sales orders
        const ordersResponse = await fetch(`/api/seller/${currentUser.id}/orders`);
        if (ordersResponse.ok) {
            const orders = await ordersResponse.json();
            profileOrders = Array.isArray(orders) ? orders : [];
            displayProfileOrders();
            updateProfileStats();
        }
        
        // Load order requests
        const requestsResponse = await fetch(`/api/seller/${currentUser.id}/order-requests`);
        if (requestsResponse.ok) {
            const requestsResult = await requestsResponse.json();
            if (requestsResult.success) {
                profileOrderRequests = requestsResult.requests || [];
                displayProfileRequests();
                updateProfileStats();
            }
        }
        
        // Load inventory
        const inventoryResponse = await fetch(`/api/seller/${currentUser.id}/materials`);
        if (inventoryResponse.ok) {
            const inventory = await inventoryResponse.json();
            profileInventory = Array.isArray(inventory) ? inventory : [];
            displayInventorySummary();
        }
    } catch (error) {
        console.error('Error loading profile data:', error);
    }
}

function populateProfilePage(user) {
    document.getElementById('profile-page-name').textContent = user.name || 'User';
    document.getElementById('profile-page-email').textContent = user.email || '-';
    document.getElementById('profile-page-company').textContent = user.company_name || user.companyName || 'Not specified';
    document.getElementById('profile-page-phone').textContent = user.phone || 'Not provided';
    document.getElementById('profile-page-designation').textContent = user.designation || 'Not specified';
    document.getElementById('profile-page-project').textContent = user.project_name || 'Not specified';
    document.getElementById('profile-page-address').textContent = user.address || 'Not provided';
}

function updateProfileStats() {
    const totalOrders = profileOrders.length;
    const completedOrders = profileOrders.filter(o => o.status === 'completed' || o.status === 'delivered' || o.status === 'approved').length;
    const pendingRequests = profileOrderRequests.filter(r => r.status === 'pending').length;
    
    document.getElementById('profile-total-orders').textContent = totalOrders;
    document.getElementById('profile-completed-orders').textContent = completedOrders;
    document.getElementById('profile-pending-requests').textContent = pendingRequests;
    
    // Update tab badges
    const ordersBadge = document.getElementById('orders-count-badge');
    const requestsBadge = document.getElementById('requests-count-badge');
    
    if (ordersBadge) {
        if (totalOrders > 0) {
            ordersBadge.textContent = totalOrders;
            ordersBadge.style.display = 'inline-block';
        } else {
            ordersBadge.style.display = 'none';
        }
    }
    
    if (requestsBadge) {
        if (pendingRequests > 0) {
            requestsBadge.textContent = pendingRequests;
            requestsBadge.style.display = 'inline-block';
        } else {
            requestsBadge.style.display = 'none';
        }
    }
}

function displayProfileOrders() {
    const ordersList = document.getElementById('profile-orders-list');
    const recentOrders = document.getElementById('profile-recent-orders');
    
    if (!ordersList) return;
    
    if (profileOrders.length === 0) {
        ordersList.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #6b7280;">
                <i class="fas fa-shopping-bag" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="font-size: 1.1rem; font-weight: 500;">No sales orders yet</p>
                <p style="margin-top: 0.5rem;">Your completed sales will appear here</p>
            </div>
        `;
        
        if (recentOrders) {
            recentOrders.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #6b7280;">
                    <i class="fas fa-shopping-bag" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                    <p>No recent sales</p>
                </div>
            `;
        }
        return;
    }
    
    // Display all orders
    ordersList.innerHTML = profileOrders.map(order => {
        // Parse photo
        let photos = [];
        if (order.photo) {
            try {
                photos = JSON.parse(order.photo);
                if (!Array.isArray(photos)) photos = [order.photo];
            } catch {
                photos = [order.photo];
            }
        }
        const firstPhoto = photos.length > 0 ? photos[0] : null;
        
        return `
            <div style="background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="display: grid; grid-template-columns: 150px 1fr auto; gap: 1.5rem; align-items: start;">
                    ${firstPhoto ? `
                    <div style="width: 150px; height: 150px; border-radius: 8px; overflow: hidden; background: #f3f4f6; border: 1px solid #e5e7eb;">
                        <img src="${firstPhoto}" alt="${order.material_name}" style="width: 100%; height: 100%; object-fit: contain; padding: 0.5rem;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div style="display:none; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#9ca3af;">
                            <i class="fas fa-image" style="font-size:1.5rem; opacity: 0.5;"></i>
                        </div>
                    </div>
                    ` : `
                    <div style="width: 150px; height: 150px; border-radius: 8px; background: #f3f4f6; border: 1px solid #e5e7eb; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#9ca3af;">
                        <i class="fas fa-image" style="font-size:1.5rem; opacity: 0.5;"></i>
                    </div>
                    `}
                    
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: start; justify-content: space-between; margin-bottom: 0.75rem;">
                            <div>
                                <h4 style="margin: 0 0 0.25rem 0; font-size: 1.125rem; font-weight: 700; color: #1f2937;">${order.material_name}</h4>
                                ${order.brand ? `<p style="margin: 0 0 0.5rem 0; color: #6b7280; font-size: 0.875rem;">${order.brand}</p>` : ''}
                                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
                                    ${order.category ? `<span style="padding: 0.25rem 0.5rem; background: #dbeafe; color: #1e40af; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600;">${order.category}</span>` : ''}
                                    ${order.condition ? `<span style="padding: 0.25rem 0.5rem; background: #fef3c7; color: #92400e; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600;">${order.condition.charAt(0).toUpperCase() + order.condition.slice(1)}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 0.75rem; padding: 0.75rem; background: #f9fafb; border-radius: 8px;">
                            <div>
                                <div style="color: #6b7280; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem;">Order ID</div>
                                <div style="font-size: 0.875rem; font-weight: 500; font-family: monospace;">${order.id.substring(0, 12)}...</div>
                            </div>
                            <div>
                                <div style="color: #6b7280; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem;">Quantity</div>
                                <div style="font-size: 0.875rem; font-weight: 500;">${order.quantity} ${order.unit || 'units'}</div>
                            </div>
                            <div>
                                <div style="color: #6b7280; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem;">Buyer</div>
                                <div style="font-size: 0.875rem; font-weight: 500;">${order.buyer_name}${order.buyer_company ? ` (${order.buyer_company})` : ''}</div>
                            </div>
                            <div>
                                <div style="color: #6b7280; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem;">Order Date</div>
                                <div style="font-size: 0.875rem; font-weight: 500;">${formatDateTime(order.created_at)}</div>
                            </div>
                        </div>
                        
                        ${order.shipping_address ? `
                        <div style="margin-top: 0.75rem; padding: 0.75rem; background: #ecfdf5; border-radius: 8px; border-left: 3px solid #10b981;">
                            <div style="color: #065f46; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem;">Shipping Address</div>
                            <div style="color: #047857; font-size: 0.875rem; line-height: 1.5;">${order.shipping_address}</div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div style="text-align: right; min-width: 150px;">
                        <div style="margin-bottom: 0.75rem;">
                            <span class="status-badge status-${order.status}" style="font-size: 0.875rem; padding: 0.5rem 1rem;">
                                ${order.status.toUpperCase()}
                            </span>
                        </div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: #059669; margin-bottom: 0.5rem;">
                            ${formatIndianCurrency(order.total_amount)}
                        </div>
                        <div style="font-size: 0.875rem; color: #6b7280;">
                            <div>Unit: ${formatIndianCurrency(order.unit_price || order.current_price || 0)}</div>
                            <div style="margin-top: 0.25rem;">Platform Fee: ${formatIndianCurrency(order.platform_fee || 0)}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Display recent orders (first 3)
    if (recentOrders) {
        const recentOrdersList = profileOrders.slice(0, 3);
        if (recentOrdersList.length > 0) {
            recentOrders.innerHTML = recentOrdersList.map(order => {
                let photos = [];
                if (order.photo) {
                    try {
                        photos = JSON.parse(order.photo);
                        if (!Array.isArray(photos)) photos = [order.photo];
                    } catch {
                        photos = [order.photo];
                    }
                }
                const firstPhoto = photos.length > 0 ? photos[0] : null;
                
                return `
                    <div style="display: flex; gap: 1rem; padding: 1rem; border-bottom: 1px solid #e5e7eb; align-items: center;">
                        ${firstPhoto ? `
                        <div style="width: 80px; height: 80px; border-radius: 8px; overflow: hidden; background: #f3f4f6; border: 1px solid #e5e7eb; flex-shrink: 0;">
                            <img src="${firstPhoto}" alt="${order.material_name}" style="width: 100%; height: 100%; object-fit: contain; padding: 0.25rem;" onerror="this.style.display='none';">
                        </div>
                        ` : `
                        <div style="width: 80px; height: 80px; border-radius: 8px; background: #f3f4f6; border: 1px solid #e5e7eb; flex-shrink: 0; display:flex; align-items:center; justify-content:center; color:#9ca3af;">
                            <i class="fas fa-image" style="font-size:1.25rem; opacity: 0.5;"></i>
                        </div>
                        `}
                        <div style="flex: 1;">
                            <div style="font-weight: 600; margin-bottom: 0.25rem;">${order.material_name}</div>
                            <div style="font-size: 0.875rem; color: #6b7280;">${order.quantity} ${order.unit || 'units'} • ${formatDateTime(order.created_at)}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 700; color: #059669; margin-bottom: 0.25rem;">${formatIndianCurrency(order.total_amount)}</div>
                            <span class="status-badge status-${order.status}" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
                                ${order.status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

function displayProfileRequests() {
    const requestsList = document.getElementById('profile-requests-list');
    if (!requestsList) return;
    
    if (profileOrderRequests.length === 0) {
        requestsList.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #6b7280;">
                <i class="fas fa-clock" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="font-size: 1.1rem; font-weight: 500;">No order requests</p>
                <p style="margin-top: 0.5rem;">Incoming order requests will appear here</p>
            </div>
        `;
        return;
    }
    
    requestsList.innerHTML = profileOrderRequests.map(request => {
        // Parse photo
        let photos = [];
        if (request.photo) {
            try {
                photos = JSON.parse(request.photo);
                if (!Array.isArray(photos)) photos = [request.photo];
            } catch {
                photos = [request.photo];
            }
        }
        const firstPhoto = photos.length > 0 ? photos[0] : null;
        
        return `
            <div style="background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="display: grid; grid-template-columns: 150px 1fr auto; gap: 1.5rem; align-items: start;">
                    ${firstPhoto ? `
                    <div style="width: 150px; height: 150px; border-radius: 8px; overflow: hidden; background: #f3f4f6; border: 1px solid #e5e7eb;">
                        <img src="${firstPhoto}" alt="${request.material_name}" style="width: 100%; height: 100%; object-fit: contain; padding: 0.5rem;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div style="display:none; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#9ca3af;">
                            <i class="fas fa-image" style="font-size:1.5rem; opacity: 0.5;"></i>
                        </div>
                    </div>
                    ` : `
                    <div style="width: 150px; height: 150px; border-radius: 8px; background: #f3f4f6; border: 1px solid #e5e7eb; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#9ca3af;">
                        <i class="fas fa-image" style="font-size:1.5rem; opacity: 0.5;"></i>
                    </div>
                    `}
                    
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: start; justify-content: space-between; margin-bottom: 0.75rem;">
                            <div>
                                <h4 style="margin: 0 0 0.25rem 0; font-size: 1.125rem; font-weight: 700; color: #1f2937;">${request.material_name}</h4>
                                ${request.brand ? `<p style="margin: 0 0 0.5rem 0; color: #6b7280; font-size: 0.875rem;">${request.brand}</p>` : ''}
                                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
                                    ${request.category ? `<span style="padding: 0.25rem 0.5rem; background: #dbeafe; color: #1e40af; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600;">${request.category}</span>` : ''}
                                    ${request.condition ? `<span style="padding: 0.25rem 0.5rem; background: #fef3c7; color: #92400e; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600;">${request.condition.charAt(0).toUpperCase() + request.condition.slice(1)}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 0.75rem; padding: 0.75rem; background: #f9fafb; border-radius: 8px;">
                            <div>
                                <div style="color: #6b7280; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem;">Request ID</div>
                                <div style="font-size: 0.875rem; font-weight: 500; font-family: monospace;">${request.id.substring(0, 12)}...</div>
                            </div>
                            <div>
                                <div style="color: #6b7280; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem;">Quantity</div>
                                <div style="font-size: 0.875rem; font-weight: 500;">${request.quantity} ${request.unit || 'units'}</div>
                            </div>
                            <div>
                                <div style="color: #6b7280; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem;">Buyer</div>
                                <div style="font-size: 0.875rem; font-weight: 500;">${request.buyer_name}${request.buyer_company && request.buyer_company.toLowerCase() !== 'n/a' ? ` (${request.buyer_company})` : ''}</div>
                            </div>
                            <div>
                                <div style="color: #6b7280; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem;">Requested On</div>
                                <div style="font-size: 0.875rem; font-weight: 500;">${formatDateTime(request.created_at)}</div>
                            </div>
                        </div>
                        
                        ${request.delivery_address ? `
                        <div style="margin-top: 0.75rem; padding: 0.75rem; background: #ecfdf5; border-radius: 8px; border-left: 3px solid #10b981;">
                            <div style="color: #065f46; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem;">Delivery Address</div>
                            <div style="color: #047857; font-size: 0.875rem; line-height: 1.5;">${request.delivery_address}</div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div style="text-align: right; min-width: 150px;">
                        <div style="margin-bottom: 0.75rem;">
                            <span class="status-badge status-${request.status}" style="font-size: 0.875rem; padding: 0.5rem 1rem;">
                                ${request.status.toUpperCase().replace('_', ' ')}
                            </span>
                        </div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: #059669; margin-bottom: 0.5rem;">
                            ${formatIndianCurrency(request.total_amount)}
                        </div>
                        <div style="font-size: 0.875rem; color: #6b7280;">
                            Unit: ${formatIndianCurrency(request.unit_price || request.current_price || 0)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function switchProfileTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.profile-tab-content').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.profile-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(`profile-${tabName}-tab`);
    const selectedBtn = document.querySelector(`.profile-tab[data-tab="${tabName}"]`);
    
    if (selectedTab) {
        selectedTab.style.display = 'block';
        selectedTab.classList.add('active');
    }
    
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Load data for specific tabs
    if (tabName === 'orders') {
        displayProfileOrders();
    } else if (tabName === 'requests') {
        displayProfileRequests();
    } else if (tabName === 'inventory') {
        displayInventorySummary();
    } else if (tabName === 'account') {
        loadProfileAccountForm();
    }
}

function loadProfileAccountForm() {
    if (!currentUser || !currentUser.id) return;
    
    // Fetch latest user data
    fetch(`/api/users/${currentUser.id}`)
        .then(response => response.json())
        .then(result => {
            if (result.success && result.user) {
                const user = result.user;
                document.getElementById('profile-account-name').value = user.name || '';
                document.getElementById('profile-account-email').value = user.email || '';
                document.getElementById('profile-account-company').value = user.company_name || user.companyName || '';
                document.getElementById('profile-account-phone').value = user.phone || '';
                document.getElementById('profile-account-project').value = user.project_name || '';
                document.getElementById('profile-account-address').value = user.address || '';
                document.getElementById('profile-account-designation').value = user.designation || '';
            }
        })
        .catch(error => {
            console.error('Error loading account data:', error);
            // Fallback to currentUser
            if (currentUser) {
                document.getElementById('profile-account-name').value = currentUser.name || '';
                document.getElementById('profile-account-email').value = currentUser.email || '';
                document.getElementById('profile-account-company').value = currentUser.company_name || currentUser.companyName || '';
                document.getElementById('profile-account-phone').value = currentUser.phone || '';
                document.getElementById('profile-account-project').value = currentUser.project_name || '';
                document.getElementById('profile-account-address').value = currentUser.address || '';
                document.getElementById('profile-account-designation').value = currentUser.designation || '';
            }
        });
}

function displayInventorySummary() {
    const summaryList = document.getElementById('inventory-summary-list');
    if (!summaryList) return;
    
    if (profileInventory.length === 0) {
        summaryList.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #6b7280;">
                <i class="fas fa-boxes" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="font-size: 1.1rem; font-weight: 500;">No inventory found</p>
                <p style="margin-top: 0.5rem;">Start adding materials to see your inventory summary</p>
            </div>
        `;
        document.getElementById('inventory-total-items').textContent = '0';
        document.getElementById('inventory-total-quantity').textContent = '0';
        document.getElementById('inventory-total-value').textContent = '₹0';
        return;
    }
    
    // Calculate totals
    const totalItems = profileInventory.length;
    const totalQuantity = profileInventory.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
    const totalValue = profileInventory.reduce((sum, item) => {
        const price = parseFloat(item.price_today || item.priceToday || 0);
        const qty = parseFloat(item.qty || 0);
        return sum + (price * qty);
    }, 0);
    
    // Update summary cards
    document.getElementById('inventory-total-items').textContent = totalItems.toLocaleString();
    document.getElementById('inventory-total-quantity').textContent = totalQuantity.toLocaleString();
    document.getElementById('inventory-total-value').textContent = formatIndianCurrency(totalValue);
    
    // Group inventory by project and location
    const groupedInventory = {};
    
    profileInventory.forEach(item => {
        const projectName = item.project_name || item.projectId || 'Unassigned Project';
        const location = item.project_location || item.location_details || item.location || 'No Location';
        const key = `${projectName}|${location}`;
        
        if (!groupedInventory[key]) {
            groupedInventory[key] = {
                projectName,
                location,
                items: [],
                totalQuantity: 0,
                totalValue: 0
            };
        }
        
        const qty = parseFloat(item.qty || 0);
        const price = parseFloat(item.price_today || item.priceToday || 0);
        const value = price * qty;
        
        groupedInventory[key].items.push(item);
        groupedInventory[key].totalQuantity += qty;
        groupedInventory[key].totalValue += value;
    });
    
    // Convert to array and sort by project name
    const groupedArray = Object.values(groupedInventory).sort((a, b) => {
        if (a.projectName !== b.projectName) {
            return a.projectName.localeCompare(b.projectName);
        }
        return a.location.localeCompare(b.location);
    });
    
    // Display grouped inventory
    summaryList.innerHTML = groupedArray.map(group => {
        return `
            <div style="background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 2px solid #e5e7eb;">
                    <div>
                        <h4 style="margin: 0 0 0.25rem 0; font-size: 1.25rem; font-weight: 700; color: #1f2937; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-project-diagram" style="color: #10b981;"></i>
                            ${group.projectName}
                        </h4>
                        <p style="margin: 0; color: #6b7280; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-map-marker-alt" style="color: #10b981; font-size: 0.75rem;"></i>
                            ${group.location}
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: #6b7280; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem;">Summary</div>
                        <div style="font-size: 0.875rem; color: #1f2937;">
                            <div><strong>${group.items.length}</strong> items</div>
                            <div><strong>${group.totalQuantity.toLocaleString()}</strong> total qty</div>
                            <div><strong style="color: #059669;">${formatIndianCurrency(group.totalValue)}</strong></div>
                        </div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">
                    ${group.items.map(item => {
                        const itemPrice = parseFloat(item.price_today || item.priceToday || 0);
                        const itemQty = parseFloat(item.qty || 0);
                        const itemValue = itemPrice * itemQty;
                        
                        return `
                            <div style="background: #f9fafb; border-radius: 8px; padding: 1rem; border: 1px solid #e5e7eb;">
                                <div style="font-weight: 600; color: #1f2937; margin-bottom: 0.5rem; font-size: 0.95rem;">
                                    ${item.material}
                                </div>
                                ${item.brand ? `
                                <div style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem;">
                                    ${item.brand}
                                </div>
                                ` : ''}
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                    <span style="color: #6b7280; font-size: 0.75rem;">Qty:</span>
                                    <span style="font-weight: 600; color: #1f2937;">${itemQty.toLocaleString()} ${item.unit || 'units'}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                    <span style="color: #6b7280; font-size: 0.75rem;">Price:</span>
                                    <span style="font-weight: 600; color: #059669;">${formatIndianCurrency(itemPrice)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding-top: 0.5rem; border-top: 1px solid #e5e7eb;">
                                    <span style="color: #6b7280; font-size: 0.75rem; font-weight: 600;">Value:</span>
                                    <span style="font-weight: 700; color: #059669; font-size: 0.95rem;">${formatIndianCurrency(itemValue)}</span>
                                </div>
                                ${item.category ? `
                                <div style="margin-top: 0.5rem;">
                                    <span style="padding: 0.25rem 0.5rem; background: #dbeafe; color: #1e40af; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600;">
                                        ${item.category}
                                    </span>
                                </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function setupProfileAccountForm() {
    const form = document.getElementById('profile-account-form');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!currentUser || !currentUser.id) {
            showNotification('User not found. Please sign in again.', 'error');
            return;
        }
        
        const updateData = {
            name: document.getElementById('profile-account-name').value.trim(),
            company_name: document.getElementById('profile-account-company').value.trim(),
            phone: document.getElementById('profile-account-phone').value.trim(),
            designation: document.getElementById('profile-account-designation').value,
            project_name: document.getElementById('profile-account-project').value.trim() || null,
            address: document.getElementById('profile-account-address').value.trim() || null
        };
        
        // Validate required fields
        if (!updateData.name) {
            showNotification('Name is required', 'error');
            return;
        }
        
        try {
            const response = await fetch(`/api/users/${currentUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification('Account updated successfully!', 'success');
                
                // Update currentUser in localStorage
                currentUser.name = updateData.name;
                currentUser.companyName = updateData.company_name;
                currentUser.company_name = updateData.company_name;
                currentUser.phone = updateData.phone;
                currentUser.designation = updateData.designation;
                currentUser.project_name = updateData.project_name;
                currentUser.address = updateData.address;
                localStorage.setItem('greenscore-user', JSON.stringify(currentUser));
                
                // Update profile display
                updateProfileDetails({
                    ...currentUser,
                    company_name: updateData.company_name,
                    phone: updateData.phone,
                    designation: updateData.designation
                });
                
                // Reload profile page data to reflect changes
                populateProfilePage(currentUser);
                
                // Update profile button name
                const profileUserName = document.getElementById('profile-user-name');
                if (profileUserName) {
                    profileUserName.textContent = updateData.name;
                }
                
                // Update seller name if displayed
                const sellerNameElement = document.getElementById('seller-name');
                if (sellerNameElement) {
                    sellerNameElement.textContent = updateData.name;
                }
            } else {
                showNotification(result.error || 'Failed to update account', 'error');
            }
        } catch (error) {
            console.error('Error updating account:', error);
            showNotification('Error updating account. Please try again.', 'error');
        }
    });
}

// Make functions available globally
window.debugElements = debugElements;
window.uploadCSV = uploadCSV;
window.showCreateProjectModal = showCreateProjectModal;
window.closeProjectModal = closeProjectModal;
window.signOut = signOut;
window.loadOrderRequests = loadOrderRequests;
window.viewRequestsForMaterial = viewRequestsForMaterial;
window.closeMaterialRequestsModal = closeMaterialRequestsModal;
window.approveOrderRequest = approveOrderRequest;
window.declineOrderRequest = declineOrderRequest;
window.approveAllForMaterial = approveAllForMaterial;
window.selectAllRequests = selectAllRequests;
window.approveSelectedRequests = approveSelectedRequests;
window.loadTransactionHistory = loadTransactionHistory;
window.exportTransactionHistory = exportTransactionHistory;
window.openProfilePage = openProfilePage;
window.closeProfilePage = closeProfilePage;
window.switchProfileTab = switchProfileTab;
