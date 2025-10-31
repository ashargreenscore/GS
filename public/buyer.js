// Buyer Marketplace JavaScript

let currentUser = null;
let materials = [];
let categories = [];
let cart = [];
let filteredMaterials = [];
let notifications = [];

// Initialize the buyer marketplace
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication - but allow guest browsing
    currentUser = getCurrentUser();
    
    // Update welcome message if user is signed in
    if (currentUser) {
        document.getElementById('buyer-welcome').textContent = 
            `Welcome, ${currentUser.name}! Find quality surplus construction materials at competitive prices`;
        
        // Initialize user profile if user is logged in
        initializeUserProfile();
    }
    
    loadCategories();
    loadMaterials();
    setupEventListeners();
    loadCart();
    loadNotifications();
    
    // Set up auto-refresh system
    setupAutoRefresh();
    
    // Set up periodic refresh for notifications
    setInterval(() => {
        loadNotifications();
    }, 30000); // Check every 30 seconds
    
    // Close notifications dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notifications-dropdown');
        const notificationBtn = e.target.closest('.notification-btn');
        if (dropdown && dropdown.style.display !== 'none' && !dropdown.contains(e.target) && !notificationBtn) {
            dropdown.style.display = 'none';
        }
    });
    
    // Setup account form submission
    setupAccountForm();
    
    // Setup profile account form submission
    setupProfileAccountForm();
});

// Authentication functions
function getCurrentUser() {
    const userStr = localStorage.getItem('greenscore-user');
    return userStr ? JSON.parse(userStr) : null;
}

function signOut() {
    localStorage.removeItem('greenscore-user');
    localStorage.removeItem('greenscore-cart'); // Clear cart on sign out
    window.location.href = '/';
}

// User Profile Dropdown Functions
async function initializeUserProfile() {
    if (!currentUser) return;
    
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
    const form = document.getElementById('account-form');
    if (form) form.reset();
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
    document.getElementById('account-project').value = user.project_name || '';
    document.getElementById('account-address').value = user.address || '';
    
    // Set designation if available
    const designationSelect = document.getElementById('account-designation');
    if (designationSelect) {
        designationSelect.value = user.designation || '';
    }
}

function setupAccountForm() {
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
                    
                    // Update welcome message
                    const buyerWelcome = document.getElementById('buyer-welcome');
                    if (buyerWelcome) {
                        buyerWelcome.textContent = 
                            `Welcome, ${updateData.name}! Find quality surplus construction materials at competitive prices`;
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
}

// Load categories from API
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        categories = await response.json();
        
        populateCategoryFilters();
        displayCategories();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load materials from API
async function loadMaterials() {
    try {
        const response = await fetch('/api/materials');
        materials = await response.json();
        
        filteredMaterials = [...materials];
        
        // Populate filters
        populateProjectFilters();
        populateLocationFilters();
        
        displayMaterials();
        updateCategoryCounts();
    } catch (error) {
        console.error('Error loading materials:', error);
        document.getElementById('products-grid').innerHTML = `
            <div class="no-products">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error loading materials</h3>
                <p>Please try refreshing the page.</p>
            </div>
        `;
    }
}

// Populate category filters
function populateCategoryFilters() {
    const categoryFilter = document.getElementById('category-filter');
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

// Populate project filters
function populateProjectFilters() {
    const projectFilter = document.getElementById('project-filter');
    
    // Clear existing options except "All Projects"
    projectFilter.innerHTML = '<option value="all">All Projects</option>';
    
    // Get unique projects from materials
    const projects = [...new Set(materials
        .filter(m => m.project_name)
        .map(m => m.project_name)
    )].sort();
    
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project;
        option.textContent = project;
        projectFilter.appendChild(option);
    });
}

// Populate location filters
function populateLocationFilters() {
    const locationFilter = document.getElementById('location-filter');
    
    // Clear existing options except "All Locations"
    locationFilter.innerHTML = '<option value="all">All Locations</option>';
    
    // Get unique locations from materials
    const locations = [...new Set(materials
        .filter(m => m.project_location)
        .map(m => m.project_location)
    )].sort();
    
    locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location;
        option.textContent = location;
        locationFilter.appendChild(option);
    });
}

// Display categories in sidebar
function displayCategories() {
    const categoryList = document.getElementById('category-list');
    
    const allCategory = document.createElement('div');
    allCategory.className = 'category-item active';
    allCategory.innerHTML = `
        <span>All Categories</span>
        <span class="category-count">${materials.length}</span>
    `;
    allCategory.addEventListener('click', () => selectCategory('all'));
    categoryList.appendChild(allCategory);
    
    categories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        categoryItem.innerHTML = `
            <span>${category}</span>
            <span class="category-count">0</span>
        `;
        categoryItem.addEventListener('click', () => selectCategory(category));
        categoryList.appendChild(categoryItem);
    });
}

// Update category counts
function updateCategoryCounts() {
    const categoryItems = document.querySelectorAll('.category-item');
    
    categoryItems.forEach((item, index) => {
        if (index === 0) {
            // All categories
            item.querySelector('.category-count').textContent = materials.length;
        } else {
            const category = categories[index - 1];
            const count = materials.filter(material => material.category === category).length;
            item.querySelector('.category-count').textContent = count;
        }
    });
}

// Select category
function selectCategory(category) {
    // Update active category
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
    
    event.target.closest('.category-item').classList.add('active');
    
    // Update filter and reload materials
    document.getElementById('category-filter').value = category === 'all' ? 'all' : category;
    filterMaterials();
}

