// Admin Dashboard JavaScript

let currentUser = null;
let users = [];
let materials = [];
let orderRequests = [];
let orders = [];

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Admin Dashboard Loading...');
    
    // Check authentication
    currentUser = getCurrentUser();
    if (!currentUser || currentUser.userType !== 'admin') {
        console.log('❌ Admin access denied');
        window.location.href = '/auth.html';
        return;
    }
    
    initializeAdminDashboard();
});

function getCurrentUser() {
    const userStr = localStorage.getItem('greenscore-user');
    return userStr ? JSON.parse(userStr) : null;
}

async function initializeAdminDashboard() {
    console.log('🚀 Initializing admin dashboard...');
    
    await loadSystemStats();
    await loadProjects();
    await loadCategories();
    await loadUsers();
    
    setupEventListeners();
    
    console.log('✅ Admin dashboard initialized');
}

function setupEventListeners() {
    const materialEditForm = document.getElementById('material-edit-form');
    if (materialEditForm) {
        materialEditForm.addEventListener('submit', updateMaterial);
    }
}

// System Stats
async function loadSystemStats() {
    try {
        const response = await fetch('/api/admin/stats');
        const result = await response.json();
        
        if (result.success) {
            updateStatsDisplay(result.stats);
        }
    } catch (error) {
        console.error('Error loading system stats:', error);
    }
}

function updateStatsDisplay(stats) {
    document.getElementById('stat-users').textContent = formatIndianNumber(stats.totalUsers);
    document.getElementById('stat-materials').textContent = formatIndianNumber(stats.totalMaterials);
    document.getElementById('stat-pending').textContent = formatIndianNumber(stats.pendingRequests);
    document.getElementById('stat-orders').textContent = formatIndianNumber(stats.completedOrders);
    document.getElementById('stat-revenue').textContent = formatIndianCurrency(stats.totalRevenue);
}

// Tab Management
function showAdminTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.admin-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.classList.add('active');
    
    // Load data for the tab
    switch(tabName) {
        case 'users':
            loadUsers();
            break;
        case 'materials':
            loadMaterials();
            break;
        case 'requests':
            loadOrderRequests();
            break;
        case 'orders':
            loadOrders();
            break;
    }
}