// Display materials in grid
function displayMaterials() {
    const productsGrid = document.getElementById('products-grid');
    const productsTitle = document.getElementById('products-title');
    const productsCount = document.getElementById('products-count');
    
    if (filteredMaterials.length === 0) {
        productsGrid.innerHTML = `
            <div class="no-products">
                <i class="fas fa-search"></i>
                <h3>No materials found</h3>
                <p>Try adjusting your search criteria or browse different categories.</p>
            </div>
        `;
        productsCount.textContent = '0 items found';
        return;
    }
    
    productsCount.textContent = `${filteredMaterials.length} items found`;
    
    // Check if current user is admin
    const isAdmin = currentUser && currentUser.userType === 'admin';
    
    productsGrid.innerHTML = filteredMaterials.map(material => `
        <div class="product-card" onclick="${material.is_being_edited ? '' : `showProductModal('${material.id}')`}" style="position: relative; ${material.is_being_edited ? 'opacity: 0.7; cursor: not-allowed;' : ''}">
            ${material.is_being_edited ? `
                <div style="position: absolute; top: 10px; left: 10px; background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; z-index: 10;">
                    <i class="fas fa-lock"></i> Being Edited
                </div>
            ` : ''}
            ${isAdmin && !material.is_being_edited ? `
                <div class="admin-delete-btn" onclick="event.stopPropagation(); deleteMaterial('${material.id}')" title="Delete Material" style="position: absolute; top: 10px; right: 10px; background: #ef4444; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                    <i class="fas fa-trash" style="font-size: 14px;"></i>
                </div>
            ` : ''}
            <div class="product-image">
                ${material.photo ? 
                    `<img src="${material.photo}" alt="${material.material}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                     <div style="display:none; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#9ca3af;">
                         <i class="fas fa-image" style="font-size:2rem; margin-bottom:0.5rem;"></i>
                         <span>No Image</span>
                     </div>` :
                    `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#9ca3af;">
                         <i class="fas fa-image" style="font-size:2rem; margin-bottom:0.5rem;"></i>
                         <span>No Image</span>
                     </div>`
                }
            </div>
            <div class="product-info">
                <div class="product-header">
                    <span class="product-category">${material.category || 'Other'}</span>
                </div>
                <h3>${material.material}</h3>
                ${material.brand ? `<div class="product-brand">${material.brand}</div>` : ''}
                ${material.specs && material.specs.trim() ? `<div class="product-specs">${material.specs}</div>` : ''}
                <div class="product-meta">
                    <span><strong>Condition:</strong> ${material.condition ? material.condition.charAt(0).toUpperCase() + material.condition.slice(1) : 'Good'}</span>
                    <span><strong>Available:</strong> ${material.qty} ${material.unit || 'pcs'}</span>
                </div>
                <div class="product-footer">
                    <div class="product-price">₹${material.priceToday || 0}</div>
                    ${getCartButtonHTML(material)}
                </div>
            </div>
        </div>
    `).join('');
}

// Get cart button HTML for modal view (doesn't close modal)
function getModalCartButtonHTML(material) {
    const materialId = material.id;
    const maxQty = material.qty;
    const sellerId = material.seller_id || material.sellerId;
    
    // Check if item is being edited
    if (material.is_being_edited) {
        return `
            <div class="locked-item-notice" style="background: #fef2f2; color: #dc2626; padding: 8px; border-radius: 4px; text-align: center; font-size: 0.75rem;">
                <i class="fas fa-lock"></i>
                Being Updated
            </div>
        `;
    }
    
    // Prevent self-buying
    if (currentUser && currentUser.id === sellerId) {
        return `
            <div class="self-item-notice" style="background: #f3f4f6; color: #6b7280; padding: 8px; border-radius: 4px; text-align: center; font-size: 0.75rem;">
                <i class="fas fa-info-circle"></i>
                Your Item
            </div>
        `;
    }
    
    const cartItem = cart.find(item => item.materialId === materialId);
    
    if (cartItem) {
        // Item is in cart - show quantity controls
        return `
            <div class="cart-quantity-controls-modal" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.5rem;">
                <button onclick="updateCartQuantity('${materialId}', -1); updateModalCartControls('${materialId}');" style="width: 32px; height: 32px; border: none; background: #e5e7eb; color: #374151; border-radius: 6px; cursor: pointer; font-size: 0.875rem; display: flex; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background='#d1d5db'" onmouseout="this.style.background='#e5e7eb'">
                    <i class="fas fa-minus"></i>
                </button>
                <input type="number" 
                       id="modal-qty-${materialId}"
                       style="width: 60px; height: 32px; text-align: center; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem; font-weight: 600;"
                       value="${cartItem.quantity}" 
                       min="1" 
                       max="${maxQty}"
                       onchange="setCartQuantity('${materialId}', this.value, ${maxQty}); updateModalCartControls('${materialId}');">
                <button onclick="updateCartQuantity('${materialId}', 1); updateModalCartControls('${materialId}');" ${cartItem.quantity >= maxQty ? 'disabled' : ''} style="width: 32px; height: 32px; border: none; background: #10b981; color: white; border-radius: 6px; cursor: pointer; font-size: 0.875rem; display: flex; align-items: center; justify-content: center; transition: background 0.2s; ${cartItem.quantity >= maxQty ? 'opacity: 0.5; cursor: not-allowed;' : ''}" onmouseover="${cartItem.quantity >= maxQty ? '' : "this.style.background='#059669'"} onmouseout="${cartItem.quantity >= maxQty ? '' : "this.style.background='#10b981'"};">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
    } else {
        // Item not in cart - show add button
        return `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="number" 
                       id="modal-qty-${materialId}"
                       style="width: 60px; height: 32px; text-align: center; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem; font-weight: 600;"
                       value="1" 
                       min="1" 
                       max="${maxQty}"
                       placeholder="Qty">
                <button onclick="addToCartWithQtyFromModal('${materialId}', ${maxQty});" style="flex: 1; height: 32px; padding: 0 0.75rem; font-size: 0.75rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.375rem; transition: all 0.3s; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(59, 130, 246, 0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(59, 130, 246, 0.3)';">
                    <i class="fas fa-cart-plus" style="font-size: 0.7rem;"></i>
                    Add to Cart
                </button>
            </div>
        `;
    }
}

// Update cart controls in modal after cart changes
function updateModalCartControls(materialId) {
    const material = materials.find(m => m.id === materialId);
    if (!material) return;
    
    const controlsDiv = document.getElementById(`modal-cart-controls-${materialId}`);
    if (controlsDiv) {
        controlsDiv.innerHTML = getModalCartButtonHTML(material);
    }
}

// Add to cart from modal with quantity
function addToCartWithQtyFromModal(materialId, maxQty) {
    const material = materials.find(m => m.id === materialId);
    if (!material) return;
    
    // Check if material is being edited
    if (material.is_being_edited) {
        showNotification('This item is currently being updated. Please try again later.', 'error');
        return;
    }
    
    const qtyInput = document.getElementById(`modal-qty-${materialId}`);
    const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
    
    if (quantity < 1) {
        showNotification('Quantity must be at least 1', 'error');
        return;
    }
    
    if (quantity > maxQty) {
        showNotification(`Maximum available quantity is ${maxQty}`, 'error');
        return;
    }
    
    const existingItem = cart.find(item => item.materialId === materialId);
    
    if (existingItem) {
        if (existingItem.quantity + quantity <= maxQty) {
            existingItem.quantity += quantity;
        } else {
            existingItem.quantity = maxQty;
            showNotification(`Maximum quantity reached. Set to ${maxQty}`, 'warning');
        }
    } else {
        cart.push({
            materialId: materialId,
            material: material.material,
            brand: material.brand,
            price: material.priceToday || 0,
            unit: material.unit || 'pcs',
            maxQty: maxQty,
            quantity: quantity,
            sellerId: material.sellerId
        });
    }
    
    updateCartDisplay();
    updateModalCartControls(materialId); // Update modal controls
    saveCart();
    showNotification(`Added ${quantity} item(s) to cart`, 'success');
}

// Get cart button HTML based on whether item is in cart
function getCartButtonHTML(material) {
    const materialId = material.id;
    const maxQty = material.qty;
    const sellerId = material.seller_id || material.sellerId;
    
    // Check if item is being edited
    if (material.is_being_edited) {
        return `
            <div class="locked-item-notice" style="background: #fef2f2; color: #dc2626; padding: 8px; border-radius: 4px; text-align: center;">
                <i class="fas fa-lock"></i>
                Being Updated
            </div>
        `;
    }
    
    // Prevent self-buying
    if (currentUser && currentUser.id === sellerId) {
        return `
            <div class="self-item-notice">
                <i class="fas fa-info-circle"></i>
                Your Item
            </div>
        `;
    }
    
    const cartItem = cart.find(item => item.materialId === materialId);
    
    if (cartItem) {
        // Item is in cart - show quantity controls with input field
        return `
            <div class="cart-quantity-controls-enhanced">
                <button class="qty-btn minus" onclick="event.stopPropagation(); updateCartQuantity('${materialId}', -1)" title="Decrease quantity">
                    <i class="fas fa-minus"></i>
                </button>
                <input type="number" 
                       class="qty-input" 
                       value="${cartItem.quantity}" 
                       min="1" 
                       max="${maxQty}" 
                       onclick="event.stopPropagation();"
                       onchange="event.stopPropagation(); setCartQuantity('${materialId}', this.value, ${maxQty})"
                       onkeypress="event.stopPropagation();"
                       title="Type quantity or use arrows">
                <button class="qty-btn plus" onclick="event.stopPropagation(); updateCartQuantity('${materialId}', 1)" ${cartItem.quantity >= maxQty ? 'disabled' : ''} title="Increase quantity">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
    } else {
        // Item not in cart - show add button with quantity selector
        return `
            <div class="add-to-cart-container">
                <div class="qty-selector">
                    <input type="number" 
                           id="qty-select-${materialId}"
                           class="qty-input-small" 
                           value="1" 
                           min="1" 
                           max="${maxQty}"
                           onclick="event.stopPropagation();"
                           onkeypress="event.stopPropagation();"
                           placeholder="Qty">
                    <button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCartWithQty('${materialId}', ${maxQty})">
                        <i class="fas fa-cart-plus"></i>
                        Add to Cart
                    </button>
                </div>
            </div>
        `;
    }
}