// Users Management
async function loadUsers() {
    try {
        console.log('Loading users...');
        const response = await fetch('/api/admin/users');
        const result = await response.json();
        
        if (result.success) {
            users = result.users;
            displayUsers();
            populateSellerFilter();
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function populateSellerFilter() {
    const sellerFilter = document.getElementById('admin-seller-filter');
    if (sellerFilter) {
        sellerFilter.innerHTML = '<option value="all">All Sellers</option>';
        
        const sellers = users.filter(u => u.user_type === 'seller' || u.user_type === 'both');
        sellers.forEach(seller => {
            const option = document.createElement('option');
            option.value = seller.id;
            option.textContent = `${seller.name} (${seller.company_name || 'No Company'}) - ${seller.material_count || 0} materials`;
            sellerFilter.appendChild(option);
        });
    }
}

function displayUsers() {
    const tableBody = document.getElementById('users-table-body');
    
    if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem;">No users found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = users.map(user => `
        <tr>
            <td><strong>${user.name}</strong></td>
            <td>${user.email}</td>
            <td>${user.company_name || 'N/A'}</td>
            <td><span class="status-badge status-${user.user_type}">${user.user_type.toUpperCase()}</span></td>
            <td>${user.project_count}</td>
            <td>${user.material_count}</td>
            <td>${user.order_count}</td>
            <td>${formatDateTime(user.created_at)}</td>
            <td><span class="status-badge status-${user.verification_status}">${user.verification_status.toUpperCase()}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-info" onclick="editUser('${user.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Materials Management
async function loadProjects() {
    try {
        const response = await fetch('/api/admin/projects');
        const result = await response.json();
        
        if (result.success) {
            const projectFilter = document.getElementById('admin-project-filter');
            if (projectFilter) {
                // Keep "All Projects" as default
                projectFilter.innerHTML = '<option value="all">All Projects</option>';
                
                result.projects.forEach(project => {
                    const option = document.createElement('option');
                    option.value = project.id;
                    option.textContent = `${project.name} (${project.seller_name || 'Unknown'}) - ${project.material_count || 0} materials`;
                    projectFilter.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        const categories = await response.json();
        
        // Populate category filter in materials section
        const categoryFilter = document.getElementById('admin-category-filter');
        if (categoryFilter && Array.isArray(categories)) {
            categoryFilter.innerHTML = '<option value="all">All Categories</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            });
        }
        
        // Populate category dropdown in edit modal
        const editCategorySelect = document.getElementById('edit-category');
        if (editCategorySelect && Array.isArray(categories)) {
            editCategorySelect.innerHTML = '<option value="">Select Category</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                editCategorySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadMaterials() {
    const materialsTab = document.getElementById('materials-tab');
    if (!materialsTab || !materialsTab.classList.contains('active')) return;
    
    try {
        // Show loading indicator
        const gridContainer = document.getElementById('materials-grid');
        const tableContainer = document.getElementById('materials-table-body');
        if (gridContainer) {
            gridContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem;"><div style="display: inline-block;"><div class="loading-spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #10b981; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div><div style="width: 200px; background: #e5e7eb; border-radius: 10px; overflow: hidden; margin: 0 auto 1rem;"><div id="admin-materials-progress" style="width: 0%; background: linear-gradient(90deg, #10b981 0%, #059669 100%); height: 24px; transition: width 0.3s;"></div></div><p id="admin-materials-status" style="color: #6b7280; font-size: 0.875rem;">Loading materials... 0%</p></div></div>';
        }
        if (tableContainer) {
            tableContainer.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 3rem;"><div class="loading-spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #10b981; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 1rem; display: inline-block;"></div><p>Loading materials...</p></td></tr>';
        }
        
        updateAdminMaterialsProgress(10, 'Initializing...');
        
        const projectId = document.getElementById('admin-project-filter')?.value || 'all';
        const listingType = document.getElementById('admin-listing-filter')?.value || 'all';
        const sellerId = document.getElementById('admin-seller-filter')?.value || 'all';
        const category = document.getElementById('admin-category-filter')?.value || 'all';
        
        let url = '/api/admin/materials?';
        const params = new URLSearchParams();
        
        if (projectId !== 'all') params.append('projectId', projectId);
        if (listingType !== 'all') params.append('listingType', listingType);
        if (sellerId !== 'all') params.append('sellerId', sellerId);
        if (category !== 'all') params.append('category', category);
        
        updateAdminMaterialsProgress(30, 'Requesting data...');
        
        const response = await fetch(url + params.toString());
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        updateAdminMaterialsProgress(60, 'Processing...');
        
        const result = await response.json();
        
        updateAdminMaterialsProgress(80, 'Rendering...');
        
        console.log('Materials API response:', result);
        
        if (result.success) {
            materials = result.materials || [];
            console.log(`Loaded ${materials.length} materials`);
            
            updateAdminMaterialsProgress(90, 'Rendering...');
            
            // Display immediately without delay
            displayMaterials();
            populateSellerFilter();
            
            // Clear loading state after render
            updateAdminMaterialsProgress(100, 'Complete!');
            setTimeout(() => {
                // Ensure loading indicator is removed
                const gridContainer = document.getElementById('materials-grid');
                const tableContainer = document.getElementById('materials-table-body');
                if (gridContainer && gridContainer.innerHTML.includes('loading-spinner')) {
                    // displayMaterials should have replaced it, but ensure it's gone
                    const loadingDiv = gridContainer.querySelector('.loading-spinner')?.closest('div');
                    if (loadingDiv) loadingDiv.remove();
                }
                if (tableContainer && tableContainer.innerHTML.includes('Loading')) {
                    // displayMaterials should have replaced it
                }
            }, 100);
        } else {
            console.error('Failed to load materials:', result);
            materials = [];
            const errorMessage = result.error || result.message || 'Unknown error occurred';
            if (gridContainer) {
                gridContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #ef4444;"><i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i><p style="margin-bottom: 0.5rem;">Failed to load materials</p><p style="font-size: 0.875rem; color: #9ca3af;">' + errorMessage + '</p></div>';
            }
            if (tableContainer) {
                tableContainer.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 3rem; color: #ef4444;"><i class="fas fa-exclamation-triangle"></i><br>Failed to load materials<br><small style="color: #9ca3af;">' + errorMessage + '</small></td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading materials:', error);
        const gridContainer = document.getElementById('materials-grid');
        const tableContainer = document.getElementById('materials-table-body');
        const errorMessage = error.message || 'Network error or server unavailable';
        if (gridContainer) {
            gridContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #ef4444;"><i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i><p style="margin-bottom: 0.5rem;">Error loading materials</p><p style="font-size: 0.875rem; color: #9ca3af;">' + errorMessage + '</p><button onclick="loadMaterials()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">Retry</button></div>';
        }
        if (tableContainer) {
            tableContainer.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 3rem; color: #ef4444;"><i class="fas fa-exclamation-triangle"></i><br>Error loading materials<br><small style="color: #9ca3af;">' + errorMessage + '</small><br><button onclick="loadMaterials()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">Retry</button></td></tr>';
        }
        materials = [];
    }
}

function updateAdminMaterialsProgress(percent, message) {
    const progressBar = document.getElementById('admin-materials-progress');
    const statusText = document.getElementById('admin-materials-status');
    
    if (progressBar) {
        progressBar.style.width = percent + '%';
    }
    if (statusText) {
        statusText.textContent = message + ' ' + percent + '%';
    }
}

let currentMaterialsView = 'table'; // 'table' or 'grid'

function toggleMaterialsView(view) {
    currentMaterialsView = view;
    
    // Update button states
    document.getElementById('grid-view-btn').classList.toggle('active', view === 'grid');
    document.getElementById('table-view-btn').classList.toggle('active', view === 'table');
    
    // Toggle visibility
    const gridContainer = document.getElementById('materials-grid');
    const tableContainer = document.getElementById('materials-table-container');
    
    if (view === 'grid') {
        gridContainer.style.display = 'grid';
        tableContainer.style.display = 'none';
    } else {
        gridContainer.style.display = 'none';
        tableContainer.style.display = 'block';
    }
    
    displayMaterials();
}

function displayMaterials() {
    const countElement = document.getElementById('total-materials-count');
    const gridContainer = document.getElementById('materials-grid');
    const tableContainer = document.getElementById('materials-table-body');
    
    // Clear any loading indicators first
    if (gridContainer) {
        const loadingDiv = gridContainer.querySelector('.loading-spinner')?.closest('div');
        if (loadingDiv && loadingDiv.parentNode) {
            loadingDiv.remove();
        }
    }
    
    if (countElement) {
        countElement.textContent = formatIndianNumber(materials.length);
    }
    
    if (currentMaterialsView === 'grid') {
        displayMaterialsGrid();
    } else {
        displayMaterialsTable();
    }
}

function displayMaterialsGrid() {
    const gridContainer = document.getElementById('materials-grid');
    
    if (materials.length === 0) {
        gridContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #6b7280;"><i class="fas fa-boxes" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i><p>No materials found</p></div>';
        return;
    }
    
    gridContainer.innerHTML = materials.map(material => {
        // Parse photo - could be JSON array or base64 string
        let imageUrl = null;
        
        // Debug: Log photo data for first few materials
        if (materials.indexOf(material) < 3) {
            console.log(`Material ${material.material}:`, {
                hasPhoto: !!material.photo,
                photoType: typeof material.photo,
                photoLength: material.photo ? material.photo.length : 0,
                photoPreview: material.photo ? material.photo.substring(0, 50) : 'null'
            });
        }
        
        if (material.photo) {
            const photoStr = String(material.photo).trim();
            
            // Skip empty strings, "null", "undefined"
            if (photoStr && photoStr !== '' && photoStr !== 'null' && photoStr !== 'undefined' && photoStr !== '""') {
                try {
                    // Try parsing as JSON first
                    const parsed = JSON.parse(photoStr);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        // Get first valid photo from array
                        const validPhoto = parsed.find(p => p && String(p).trim() !== '' && String(p) !== 'null');
                        if (validPhoto) {
                            imageUrl = String(validPhoto).trim();
                        }
                    } else if (parsed && typeof parsed === 'string' && parsed.trim() !== '') {
                        imageUrl = parsed.trim();
                    } else if (typeof material.photo === 'string' && photoStr !== '') {
                        imageUrl = photoStr;
                    }
                } catch (e) {
                    // Not JSON, use as-is (could be base64 or URL)
                    if (photoStr.startsWith('data:image/') || photoStr.startsWith('http://') || photoStr.startsWith('https://') || photoStr.length > 100) {
                        // Likely base64 or URL
                        imageUrl = photoStr;
                    }
                }
            }
        }
        
        // Debug: Log final imageUrl for first material
        if (materials.indexOf(material) === 0) {
            console.log(`Final imageUrl for ${material.material}:`, imageUrl ? 'Has URL' : 'No URL', imageUrl ? imageUrl.substring(0, 50) : '');
        }
        
        return `
            <div class="material-card">
                ${imageUrl ? `
                    <img src="${imageUrl}" 
                         alt="${material.material}" 
                         class="material-card-image" 
                         style="width: 100%; height: 200px; object-fit: contain; background: #f3f4f6; padding: 0.5rem;"
                         onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div style="display:none; width: 100%; height: 200px; background: #f3f4f6; flex-direction:column; align-items:center; justify-content:center; color:#9ca3af;">
                        <i class="fas fa-image" style="font-size:2rem; margin-bottom:0.5rem; opacity: 0.5;"></i>
                        <span style="font-size: 0.875rem;">No Image</span>
                    </div>
                ` : `
                    <div style="width: 100%; height: 200px; background: #f3f4f6; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#9ca3af;">
                        <i class="fas fa-image" style="font-size:2rem; margin-bottom:0.5rem; opacity: 0.5;"></i>
                        <span style="font-size: 0.875rem;">No Image</span>
                    </div>
                `}
                <div class="material-card-content">
                    <div class="material-card-title">${material.material}</div>
                    ${material.brand ? `<div style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem;">${material.brand}</div>` : ''}
                    <div class="material-card-price">${formatIndianCurrency(material.price_today)}</div>
                    <div class="material-card-details">
                        <div style="margin-bottom: 0.25rem;">
                            <i class="fas fa-box"></i> <strong>${formatIndianNumber(material.quantity)}</strong> ${material.unit || 'pcs'}
                        </div>
                        <div style="margin-bottom: 0.25rem;">
                            <i class="fas fa-tag"></i> ${material.category || 'Other'}
                        </div>
                        <div style="margin-bottom: 0.25rem;">
                            <i class="fas fa-user"></i> ${material.seller_name}
                        </div>
                        ${material.project_name ? `<div style="margin-bottom: 0.25rem;"><i class="fas fa-project-diagram"></i> ${material.project_name}</div>` : ''}
                        <div style="margin-top: 0.5rem;">
                            <span class="status-badge status-${material.listing_type}">
                                ${material.listing_type === 'resale' ? 'FOR SALE' : 
                                  material.listing_type === 'sold' ? 'SOLD' : 'TRANSFER'}
                            </span>
                        </div>
                    </div>
                    <div class="material-card-actions">
                        <button class="btn btn-sm btn-info" onclick="viewMaterialDetails('${material.id}')" style="flex: 1;" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="editMaterial('${material.id}')" style="flex: 1;" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteMaterial('${material.id}')" style="flex: 1;" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function displayMaterialsTable() {
    const tableBody = document.getElementById('materials-table-body');
    
    if (materials.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="11" style="text-align: center; padding: 2rem;">No materials found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = materials.map(material => {
        // Parse photo for table view
        let photoUrl = null;
        if (material.photo) {
            try {
                const parsed = JSON.parse(material.photo);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    photoUrl = parsed[0];
                } else if (parsed && typeof parsed === 'string') {
                    photoUrl = parsed;
                } else {
                    photoUrl = material.photo;
                }
            } catch {
                photoUrl = material.photo;
            }
        }
        const imageHtml = photoUrl ? 
            `<img src="${photoUrl}" alt="${material.material}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; margin-right: 8px;" onerror="this.style.display='none'">` : 
            `<div style="width: 40px; height: 40px; background: #e5e7eb; border-radius: 4px; margin-right: 8px; display: inline-block;"></div>`;
        
        return `
        <tr>
            <td>
                <div style="display: flex; align-items: center;">
                    ${imageHtml}
                    <div>
                        <strong>${material.material}</strong><br>
                        ${material.brand ? `<small style="color: #6b7280;">${material.brand}</small>` : ''}
                    </div>
                </div>
            </td>
            <td><code style="font-size: 0.75rem;">${material.listing_id || 'N/A'}</code></td>
            <td>
                <strong>${material.project_name || 'No Project'}</strong><br>
                <small style="color: #6b7280;">${material.project_location || ''}</small>
            </td>
            <td>
                ${material.seller_name}<br>
                ${material.seller_company && material.seller_company.toLowerCase() !== 'n/a' ? `<small style="color: #6b7280;">${material.seller_company}</small>` : ''}
            </td>
            <td><strong>${formatIndianNumber(material.quantity)}</strong> ${material.unit || 'pcs'}</td>
            <td style="color: #059669; font-weight: 600;">${formatIndianCurrency(material.price_today)}</td>
            <td><span class="badge">${material.category || 'Other'}</span></td>
            <td>
                <span class="status-badge status-${material.listing_type}">
                    ${material.listing_type === 'resale' ? 'FOR SALE' : 
                      material.listing_type === 'sold' ? 'SOLD' : 
                      'TRANSFER'}
                </span>
            </td>
            <td>${material.pending_requests || 0}</td>
            <td>${material.completed_orders || 0}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-info" onclick="viewMaterialDetails('${material.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="editMaterial('${material.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteMaterial('${material.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

// Order Requests Management
async function loadOrderRequests() {
    try {
        const response = await fetch('/api/admin/order-requests');
        const result = await response.json();
        
        if (result.success) {
            orderRequests = result.requests;
            displayOrderRequests();
        }
    } catch (error) {
        console.error('Error loading order requests:', error);
    }
}

function displayOrderRequests() {
    const tableBody = document.getElementById('requests-table-body');
    
    // Filter to show only pending requests (approved/rejected should be cleared from requests tab)
    const pendingRequests = orderRequests.filter(request => request.status === 'pending');
    
    if (pendingRequests.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No pending order requests found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = pendingRequests.map(request => `
        <tr>
            <td>
                <strong>${request.material_name}</strong><br>
                <small>Listing: ${request.listing_id || 'N/A'}</small>
            </td>
            <td>${request.buyer_name}<br>${request.buyer_company && request.buyer_company.toLowerCase() !== 'n/a' ? `<small>${request.buyer_company}</small>` : ''}</td>
            <td>${request.seller_name}<br>${request.seller_company && request.seller_company.toLowerCase() !== 'n/a' ? `<small>${request.seller_company}</small>` : ''}</td>
            <td>${request.quantity}</td>
            <td>${formatIndianCurrency(request.total_amount)}</td>
            <td>
                <span class="status-badge status-${request.status}">${request.status.toUpperCase()}</span>
            </td>
            <td>${formatDateTime(request.created_at)}</td>
            <td>
                <div class="action-buttons" style="display: flex; gap: 5px; justify-content: center;">
                    <button class="btn btn-sm btn-success" onclick="approveRequest('${request.id}')" title="Approve">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="rejectRequest('${request.id}')" title="Reject">
                        <i class="fas fa-times"></i>
                    </button>
                    <button class="btn btn-sm btn-info" onclick="viewRequestDetails('${request.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Orders Management
async function loadOrders() {
    try {
        const response = await fetch('/api/admin/orders');
        const result = await response.json();
        
        if (result.success) {
            orders = result.orders;
            displayOrders();
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function displayOrders() {
    const tableBody = document.getElementById('orders-table-body');
    
    if (orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem;">No orders found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = orders.map(order => {
        // Parse photo for table row (optional thumbnail)
        let photoUrl = null;
        if (order.photo) {
            try {
                const parsed = JSON.parse(order.photo);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    photoUrl = parsed[0];
                } else if (parsed && typeof parsed === 'string') {
                    photoUrl = parsed;
                } else {
                    photoUrl = order.photo;
                }
            } catch {
                photoUrl = order.photo;
            }
        }
        
        return `
        <tr>
            <td><code>${order.id.substring(0, 8)}...</code></td>
            <td>
                ${photoUrl ? `<img src="${photoUrl}" alt="${order.material_name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; margin-right: 8px; vertical-align: middle;" onerror="this.style.display='none'">` : ''}
                <strong>${order.material_name}</strong><br>
                <small>Listing: ${order.listing_id || 'N/A'}</small>
            </td>
            <td>${order.buyer_name}<br>${order.buyer_company && order.buyer_company.toLowerCase() !== 'n/a' ? `<small>${order.buyer_company}</small>` : ''}</td>
            <td>${order.seller_name}<br>${order.seller_company && order.seller_company.toLowerCase() !== 'n/a' ? `<small>${order.seller_company}</small>` : ''}</td>
            <td>${order.quantity}</td>
            <td>${formatIndianCurrency(order.total_amount)}</td>
            <td><span class="status-badge status-${order.status}">${order.status.toUpperCase()}</span></td>
            <td>${formatDateTime(order.created_at)}</td>
            <td>
                <div class="action-buttons" style="display: flex; justify-content: center;">
                    <button class="btn btn-sm btn-info" onclick="viewOrderDetails('${order.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

// Detailed view for completed orders (with photos and all details)
function viewOrderDetails(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
        if (typeof showNotification === 'function') {
            showNotification('Order not found', 'error');
        } else {
            alert('Order not found');
        }
        return;
    }
    
    const modal = document.getElementById('request-details-modal');
    const content = document.getElementById('request-details-content');
    
    if (!modal || !content) {
        alert('Modal not found');
        return;
    }
    
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
    
    // Update modal title
    const modalTitle = modal.querySelector('.modal-header h3');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-eye"></i> Order Details';
    }
    
    content.innerHTML = `
        <div style="display: grid; grid-template-columns: 300px 1fr; gap: 24px;">
            ${firstPhoto ? `
            <div style="width: 100%; height: 300px; border-radius: 12px; overflow: hidden; background: #f3f4f6; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <img src="${firstPhoto}" alt="${order.material_name}" style="width: 100%; height: 100%; object-fit: contain; padding: 12px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div style="display:none; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#9ca3af;">
                    <i class="fas fa-image" style="font-size:3rem; margin-bottom:0.5rem; opacity: 0.5;"></i>
                    <span style="font-size: 1rem; font-weight: 500;">No Image</span>
                </div>
            </div>
            ` : `
            <div style="width: 100%; height: 300px; border-radius: 12px; background: #f3f4f6; border: 1px solid #e5e7eb; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#9ca3af; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <i class="fas fa-image" style="font-size:3rem; margin-bottom:0.5rem; opacity: 0.5;"></i>
                <span style="font-size: 1rem; font-weight: 500;">No Image</span>
            </div>
            `}
            
            <div>
                <div style="margin-bottom: 20px;">
                    <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 22px; font-weight: 700;">${order.material_name}</h3>
                    ${order.brand ? `<p style="margin: 0 0 12px 0; color: #6b7280; font-size: 16px; font-weight: 600;">${order.brand}</p>` : ''}
                    <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
                        ${order.category ? `<span style="padding: 6px 12px; background: #dbeafe; color: #1e40af; border-radius: 16px; font-size: 13px; font-weight: 600;">${order.category}</span>` : ''}
                        ${order.condition ? `<span style="padding: 6px 12px; background: #fef3c7; color: #92400e; border-radius: 16px; font-size: 13px; font-weight: 600;">${order.condition.charAt(0).toUpperCase() + order.condition.slice(1)}</span>` : ''}
                        <span style="padding: 6px 12px; background: #dcfce7; color: #059669; border-radius: 16px; font-size: 13px; font-weight: 600;">
                            <i class="fas fa-rupee-sign"></i> ${order.current_price || 0}/unit
                        </span>
                        ${order.mrp ? `<span style="padding: 6px 12px; background: #fef2f2; color: #dc2626; border-radius: 16px; font-size: 13px; font-weight: 600;">MRP: ₹${order.mrp}</span>` : ''}
                    </div>
                </div>
                
                <div style="background: #f9fafb; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
                    <h4 style="margin: 0 0 12px 0; color: #374151; font-size: 16px; font-weight: 600;">
                        <i class="fas fa-info-circle"></i> Material Details
                    </h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        ${order.listing_id ? `
                        <div>
                            <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Listing ID</div>
                            <div style="color: #1f2937; font-size: 14px; font-weight: 500;">${order.listing_id}</div>
                        </div>
                        ` : ''}
                        <div>
                            <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Ordered Quantity</div>
                            <div style="color: #1f2937; font-size: 14px; font-weight: 500;">${order.quantity} ${order.unit || 'units'}</div>
                        </div>
                        ${order.dimensions ? `
                        <div>
                            <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Dimensions</div>
                            <div style="color: #1f2937; font-size: 14px; font-weight: 500;">${order.dimensions}</div>
                        </div>
                        ` : ''}
                        ${order.weight ? `
                        <div>
                            <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Weight</div>
                            <div style="color: #1f2937; font-size: 14px; font-weight: 500;">${order.weight} kg</div>
                        </div>
                        ` : ''}
                    </div>
                    ${order.specs ? `
                    <div style="margin-top: 12px;">
                        <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Specifications</div>
                        <div style="color: #1f2937; font-size: 14px; font-weight: 500; line-height: 1.6; white-space: pre-wrap;">${order.specs}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px;">
            <div style="background: #eff6ff; border-radius: 12px; padding: 16px; border: 1px solid #bfdbfe;">
                <h4 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px; font-weight: 600;">
                    <i class="fas fa-user"></i> Buyer Information
                </h4>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div>
                        <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Name</div>
                        <div style="color: #1f2937; font-size: 14px; font-weight: 500;">${order.buyer_name}</div>
                    </div>
                    ${order.buyer_company ? `
                    <div>
                        <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Company</div>
                        <div style="color: #1f2937; font-size: 14px; font-weight: 500;">${order.buyer_company}</div>
                    </div>
                    ` : ''}
                    ${order.buyer_email ? `
                    <div>
                        <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Email</div>
                        <div style="color: #1f2937; font-size: 14px; font-weight: 500;">${order.buyer_email}</div>
                    </div>
                    ` : ''}
                    ${order.buyer_phone ? `
                    <div>
                        <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Phone</div>
                        <div style="color: #1f2937; font-size: 14px; font-weight: 500;">${order.buyer_phone}</div>
                    </div>
                    ` : ''}
                    ${order.shipping_address ? `
                    <div>
                        <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Shipping Address</div>
                        <div style="color: #1f2937; font-size: 14px; font-weight: 500; line-height: 1.5;">${order.shipping_address}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <div style="background: #f0fdf4; border-radius: 12px; padding: 16px; border: 1px solid #86efac;">
                <h4 style="margin: 0 0 12px 0; color: #065f46; font-size: 16px; font-weight: 600;">
                    <i class="fas fa-store"></i> Seller Information
                </h4>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div>
                        <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Name</div>
                        <div style="color: #1f2937; font-size: 14px; font-weight: 500;">${order.seller_name}</div>
                    </div>
                    ${order.seller_company ? `
                    <div>
                        <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Company</div>
                        <div style="color: #1f2937; font-size: 14px; font-weight: 500;">${order.seller_company}</div>
                    </div>
                    ` : ''}
                    ${order.seller_email ? `
                    <div>
                        <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Email</div>
                        <div style="color: #1f2937; font-size: 14px; font-weight: 500;">${order.seller_email}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
        
        <div style="background: #fff7ed; border-radius: 12px; padding: 16px; margin-top: 20px; border: 1px solid #fed7aa;">
            <h4 style="margin: 0 0 12px 0; color: #9a3412; font-size: 16px; font-weight: 600;">
                <i class="fas fa-shopping-cart"></i> Order Details
            </h4>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                <div>
                    <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Order Quantity</div>
                    <div style="color: #1f2937; font-size: 18px; font-weight: 700;">${order.quantity} ${order.unit || 'units'}</div>
                </div>
                <div>
                    <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Unit Price</div>
                    <div style="color: #1f2937; font-size: 18px; font-weight: 700;">${formatIndianCurrency(order.unit_price || order.current_price || 0)}</div>
                </div>
                <div>
                    <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Total Amount</div>
                    <div style="color: #059669; font-size: 18px; font-weight: 700;">${formatIndianCurrency(order.total_amount)}</div>
                </div>
            </div>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Status</div>
                        <span class="status-badge status-${order.status}" style="font-size: 14px;">
                            ${order.status.toUpperCase()}
                        </span>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Order Date</div>
                        <div style="color: #1f2937; font-size: 14px; font-weight: 500;">${formatDateTime(order.created_at)}</div>
                    </div>
                </div>
                ${order.notes ? `
                <div style="margin-top: 12px;">
                    <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Notes</div>
                    <div style="color: #1f2937; font-size: 14px; font-weight: 500; line-height: 1.6;">${order.notes}</div>
                </div>
                ` : ''}
                ${order.delivery_notes ? `
                <div style="margin-top: 12px;">
                    <div style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Delivery Notes</div>
                    <div style="color: #1f2937; font-size: 14px; font-weight: 500; line-height: 1.6;">${order.delivery_notes}</div>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

// Material Management
function viewMaterialDetails(materialId) {
    const material = materials.find(m => m.id === materialId);
    if (!material) return;
    
    // Parse photo - could be JSON array or base64 string
    let photos = [];
    
    console.log('Material detail photo debug:', {
        material: material.material,
        hasPhoto: !!material.photo,
        photoType: typeof material.photo,
        photoPreview: material.photo ? String(material.photo).substring(0, 100) : 'null'
    });
    
    if (material.photo) {
        const photoStr = String(material.photo).trim();
        
        // Skip empty strings, "null", "undefined"
        if (photoStr && photoStr !== '' && photoStr !== 'null' && photoStr !== 'undefined' && photoStr !== '""') {
            try {
                // Try parsing as JSON first
                const parsed = JSON.parse(photoStr);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Filter out invalid entries
                    photos = parsed.filter(p => p && String(p).trim() !== '' && String(p) !== 'null');
                } else if (parsed && typeof parsed === 'string' && parsed.trim() !== '') {
                    photos = [parsed.trim()];
                } else if (photoStr) {
                    photos = [photoStr];
                }
            } catch (e) {
                // Not JSON, use as-is (could be base64 or URL)
                if (photoStr.startsWith('data:image/') || photoStr.startsWith('http://') || photoStr.startsWith('https://') || photoStr.length > 100) {
                    // Likely base64 or URL
                    photos = [photoStr];
                }
            }
        }
    }
    
    const imageUrl = photos.length > 0 ? photos[0] : null;
    
    console.log('Parsed photos:', photos.length, imageUrl ? 'Has URL' : 'No URL');
    
    const detailsHTML = `
        <div class="detail-view-grid">
            <div class="detail-view-image">
                ${photos.length > 0 ? `
                    ${photos.length > 1 ? `
                        <div style="position: relative; width: 100%; height: 100%;">
                            <div id="material-detail-slideshow-${material.id}" style="position: relative; width: 100%; height: 100%; overflow: hidden;">
                                ${photos.map((photo, index) => `
                                    <img src="${photo}" 
                                         alt="${material.material} - Photo ${index + 1}" 
                                         class="material-detail-slide ${index === 0 ? 'active' : ''}"
                                         data-index="${index}"
                                         style="display: ${index === 0 ? 'block' : 'none'}; width: 100%; height: 100%; object-fit: contain; background: #f3f4f6; padding: 1rem;"
                                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                    <div style="display:none; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#9ca3af;">
                                        <i class="fas fa-image" style="font-size:3rem; margin-bottom:0.5rem; opacity: 0.5;"></i>
                                        <span style="font-size: 1rem; font-weight: 500;">No Image</span>
                                    </div>
                                `).join('')}
                            </div>
                            <button onclick="changeMaterialDetailSlide('${material.id}', -1)" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; z-index: 10;">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <button onclick="changeMaterialDetailSlide('${material.id}', 1)" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; z-index: 10;">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                            <div style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; z-index: 10;">
                                ${photos.map((_, index) => `
                                    <span class="material-detail-indicator ${index === 0 ? 'active' : ''}" 
                                          onclick="goToMaterialDetailSlide('${material.id}', ${index})"
                                          style="width: 10px; height: 10px; border-radius: 50%; background: ${index === 0 ? '#10b981' : 'rgba(255,255,255,0.5)'}; cursor: pointer; transition: background 0.3s;"></span>
                                `).join('')}
                            </div>
                        </div>
                    ` : `
                        <img src="${imageUrl}" alt="${material.material}" style="width: 100%; height: 100%; object-fit: contain; background: #f3f4f6; padding: 1rem;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div style="display:none; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#9ca3af;">
                            <i class="fas fa-image" style="font-size:3rem; margin-bottom:0.5rem; opacity: 0.5;"></i>
                            <span style="font-size: 1rem; font-weight: 500;">No Image</span>
                        </div>
                    `}
                ` : `
                    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#9ca3af; background: #f3f4f6;">
                        <i class="fas fa-image" style="font-size:3rem; margin-bottom:0.5rem; opacity: 0.5;"></i>
                        <span style="font-size: 1rem; font-weight: 500;">No Image</span>
                    </div>
                `}
            </div>
            
            <div class="detail-view-info">
                <div>
                    <h2 style="margin: 0 0 0.5rem 0; color: #1f2937;">${material.material}</h2>
                    ${material.brand ? `<p style="color: #6b7280; margin: 0 0 1rem 0;"><i class="fas fa-trademark"></i> ${material.brand}</p>` : ''}
                    <div class="price-highlight">${formatIndianCurrency(material.price_today)}</div>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
                        <span class="status-badge status-${material.listing_type}">
                            ${material.listing_type === 'resale' ? 'FOR SALE' : 
                              material.listing_type === 'sold' ? 'SOLD' : 'TRANSFER'}
                        </span>
                        <span class="badge">${material.category || 'Other'}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-info-circle"></i> Basic Information</h4>
                    <div class="detail-row">
                        <span class="detail-label">Listing ID:</span>
                        <span class="detail-value"><code>${material.listing_id || 'N/A'}</code></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Quantity:</span>
                        <span class="detail-value"><strong>${formatIndianNumber(material.quantity)}</strong> ${material.unit || 'pcs'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">MRP:</span>
                        <span class="detail-value">${formatIndianCurrency(material.mrp || 0)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Condition:</span>
                        <span class="detail-value">${material.condition ? material.condition.charAt(0).toUpperCase() + material.condition.slice(1) : 'Good'}</span>
                    </div>
                    ${material.dimensions ? `
                    <div class="detail-row">
                        <span class="detail-label">Dimensions:</span>
                        <span class="detail-value">${material.dimensions}</span>
                    </div>
                    ` : ''}
                    ${material.weight ? `
                    <div class="detail-row">
                        <span class="detail-label">Weight:</span>
                        <span class="detail-value">${material.weight} kg</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-building"></i> Project & Seller</h4>
                    <div class="detail-row">
                        <span class="detail-label">Project:</span>
                        <span class="detail-value">${material.project_name || 'No Project'}</span>
                    </div>
                    ${material.project_location ? `
                    <div class="detail-row">
                        <span class="detail-label">Location:</span>
                        <span class="detail-value">${material.project_location}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="detail-label">Seller:</span>
                        <span class="detail-value">${material.seller_name}</span>
                    </div>
                    ${material.seller_company ? `
                    <div class="detail-row">
                        <span class="detail-label">Company:</span>
                        <span class="detail-value">${material.seller_company}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-chart-line"></i> Activity</h4>
                    <div class="detail-row">
                        <span class="detail-label">Pending Requests:</span>
                        <span class="detail-value"><strong>${material.pending_requests || 0}</strong></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Completed Orders:</span>
                        <span class="detail-value"><strong>${material.completed_orders || 0}</strong></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Created:</span>
                        <span class="detail-value">${formatDateTime(material.created_at)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Updated:</span>
                        <span class="detail-value">${formatDateTime(material.updated_at)}</span>
                    </div>
                </div>
            </div>
        </div>
        
        ${material.specs ? `
        <div class="detail-section" style="margin-top: 2rem; grid-column: 1/-1;">
            <h4><i class="fas fa-list-ul"></i> Specifications</h4>
            <p style="margin: 0; white-space: pre-wrap; color: #374151;">${material.specs}</p>
        </div>
        ` : ''}
        
        <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: flex-end;">
            <button class="btn btn-secondary" onclick="closeMaterialDetailsModal()">
                <i class="fas fa-times"></i> Close
            </button>
            <button class="btn btn-warning" onclick="closeMaterialDetailsModal(); editMaterial('${material.id}')">
                <i class="fas fa-edit"></i> Edit Material
            </button>
        </div>
    `;
    
    document.getElementById('material-details-content').innerHTML = detailsHTML;
    document.getElementById('material-details-modal').classList.add('show');
}

function closeMaterialDetailsModal() {
    document.getElementById('material-details-modal').classList.remove('show');
}

function editMaterial(materialId) {
    const material = materials.find(m => m.id === materialId);
    if (!material) return;
    
    document.getElementById('edit-material-id').value = materialId;
    document.getElementById('edit-material-name').value = material.material;
    document.getElementById('edit-brand').value = material.brand || '';
    document.getElementById('edit-quantity').value = material.quantity;
    document.getElementById('edit-unit').value = material.unit || 'pcs';
    document.getElementById('edit-price').value = material.price_today;
    document.getElementById('edit-mrp').value = material.mrp || 0;
    document.getElementById('edit-category').value = material.category;
    document.getElementById('edit-condition').value = material.condition || 'good';
    document.getElementById('edit-listing-type').value = material.listing_type;
    document.getElementById('edit-inventory-type').value = material.inventory_type || 'surplus';
    document.getElementById('edit-specs').value = material.specs || '';
    document.getElementById('edit-photo').value = material.photo || '';
    
    // Show image preview if exists
    if (material.photo) {
        const previewContainer = document.getElementById('image-preview-container');
        const previewImg = document.getElementById('image-preview');
        previewImg.src = material.photo;
        previewContainer.style.display = 'block';
    } else {
        document.getElementById('image-preview-container').style.display = 'none';
    }
    
    document.getElementById('material-edit-modal').classList.add('show');
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('Please select an image file', 'error');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Image size should be less than 5MB', 'error');
        return;
    }
    
    try {
        // Create FormData
        const formData = new FormData();
        formData.append('image', file);
        
        // Upload to server
        const response = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Set the image URL in the photo field
            document.getElementById('edit-photo').value = result.imageUrl;
            
            // Show preview
            const previewContainer = document.getElementById('image-preview-container');
            const previewImg = document.getElementById('image-preview');
            previewImg.src = result.imageUrl;
            previewContainer.style.display = 'block';
            
            showNotification('Image uploaded successfully!', 'success');
        } else {
            showNotification('Failed to upload image: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showNotification('Failed to upload image', 'error');
    }
}

function closeMaterialEditModal() {
    document.getElementById('material-edit-modal').classList.remove('show');
    document.getElementById('material-edit-form').reset();
}

async function updateMaterial(e) {
    e.preventDefault();
    
    const materialId = document.getElementById('edit-material-id').value;
    const updateData = {
        material: document.getElementById('edit-material-name').value,
        brand: document.getElementById('edit-brand').value,
        quantity: parseInt(document.getElementById('edit-quantity').value),
        unit: document.getElementById('edit-unit').value,
        price_today: parseFloat(document.getElementById('edit-price').value),
        mrp: parseFloat(document.getElementById('edit-mrp').value) || 0,
        category: document.getElementById('edit-category').value,
        condition: document.getElementById('edit-condition').value,
        listing_type: document.getElementById('edit-listing-type').value,
        inventory_type: document.getElementById('edit-inventory-type').value,
        specs: document.getElementById('edit-specs').value,
        photo: document.getElementById('edit-photo').value
    };
    
    try {
        const response = await fetch(`/api/admin/materials/${materialId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification('Material updated successfully!', 'success');
            closeMaterialEditModal();
            loadMaterials();
        } else {
            showNotification('Failed to update material', 'error');
        }
    } catch (error) {
        console.error('Error updating material:', error);
        showNotification('Error updating material', 'error');
    }
}

async function deleteMaterial(materialId) {
    if (!confirm('Are you sure you want to delete this material? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/materials/${materialId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification('Material deleted successfully!', 'success');
            loadMaterials();
            loadSystemStats(); // Refresh stats
        } else {
            showNotification('Failed to delete material', 'error');
        }
    } catch (error) {
        console.error('Error deleting material:', error);
        showNotification('Error deleting material', 'error');
    }
}

// Export Functions
async function exportUsers() {
    try {
        const response = await fetch('/api/admin/export/users');
        if (response.ok) {
            const blob = await response.blob();
            downloadFile(blob, 'users-report.csv');
            showNotification('Users report exported successfully!', 'success');
        }
    } catch (error) {
        console.error('Error exporting users:', error);
        showNotification('Error exporting users', 'error');
    }
}

async function exportMaterials() {
    try {
        const response = await fetch('/api/admin/export/materials');
        if (response.ok) {
            const blob = await response.blob();
            downloadFile(blob, 'materials-report.csv');
            showNotification('Materials report exported successfully!', 'success');
        }
    } catch (error) {
        console.error('Error exporting materials:', error);
        showNotification('Error exporting materials', 'error');
    }
}

async function exportOrderRequests() {
    try {
        const response = await fetch('/api/admin/export/order-requests');
        if (response.ok) {
            const blob = await response.blob();
            downloadFile(blob, 'order-requests-report.csv');
            showNotification('Order requests report exported successfully!', 'success');
        }
    } catch (error) {
        console.error('Error exporting order requests:', error);
        showNotification('Error exporting order requests', 'error');
    }
}

async function exportOrders() {
    try {
        const response = await fetch('/api/admin/export/orders');
        if (response.ok) {
            const blob = await response.blob();
            downloadFile(blob, 'orders-report.csv');
            showNotification('Orders report exported successfully!', 'success');
        }
    } catch (error) {
        console.error('Error exporting orders:', error);
        showNotification('Error exporting orders', 'error');
    }
}

async function exportCompleteReport() {
    try {
        // Export all data as separate files in a zip-like experience
        showNotification('Preparing complete system export...', 'info');
        
        await Promise.all([
            exportUsers(),
            exportMaterials(), 
            exportOrderRequests(),
            exportOrders()
        ]);
        
        showNotification('Complete system export completed!', 'success');
    } catch (error) {
        console.error('Error exporting complete report:', error);
        showNotification('Error exporting complete report', 'error');
    }
}

function downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Utility Functions
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function signOut() {
    localStorage.removeItem('greenscore-user');
    window.location.href = '/auth.html';
}

// Make functions globally available
window.showAdminTab = showAdminTab;
window.loadUsers = loadUsers;
window.loadMaterials = loadMaterials;
window.loadOrderRequests = loadOrderRequests;
window.loadOrders = loadOrders;
window.editMaterial = editMaterial;
window.deleteMaterial = deleteMaterial;
window.closeMaterialEditModal = closeMaterialEditModal;
window.exportUsers = exportUsers;
window.exportMaterials = exportMaterials;
window.exportOrderRequests = exportOrderRequests;
window.exportOrders = exportOrders;
window.exportCompleteReport = exportCompleteReport;
// User Management Functions
function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById('edit-user-id').value = userId;
    document.getElementById('edit-user-name').value = user.name;
    document.getElementById('edit-user-email').value = user.email;
    document.getElementById('edit-user-company').value = user.company_name || '';
    document.getElementById('edit-user-type').value = user.user_type;
    document.getElementById('edit-user-status').value = user.verification_status || 'active';
    
    document.getElementById('user-edit-modal').classList.add('show');
}

function closeUserEditModal() {
    document.getElementById('user-edit-modal').classList.remove('show');
    document.getElementById('user-edit-form').reset();
}

async function updateUser(e) {
    e.preventDefault();
    
    const userId = document.getElementById('edit-user-id').value;
    const updateData = {
        name: document.getElementById('edit-user-name').value,
        email: document.getElementById('edit-user-email').value,
        company_name: document.getElementById('edit-user-company').value,
        user_type: document.getElementById('edit-user-type').value,
        verification_status: document.getElementById('edit-user-status').value
    };
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification('User updated successfully!', 'success');
            closeUserEditModal();
            loadUsers();
            loadSystemStats();
        } else {
            showNotification('Failed to update user', 'error');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showNotification('Error updating user', 'error');
    }
}

async function deleteUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    if (!confirm(`Are you sure you want to delete user "${user.name}" (${user.email})? This will also delete all their materials and orders. This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification('User deleted successfully!', 'success');
            loadUsers();
            loadSystemStats();
        } else {
            showNotification('Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Error deleting user', 'error');
    }
}

// Bulk Operations
let selectedItems = new Set();

function toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checked;
        if (checked) {
            selectedItems.add(cb.value);
        } else {
            selectedItems.delete(cb.value);
        }
    });
    updateBulkActionButton();
}

function toggleSelectItem(itemId, checked) {
    if (checked) {
        selectedItems.add(itemId);
    } else {
        selectedItems.delete(itemId);
    }
    updateBulkActionButton();
}

function updateBulkActionButton() {
    const bulkBtn = document.getElementById('bulk-action-btn');
    if (bulkBtn) {
        bulkBtn.disabled = selectedItems.size === 0;
        bulkBtn.textContent = selectedItems.size > 0 ? 
            `Bulk Actions (${selectedItems.size} selected)` : 'Bulk Actions';
    }
}

function closeBulkActionsModal() {
    document.getElementById('bulk-actions-modal').classList.remove('show');
}

async function bulkDelete() {
    if (!confirm(`Are you sure you want to delete ${selectedItems.size} items? This action cannot be undone.`)) {
        return;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (const itemId of selectedItems) {
        try {
            const response = await fetch(`/api/admin/materials/${itemId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                successCount++;
            } else {
                failCount++;
            }
        } catch (error) {
            failCount++;
        }
    }
    
    if (successCount > 0) {
        showNotification(`Successfully deleted ${successCount} items${failCount > 0 ? `, ${failCount} failed` : ''}`, 'success');
        selectedItems.clear();
        loadMaterials();
        loadSystemStats();
    } else {
        showNotification('Failed to delete items', 'error');
    }
    
    closeBulkActionsModal();
}

async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification(`Order status updated to ${status}`, 'success');
            loadOrders();
        } else {
            showNotification('Failed to update order status', 'error');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showNotification('Error updating order status', 'error');
    }
}

// Setup form event listeners
document.addEventListener('DOMContentLoaded', function() {
    const userEditForm = document.getElementById('user-edit-form');
    if (userEditForm) {
        userEditForm.addEventListener('submit', updateUser);
    }
});

window.signOut = signOut;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.closeUserEditModal = closeUserEditModal;
window.closeBulkActionsModal = closeBulkActionsModal;
window.toggleSelectAll = toggleSelectAll;
window.toggleSelectItem = toggleSelectItem;
window.bulkDelete = bulkDelete;
// Order Request Management
async function approveRequest(requestId) {
    try {
        const response = await fetch(`/api/admin/order-requests/${requestId}/approve`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification('Order request approved successfully!', 'success');
            loadOrderRequests();
            loadSystemStats();
        } else {
            showNotification('Failed to approve request', 'error');
        }
    } catch (error) {
        console.error('Error approving request:', error);
        showNotification('Error approving request', 'error');
    }
}

async function rejectRequest(requestId) {
    if (!confirm('Are you sure you want to reject this order request?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/order-requests/${requestId}/reject`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        if (result.success) {
            showNotification('Order request rejected', 'success');
            loadOrderRequests();
        } else {
            showNotification('Failed to reject request', 'error');
        }
    } catch (error) {
        console.error('Error rejecting request:', error);
        showNotification('Error rejecting request', 'error');
    }
}

// Simplified view for order requests (just basic info)
function viewRequestDetails(requestId) {
    const request = orderRequests.find(r => r.id === requestId);
    if (!request) {
        if (typeof showNotification === 'function') {
            showNotification('Request not found', 'error');
        } else {
            alert('Request not found');
        }
        return;
    }
    
    const modal = document.getElementById('request-details-modal');
    const content = document.getElementById('request-details-content');
    
    if (!modal || !content) {
        alert('Modal not found');
        return;
    }
    
    content.innerHTML = `
        <div style="padding: 20px;">
            <h3 style="margin-bottom: 16px; color: #1f2937;">Order Request #${request.id.substring(0, 8)}</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <h4 style="margin-bottom: 12px; color: #374151;">Material Information</h4>
                    <p><strong>Material:</strong> ${request.material_name}</p>
                    ${request.listing_id ? `<p><strong>Listing ID:</strong> ${request.listing_id}</p>` : ''}
                    <p><strong>Quantity:</strong> ${request.quantity} ${request.unit || 'units'}</p>
                    <p><strong>Total Amount:</strong> ${formatIndianCurrency(request.total_amount)}</p>
                </div>
                <div>
                    <h4 style="margin-bottom: 12px; color: #374151;">Buyer Information</h4>
                    <p><strong>Name:</strong> ${request.buyer_name}</p>
                    ${request.buyer_company ? `<p><strong>Company:</strong> ${request.buyer_company}</p>` : ''}
                    ${request.buyer_email ? `<p><strong>Email:</strong> ${request.buyer_email}</p>` : ''}
                    ${request.buyer_phone ? `<p><strong>Phone:</strong> ${request.buyer_phone}</p>` : ''}
                    ${request.delivery_address ? `<p><strong>Delivery Address:</strong> ${request.delivery_address}</p>` : ''}
                </div>
            </div>
            <div style="margin-top: 20px;">
                <p><strong>Status:</strong> <span class="status-badge status-${request.status}">${request.status.toUpperCase()}</span></p>
                <p><strong>Requested On:</strong> ${formatDateTime(request.created_at)}</p>
                ${request.notes ? `<p><strong>Notes:</strong> ${request.notes}</p>` : ''}
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}


function closeRequestDetailsModal() {
    const modal = document.getElementById('request-details-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('request-details-modal');
    if (modal && e.target === modal) {
        closeRequestDetailsModal();
    }
});

window.updateOrderStatus = updateOrderStatus;
window.approveRequest = approveRequest;
window.rejectRequest = rejectRequest;
window.viewRequestDetails = viewRequestDetails;
window.viewOrderDetails = viewOrderDetails;
window.closeRequestDetailsModal = closeRequestDetailsModal;