// Filter materials
function filterMaterials() {
    const categoryFilter = document.getElementById('category-filter').value;
    const conditionFilter = document.getElementById('condition-filter').value;
    const projectFilter = document.getElementById('project-filter').value;
    const locationFilter = document.getElementById('location-filter').value;
    const sortFilter = document.getElementById('sort-filter').value;
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    filteredMaterials = [...materials];
    
    // Filter by category
    if (categoryFilter && categoryFilter !== 'all') {
        filteredMaterials = filteredMaterials.filter(material => 
            material.category === categoryFilter
        );
    }
    
    // Filter by condition
    if (conditionFilter && conditionFilter !== 'all') {
        filteredMaterials = filteredMaterials.filter(material => 
            material.condition === conditionFilter
        );
    }
    
    // Filter by project
    if (projectFilter && projectFilter !== 'all') {
        filteredMaterials = filteredMaterials.filter(material => 
            material.project_name === projectFilter
        );
    }
    
    // Filter by location
    if (locationFilter && locationFilter !== 'all') {
        filteredMaterials = filteredMaterials.filter(material => 
            material.project_location === locationFilter
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
    
    // Sort materials
    switch (sortFilter) {
        case 'price-low':
            filteredMaterials.sort((a, b) => (a.priceToday || 0) - (b.priceToday || 0));
            break;
        case 'price-high':
            filteredMaterials.sort((a, b) => (b.priceToday || 0) - (a.priceToday || 0));
            break;
        case 'newest':
        default:
            filteredMaterials.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
    }
    
    displayMaterials();
}

// Setup event listeners
function setupEventListeners() {
    // Search and filters
    document.getElementById('search-input').addEventListener('input', filterMaterials);
    document.getElementById('category-filter').addEventListener('change', filterMaterials);
    document.getElementById('condition-filter').addEventListener('change', filterMaterials);
    document.getElementById('project-filter').addEventListener('change', filterMaterials);
    document.getElementById('location-filter').addEventListener('change', filterMaterials);
    document.getElementById('sort-filter').addEventListener('change', filterMaterials);
    
    // Checkout form
    document.getElementById('checkout-form').addEventListener('submit', placeOrder);
    
    // Modal close events
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal();
            closeCheckoutModal();
        }
    });
}

// Delete material (admin only)
async function deleteMaterial(materialId) {
    // Check if user is admin
    if (!currentUser || currentUser.userType !== 'admin') {
        showNotification('Admin access required to delete materials', 'error');
        return;
    }
    
    const material = materials.find(m => m.id === materialId);
    if (!material) {
        showNotification('Material not found', 'error');
        return;
    }
    
    const confirmed = confirm(`Are you sure you want to delete "${material.material}"? This action cannot be undone.`);
    if (!confirmed) return;
    
    try {
        const response = await fetch(`/api/admin/materials/${materialId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Material "${material.material}" deleted successfully`, 'success');
            // Remove material from local array
            materials = materials.filter(m => m.id !== materialId);
            filteredMaterials = filteredMaterials.filter(m => m.id !== materialId);
            // Refresh display
            displayMaterials();
            updateCategoryCounts();
        } else {
            showNotification(result.error || 'Failed to delete material', 'error');
        }
    } catch (error) {
        console.error('Error deleting material:', error);
        showNotification('Failed to delete material', 'error');
    }
}

// Show product modal
function showProductModal(materialId) {
    const material = materials.find(m => m.id === materialId);
    if (!material) return;
    
    // Check if material is being edited
    if (material.is_being_edited) {
        showNotification('This item is currently being updated and cannot be viewed.', 'error');
        return;
    }
    
    const modal = document.getElementById('product-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    // Check if current user is admin
    const isAdmin = currentUser && currentUser.userType === 'admin';
    
    modalTitle.textContent = material.material;
    modalBody.innerHTML = `
        <!-- Full width image on top -->
        <div class="product-image" style="width: 100%; height: 400px; border-radius: 10px; overflow: hidden; margin-bottom: 1.25rem; background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
            ${material.photo ? 
                `<img src="${material.photo}" alt="${material.material}" style="width: 100%; height: 100%; object-fit: contain; background: #fff; padding: 0.75rem;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                 <div style="display:none; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#9ca3af;">
                     <i class="fas fa-image" style="font-size:2rem; margin-bottom:0.5rem; opacity: 0.5;"></i>
                     <span style="font-size: 0.875rem; font-weight: 500;">No Image</span>
                 </div>` :
                `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#9ca3af;">
                     <i class="fas fa-image" style="font-size:2rem; margin-bottom:0.5rem; opacity: 0.5;"></i>
                     <span style="font-size: 0.875rem; font-weight: 500;">No Image</span>
                 </div>`
            }
        </div>

        <!-- Material info sections -->
        <div style="display: grid; grid-template-columns: 1.75fr 1fr; gap: 1.25rem;">
            <!-- Left column: Details -->
            <div>
                <div style="margin-bottom: 0.75rem;">
                    <span class="product-category" style="display: inline-block; padding: 0.375rem 0.75rem; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); color: #1e40af; border-radius: 1rem; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                        ${material.category || 'Other'}
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
                        ${material.dimensions ? `
                        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                            <div style="color: #64748b; font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.025em;">Dimensions</div>
                            <div style="font-weight: 700; color: #0f172a; font-size: 0.875rem;">${material.dimensions}</div>
                        </div>
                        ` : ''}
                        ${material.weight ? `
                        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                            <div style="color: #64748b; font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.025em;">Weight</div>
                            <div style="font-weight: 700; color: #0f172a; font-size: 0.875rem;">${material.weight} <span style="font-size: 0.75rem; color: #64748b;">kg</span></div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                ${(material.project_name || material.project_location) ? `
                <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 1rem; border-radius: 8px; margin-bottom: 0.875rem; border: 1px solid #a7f3d0;">
                    <h4 style="margin: 0 0 0.625rem 0; color: #065f46; display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em;">
                        <i class="fas fa-map-marker-alt" style="font-size: 0.625rem;"></i>
                        <span>Location & Project</span>
                    </h4>
                    ${material.project_name ? `
                    <div style="margin-bottom: ${material.project_location ? '0.5rem' : '0'};">
                        <div style="color: #047857; font-size: 0.625rem; margin-bottom: 0.25rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.025em;">Project</div>
                        <div style="font-weight: 700; color: #064e3b; display: flex; align-items: center; gap: 0.25rem; font-size: 0.8125rem;">
                            <i class="fas fa-project-diagram" style="color: #10b981; font-size: 0.625rem;"></i>
                            <span>${material.project_name}</span>
                        </div>
                    </div>
                    ` : ''}
                    ${material.project_location ? `
                    <div>
                        <div style="color: #047857; font-size: 0.625rem; margin-bottom: 0.25rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.025em;">Location</div>
                        <div style="font-weight: 700; color: #064e3b; display: flex; align-items: center; gap: 0.25rem; font-size: 0.8125rem;">
                            <i class="fas fa-location-arrow" style="color: #10b981; font-size: 0.625rem;"></i>
                            <span>${material.project_location}</span>
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
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem; color: white; text-align: center; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 0; right: 0; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%; transform: translate(30%, -30%);"></div>
                    <div style="position: absolute; bottom: 0; left: 0; width: 50px; height: 50px; background: rgba(255,255,255,0.08); border-radius: 50%; transform: translate(-40%, 40%);"></div>
                    <div style="position: relative; z-index: 1;">
                        <div style="font-size: 0.625rem; margin-bottom: 0.5rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">Price per ${material.unit || 'piece'}</div>
                        <div style="font-size: 2rem; font-weight: 900; margin-bottom: 0.375rem; text-shadow: 0 2px 4px rgba(0,0,0,0.15); line-height: 1;">₹${material.priceToday || 0}</div>
                        ${material.mrp && material.mrp > material.priceToday ? `
                        <div style="font-size: 0.75rem; opacity: 0.95; margin-top: 0.5rem;">
                            <span style="text-decoration: line-through; opacity: 0.85;">₹${material.mrp}</span>
                            <span style="margin-left: 0.375rem; background: rgba(255,255,255,0.3); padding: 0.25rem 0.625rem; border-radius: 1rem; font-weight: 700; font-size: 0.6875rem;">
                                ${Math.round((1 - material.priceToday / material.mrp) * 100)}% OFF
                            </span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                ${!isAdmin ? `
                    <div id="modal-cart-controls-${material.id}" style="width: 100%;">
                        ${getModalCartButtonHTML(material)}
                    </div>
                ` : ''}

                ${isAdmin ? `
                    <button class="btn btn-danger" onclick="closeModal(); deleteMaterial('${material.id}')" style="width: 100%; padding: 0.625rem; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3); font-size: 0.75rem;">
                        <i class="fas fa-trash" style="font-size: 0.65rem;"></i>
                        Delete Material
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

// Close product modal
function closeModal() {
    document.getElementById('product-modal').classList.remove('show');
}

// Add to cart
function addToCart(materialId) {
    const material = materials.find(m => m.id === materialId);
    if (!material) return;
    
    // Check if material is being edited
    if (material.is_being_edited) {
        showNotification('This item is currently being updated. Please try again later.', 'error');
        return;
    }
    
    const existingItem = cart.find(item => item.materialId === materialId);
    
    if (existingItem) {
        if (existingItem.quantity < material.qty) {
            existingItem.quantity += 1;
        } else {
            showNotification('Maximum available quantity reached', 'error');
            return;
        }
    } else {
        cart.push({
            materialId: materialId,
            material: material.material,
            brand: material.brand,
            price: material.priceToday || 0,
            unit: material.unit || 'pcs',
            maxQty: material.qty,
            quantity: 1,
            sellerId: material.sellerId  // Add seller ID for grouping
        });
    }
    
    updateCartDisplay();
    displayMaterials(); // Refresh product display to show quantity controls
    saveCart();
    showNotification('Item added to cart', 'success');
}

// Add to cart with specified quantity
function addToCartWithQty(materialId, maxQty) {
    const material = materials.find(m => m.id === materialId);
    if (!material) return;
    
    // Check if material is being edited
    if (material.is_being_edited) {
        showNotification('This item is currently being updated. Please try again later.', 'error');
        return;
    }
    
    const qtyInput = document.getElementById(`qty-select-${materialId}`);
    const quantity = parseInt(qtyInput.value) || 1;
    
    if (quantity < 1) {
        showNotification('Please enter a valid quantity', 'error');
        return;
    }
    
    if (quantity > maxQty) {
        showNotification(`Maximum available quantity is ${maxQty}`, 'error');
        qtyInput.value = maxQty;
        return;
    }
    
    const existingItem = cart.find(item => item.materialId === materialId);
    
    if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > material.qty) {
            showNotification(`Can only add ${material.qty - existingItem.quantity} more items`, 'error');
            return;
        }
        existingItem.quantity = newQuantity;
    } else {
        cart.push({
            materialId: materialId,
            material: material.material,
            brand: material.brand,
            price: material.priceToday || 0,
            unit: material.unit || 'pcs',
            maxQty: material.qty,
            quantity: quantity,
            sellerId: material.sellerId
        });
    }
    
    updateCartDisplay();
    displayMaterials(); // Refresh product display to show quantity controls
    saveCart();
    showNotification(`Added ${quantity} ${material.unit || 'item(s)'} to cart`, 'success');
}

// Set cart quantity directly from input
function setCartQuantity(materialId, value, maxQty) {
    // Check if modal is open
    const modal = document.getElementById('product-modal');
    const isModalOpen = modal && modal.classList.contains('show');
    const quantity = parseInt(value) || 1;
    
    if (quantity < 1) {
        removeFromCart(materialId);
        // Update modal controls if modal is open
        if (isModalOpen) {
            updateModalCartControls(materialId);
        }
        return;
    }
    
    if (quantity > maxQty) {
        showNotification(`Maximum available quantity is ${maxQty}`, 'error');
        // Reset the input to max value
        const inputs = document.querySelectorAll('.qty-input');
        inputs.forEach(input => {
            if (input.onchange && input.onchange.toString().includes(materialId)) {
                input.value = maxQty;
            }
        });
        // Also reset modal input if exists
        const modalInput = document.getElementById(`modal-qty-${materialId}`);
        if (modalInput) {
            modalInput.value = maxQty;
        }
        updateCartQuantity(materialId, maxQty - cart.find(item => item.materialId === materialId).quantity);
        return;
    }
    
    const item = cart.find(item => item.materialId === materialId);
    if (item) {
        item.quantity = quantity;
        updateCartDisplay();
        displayMaterials();
        saveCart();
        
        // Update modal controls if modal is open
        if (isModalOpen) {
            updateModalCartControls(materialId);
        }
    }
}

// Update cart display
function updateCartDisplay() {
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartPlatformFee = document.getElementById('cart-platform-fee');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Your cart is empty</p>
                <small>Add some materials to get started</small>
            </div>
        `;
        checkoutBtn.disabled = true;
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.material}</h4>
                    <div class="cart-item-meta">${item.brand || 'Generic'} • ₹${item.price} per ${item.unit}</div>
                    <div class="cart-item-controls">
                        <div class="qty-control-enhanced">
                            <button class="qty-btn-cart" onclick="updateCartQuantity('${item.materialId}', -1)" title="Decrease">
                                <i class="fas fa-minus"></i>
                            </button>
                            <input type="number" 
                                   class="qty-input-cart" 
                                   value="${item.quantity}" 
                                   min="1" 
                                   max="${item.maxQty}"
                                   onchange="setCartQuantity('${item.materialId}', this.value, ${item.maxQty})"
                                   title="Type quantity">
                            <button class="qty-btn-cart" onclick="updateCartQuantity('${item.materialId}', 1)" ${item.quantity >= item.maxQty ? 'disabled' : ''} title="Increase">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <button class="remove-item" onclick="removeFromCart('${item.materialId}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="cart-item-price">${formatIndianCurrency(item.price * item.quantity)}</div>
            </div>
        `).join('');
        checkoutBtn.disabled = false;
    }
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const platformFee = subtotal * 0.03; // 3% platform fee
    const total = subtotal + platformFee;
    
    cartSubtotal.textContent = formatIndianCurrency(subtotal);
    cartPlatformFee.textContent = formatIndianCurrency(platformFee);
    cartTotal.textContent = formatIndianCurrency(total);
}

// Update cart item quantity
function updateCartQuantity(materialId, change) {
    // Check if modal is open for this material
    const modal = document.getElementById('product-modal');
    const isModalOpen = modal && modal.classList.contains('show');
    const item = cart.find(item => item.materialId === materialId);
    if (!item) return;
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
        removeFromCart(materialId);
        return;
    }
    
    if (newQuantity > item.maxQty) {
        showNotification('Maximum available quantity reached', 'error');
        return;
    }
    
    item.quantity = newQuantity;
    updateCartDisplay();
    displayMaterials(); // Refresh product display to update quantity controls
    saveCart();
    
    // Update modal controls if modal is open
    if (isModalOpen) {
        updateModalCartControls(materialId);
    }
}

// Remove from cart
function removeFromCart(materialId) {
    cart = cart.filter(item => item.materialId !== materialId);
    updateCartDisplay();
    displayMaterials(); // Refresh product display to show add button again
    saveCart();
    showNotification('Item removed from cart', 'success');
}

// Clear cart
function clearCart() {
    cart = [];
    updateCartDisplay();
    saveCart();
    showNotification('Cart cleared', 'success');
}

// Toggle cart sidebar
function toggleCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    cartSidebar.classList.toggle('open');
}

// Checkout
function checkout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty', 'error');
        return;
    }
    
    // Check if user is logged in for checkout
    if (!currentUser) {
        showNotification('Please sign in to complete your purchase', 'error');
        setTimeout(() => {
            window.location.href = '/auth.html';
        }, 2000);
        return;
    }
    
    const modal = document.getElementById('checkout-modal');
    const checkoutItems = document.getElementById('checkout-items');
    const checkoutSubtotal = document.getElementById('checkout-subtotal');
    const checkoutPlatformFee = document.getElementById('checkout-platform-fee');
    const checkoutTotal = document.getElementById('checkout-total');
    
    // Populate checkout items
    checkoutItems.innerHTML = cart.map(item => `
        <div class="checkout-item">
            <div>
                <strong>${item.material}</strong><br>
                <small>${item.brand || 'Generic'} • ${item.quantity} ${item.unit} × ₹${item.price}</small>
            </div>
            <div>${formatIndianCurrency(item.price * item.quantity)}</div>
        </div>
    `).join('');
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const platformFee = subtotal * 0.03;
    const total = subtotal + platformFee;
    
    checkoutSubtotal.textContent = formatIndianCurrency(subtotal);
    checkoutPlatformFee.textContent = formatIndianCurrency(platformFee);
    checkoutTotal.textContent = formatIndianCurrency(total);
    
    // Auto-fill checkout form with user data
    if (currentUser) {
        document.getElementById('company-name').value = currentUser.company_name || currentUser.companyName || '';
        document.getElementById('contact-person').value = currentUser.name || '';
        document.getElementById('email').value = currentUser.email || '';
        document.getElementById('phone').value = currentUser.phone || '';
        document.getElementById('delivery-address').value = currentUser.address || '';
    }
    
    modal.classList.add('show');
}

// Close checkout modal
function closeCheckoutModal() {
    document.getElementById('checkout-modal').classList.remove('show');
}

// Place order
async function placeOrder(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const buyerId = currentUser ? currentUser.id : 'guest-' + Date.now();
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const platformFee = subtotal * 0.03;
    const total = subtotal + platformFee;
    
    // Create individual order requests for each item
    const companyName = document.getElementById('company-name').value;
    const contactPerson = document.getElementById('contact-person').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const deliveryAddress = document.getElementById('delivery-address').value;
    
    try {
        // Generate a batch ID for grouping these orders
        const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Group items by seller
        const itemsBySeller = {};
        cart.forEach(item => {
            if (!itemsBySeller[item.sellerId]) {
                itemsBySeller[item.sellerId] = [];
            }
            itemsBySeller[item.sellerId].push(item);
        });
        
        const requestPromises = cart.map(item => {
            const requestData = {
                buyerId: buyerId,
                materialId: item.materialId,
                quantity: item.quantity,
                companyName,
                contactPerson,
                email,
                phone,
                deliveryAddress,
                deliveryNotes: `Order from ${companyName} for ${item.material}`,
                batchId: batchId  // Add batch ID to group orders
            };
            
            return fetch('/api/order-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
        });
        
        const responses = await Promise.all(requestPromises);
        const results = await Promise.all(responses.map(r => r.json()));
        
        // Check if all requests were successful
        const allSuccessful = results.every(result => result.success);
        
        if (allSuccessful) {
            // Create consolidated notifications for each seller
            for (const [sellerId, items] of Object.entries(itemsBySeller)) {
                const sellerTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                
                await fetch('/api/order-requests/batch-notification', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sellerId,
                        buyerId,
                        companyName,
                        items: items.map(item => ({
                            material: item.material,
                            quantity: item.quantity,
                            totalAmount: item.price * item.quantity
                        })),
                        totalAmount: sellerTotal
                    })
                });
            }
            
            showNotification(`${cart.length} order request(s) submitted successfully! Sellers will review and respond.`, 'success');
            
            // Clear cart and close modals
            cart = [];
            updateCartDisplay();
            saveCart();
            closeCheckoutModal();
            toggleCart();
            
            // Reload materials to update quantities
            loadMaterials();
        } else {
            const failedCount = results.filter(result => !result.success).length;
            showNotification(`${failedCount} order request(s) failed. Please try again.`, 'error');
        }
    } catch (error) {
        showNotification('Error placing order. Please try again.', 'error');
        console.error('Order error:', error);
    }
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('greenscore-cart', JSON.stringify(cart));
}

// Load cart from localStorage
function loadCart() {
    const savedCart = localStorage.getItem('greenscore-cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartDisplay();
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Make functions global
window.toggleCart = toggleCart;
window.clearCart = clearCart;
window.setCartQuantity = setCartQuantity;
window.addToCartWithQty = addToCartWithQty;
// Auto-refresh system for buyer marketplace
let refreshInterval = null;
let isPageVisible = true;
let lastRefreshTime = Date.now();

function setupAutoRefresh() {
    console.log('🔄 Setting up buyer auto-refresh system...');
    
    // Refresh when page becomes visible (user switches back to tab)
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            isPageVisible = false;
            console.log('📱 Buyer page hidden - pausing auto-refresh');
            if (refreshInterval) {
                clearInterval(refreshInterval);
                refreshInterval = null;
            }
        } else {
            isPageVisible = true;
            console.log('📱 Buyer page visible - resuming auto-refresh');
            
            // Refresh immediately if it's been more than 30 seconds
            const timeSinceLastRefresh = Date.now() - lastRefreshTime;
            if (timeSinceLastRefresh > 30000) {
                console.log('⏰ Refreshing marketplace after tab switch...');
                refreshMarketplace();
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
    
    // Refresh every 60 seconds when page is visible (less frequent for buyers)
    refreshInterval = setInterval(() => {
        if (isPageVisible) {
            console.log('🔄 Periodic marketplace refresh...');
            refreshMarketplace();
        }
    }, 60000);
    
    console.log('✅ Buyer periodic refresh started (60 second intervals)');
}

async function refreshMarketplace() {
    try {
        showRefreshIndicator(true);
        
        // Refresh materials and categories
        await Promise.all([
            loadMaterials(),
            loadCategories()
        ]);
        
        lastRefreshTime = Date.now();
        console.log('✅ Marketplace refresh completed');
        
        // Show brief success indicator
        setTimeout(() => showRefreshIndicator(false, 'success'), 500);
        
    } catch (error) {
        console.error('❌ Error refreshing marketplace:', error);
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
        indicator.innerHTML = '<i class="fas fa-sync fa-spin"></i> Updating...';
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

// Manual refresh function for buyers
function manualRefresh() {
    console.log('🔄 Manual marketplace refresh triggered');
    refreshMarketplace();
}

// Notifications system
async function loadNotifications() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`/api/notifications/${currentUser.id}`);
        const data = await response.json();
        
        if (data.success) {
            notifications = data.notifications || [];
            updateNotificationBadge();
            displayNotifications();
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    const unreadCount = notifications.filter(n => !n.read).length;
    
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

function displayNotifications() {
    const listContainer = document.getElementById('notifications-list');
    if (!listContainer) return;
    
    if (notifications.length === 0) {
        listContainer.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #6b7280;">
                <i class="fas fa-bell-slash" style="font-size: 48px; margin-bottom: 10px; opacity: 0.3;"></i>
                <p>No notifications yet</p>
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = notifications.map(notification => `
        <div class="notification-item" style="padding: 15px; border-bottom: 1px solid #e5e7eb; ${!notification.read ? 'background: #f0f9ff;' : ''} cursor: pointer;" onclick="markNotificationRead('${notification.id}')">
            <div style="display: flex; align-items: start; gap: 12px;">
                <div style="width: 40px; height: 40px; background: ${notification.type === 'order_approved' ? '#10b981' : '#ef4444'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;">
                    <i class="fas ${notification.type === 'order_approved' ? 'fa-check' : 'fa-times'}"></i>
                </div>
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 5px 0; color: #1f2937; font-size: 14px; font-weight: 600;">${notification.title}</h4>
                    <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 13px;">${notification.message}</p>
                    <small style="color: #9ca3af; font-size: 12px;">
                        <i class="fas fa-clock"></i> ${new Date(notification.created_at).toLocaleString()}
                    </small>
                </div>
            </div>
        </div>
    `).join('');
}

function toggleNotifications() {
    const dropdown = document.getElementById('notifications-dropdown');
    if (dropdown) {
        if (dropdown.style.display === 'none') {
            dropdown.style.display = 'block';
            loadNotifications();
        } else {
            dropdown.style.display = 'none';
        }
    }
}

async function markNotificationRead(notificationId) {
    try {
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            const notification = notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
                updateNotificationBadge();
                displayNotifications();
            }
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function clearAllNotifications() {
    if (!currentUser) return;
    
    if (!confirm('Clear all notifications?')) return;
    
    try {
        const response = await fetch(`/api/notifications/${currentUser.id}/clear`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            notifications = [];
            updateNotificationBadge();
            displayNotifications();
        }
    } catch (error) {
        console.error('Error clearing notifications:', error);
    }
}

// Profile Page Functions
let profileOrders = [];
let profileOrderRequests = [];

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
        
        // Load orders
        const ordersResponse = await fetch(`/api/buyer/orders?userId=${currentUser.id}`);
        if (ordersResponse.ok) {
            const ordersResult = await ordersResponse.json();
            if (ordersResult.success) {
                profileOrders = ordersResult.orders || [];
                displayProfileOrders();
                updateProfileStats();
            }
        }
        
        // Load order requests
        const requestsResponse = await fetch(`/api/buyer/order-requests?userId=${currentUser.id}`);
        if (requestsResponse.ok) {
            const requestsResult = await requestsResponse.json();
            if (requestsResult.success) {
                profileOrderRequests = requestsResult.requests || [];
                displayProfileRequests();
                updateProfileStats();
            }
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
    const completedOrders = profileOrders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
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
                <p style="font-size: 1.1rem; font-weight: 500;">No orders yet</p>
                <p style="margin-top: 0.5rem;">Start shopping to see your orders here</p>
            </div>
        `;
        
        if (recentOrders) {
            recentOrders.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #6b7280;">
                    <i class="fas fa-shopping-bag" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                    <p>No recent orders</p>
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
                                <div style="color: #6b7280; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem;">Seller</div>
                                <div style="font-size: 0.875rem; font-weight: 500;">${order.seller_name}${order.seller_company ? ` (${order.seller_company})` : ''}</div>
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
                <p style="margin-top: 0.5rem;">Your order requests will appear here</p>
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
                                <div style="color: #6b7280; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem;">Seller</div>
                                <div style="font-size: 0.875rem; font-weight: 500;">${request.seller_name}${request.seller_company ? ` (${request.seller_company})` : ''}</div>
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
            } else {
                showNotification(result.error || 'Failed to update account', 'error');
            }
        } catch (error) {
            console.error('Error updating account:', error);
            showNotification('Error updating account. Please try again.', 'error');
        }
    });
}

window.checkout = checkout;
window.closeModal = closeModal;
window.closeCheckoutModal = closeCheckoutModal;
window.showProductModal = showProductModal;
window.addToCart = addToCart;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.signOut = signOut;
window.refreshMarketplace = refreshMarketplace;
window.manualRefresh = manualRefresh;
window.deleteMaterial = deleteMaterial;
window.openProfilePage = openProfilePage;
window.closeProfilePage = closeProfilePage;
window.switchProfileTab = switchProfileTab;
