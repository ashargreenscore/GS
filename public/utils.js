// Utility functions for GreenScore Marketplace

/**
 * Format large numbers in Indian number system (lacs/crores)
 * @param {number} amount - The amount to format
 * @param {boolean} showCurrency - Whether to show currency symbol
 * @returns {string} Formatted amount string
 */
function formatIndianCurrency(amount, showCurrency = true) {
    // Convert to number if it's a string, handle null/undefined/empty
    if (amount === null || amount === undefined || amount === '') {
        return showCurrency ? '₹0' : '0';
    }
    
    // Convert to number (handles string numbers from database)
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    
    // Check if conversion resulted in a valid number
    if (isNaN(numAmount) || !isFinite(numAmount)) {
        return showCurrency ? '₹0' : '0';
    }
    
    const absAmount = Math.abs(numAmount);
    const currencySymbol = showCurrency ? '₹' : '';
    
    if (absAmount >= 10000000) { // 1 crore = 10,000,000
        const crores = (numAmount / 10000000).toFixed(2);
        return `${currencySymbol}${crores} Cr`;
    } else if (absAmount >= 100000) { // 1 lac = 100,000
        const lacs = (numAmount / 100000).toFixed(2);
        return `${currencySymbol}${lacs} L`;
    } else if (absAmount >= 1000) { // 1 thousand
        const thousands = (numAmount / 1000).toFixed(1);
        return `${currencySymbol}${thousands}K`;
    } else {
        return `${currencySymbol}${numAmount.toFixed(2)}`;
    }
}

/**
 * Format numbers with Indian number system for display
 * @param {number} number - The number to format
 * @returns {string} Formatted number string
 */
function formatIndianNumber(number) {
    // Convert to number if it's a string, handle null/undefined/empty
    if (number === null || number === undefined || number === '') {
        return '0';
    }
    
    // Convert to number (handles string numbers from database)
    const numNumber = typeof number === 'string' ? parseFloat(number) : Number(number);
    
    // Check if conversion resulted in a valid number
    if (isNaN(numNumber) || !isFinite(numNumber)) {
        return '0';
    }
    
    const absNumber = Math.abs(numNumber);
    
    if (absNumber >= 10000000) { // 1 crore
        const crores = (numNumber / 10000000).toFixed(2);
        return `${crores} Cr`;
    } else if (absNumber >= 100000) { // 1 lac
        const lacs = (numNumber / 100000).toFixed(2);
        return `${lacs} L`;
    } else if (absNumber >= 1000) { // 1 thousand
        const thousands = (numNumber / 1000).toFixed(1);
        return `${thousands}K`;
    } else {
        return numNumber.toLocaleString('en-IN');
    }
}

/**
 * Format currency for small amounts (under 1 lac)
 * @param {number} amount - The amount to format
 * @param {boolean} showCurrency - Whether to show currency symbol
 * @returns {string} Formatted amount string
 */
function formatSmallCurrency(amount, showCurrency = true) {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return showCurrency ? '₹0' : '0';
    }
    
    const currencySymbol = showCurrency ? '₹' : '';
    return `${currencySymbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format date and time for display
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date and time string
 */
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    
    return date.toLocaleString('en-IN', options);
}

/**
 * Format date only (without time)
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };
    
    return date.toLocaleDateString('en-IN', options);
}

/**
 * Format time only (without date)
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted time string
 */
function formatTime(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid Time';
    
    const options = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    
    return date.toLocaleTimeString('en-IN', options);
}

/**
 * Get relative time string (e.g., "2 hours ago", "3 days ago")
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Relative time string
 */
function getRelativeTime(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    
    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
    if (diffDay < 30) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    
    return formatDateTime(dateString);
}

/**
 * Show a styled confirmation dialog
 * @param {string} message - The confirmation message
 * @param {string} title - The dialog title (optional)
 * @param {string} confirmText - Text for confirm button (default: "Confirm")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @returns {Promise<boolean>} Promise that resolves to true if confirmed, false if cancelled
 */
function showConfirmDialog(message, title = 'Confirm Action', confirmText = 'Confirm', cancelText = 'Cancel') {
    return new Promise((resolve) => {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'confirm-dialog-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease;
        `;
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
        `;
        
        dialog.innerHTML = `
            <div style="margin-bottom: 16px;">
                <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #1f2937;">${title}</h3>
                <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">${message}</p>
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
                <button class="confirm-dialog-cancel" style="
                    padding: 10px 20px;
                    background: #f3f4f6;
                    color: #374151;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                ">${cancelText}</button>
                <button class="confirm-dialog-confirm" style="
                    padding: 10px 20px;
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                ">${confirmText}</button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Button handlers
        const confirmBtn = dialog.querySelector('.confirm-dialog-confirm');
        const cancelBtn = dialog.querySelector('.confirm-dialog-cancel');
        
        const cleanup = () => {
            overlay.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => overlay.remove(), 200);
        };
        
        confirmBtn.onclick = () => {
            cleanup();
            resolve(true);
        };
        
        cancelBtn.onclick = () => {
            cleanup();
            resolve(false);
        };
        
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                cleanup();
                resolve(false);
            }
        };
        
        // Add hover effects
        confirmBtn.onmouseenter = () => confirmBtn.style.background = '#dc2626';
        confirmBtn.onmouseleave = () => confirmBtn.style.background = '#ef4444';
        cancelBtn.onmouseenter = () => cancelBtn.style.background = '#e5e7eb';
        cancelBtn.onmouseleave = () => cancelBtn.style.background = '#f3f4f6';
    });
}

/**
 * Auto-save form data to localStorage
 * @param {string} formId - The form element ID
 * @param {string} storageKey - The localStorage key to use
 */
function setupAutoSave(formId, storageKey) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    // Restore saved data on load
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            Object.keys(data).forEach(key => {
                const input = form.querySelector(`#${key}`);
                if (input) {
                    if (input.type === 'checkbox') {
                        input.checked = data[key];
                    } else {
                        input.value = data[key];
                    }
                }
            });
        } catch (e) {
            console.error('Error restoring form data:', e);
        }
    }
    
    // Save on input change (debounced)
    let saveTimeout;
    form.addEventListener('input', function(e) {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const formData = new FormData(form);
            const data = {};
            for (const [key, value] of formData.entries()) {
                data[key] = value;
            }
            // Also get checkbox values
            form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                data[checkbox.id] = checkbox.checked;
            });
            localStorage.setItem(storageKey, JSON.stringify(data));
        }, 1000); // Save after 1 second of inactivity
    });
    
    // Clear on successful submit
    form.addEventListener('submit', function() {
        localStorage.removeItem(storageKey);
    });
}

/**
 * Clear auto-saved form data
 * @param {string} storageKey - The localStorage key to clear
 */
function clearAutoSave(storageKey) {
    localStorage.removeItem(storageKey);
}

/**
 * Export data to CSV file
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {Array} columns - Optional array of column definitions [{key: 'field', label: 'Header'}]
 */
function exportToCSV(data, filename = 'export', columns = null) {
    if (!data || data.length === 0) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    // If columns not provided, auto-detect from first object
    if (!columns) {
        const firstItem = data[0];
        columns = Object.keys(firstItem).map(key => ({
            key: key,
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }));
    }
    
    // Create CSV header
    const headers = columns.map(col => col.label).join(',');
    
    // Create CSV rows
    const rows = data.map(item => {
        return columns.map(col => {
            let value = item[col.key];
            // Handle null/undefined
            if (value === null || value === undefined) value = '';
            // Convert to string and escape commas/quotes
            value = String(value);
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = '"' + value.replace(/"/g, '""') + '"';
            }
            return value;
        }).join(',');
    });
    
    // Combine header and rows
    const csvContent = [headers, ...rows].join('\n');
    
    // Add BOM for Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

/**
 * Export data to Excel (XLSX) format using CSV (Excel can open CSV)
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {Array} columns - Optional array of column definitions
 */
function exportToExcel(data, filename = 'export', columns = null) {
    // For now, use CSV format which Excel can open
    // In the future, can use a library like SheetJS for true XLSX
    exportToCSV(data, filename, columns);
}

// Export functions for use in other scripts
window.formatIndianCurrency = formatIndianCurrency;
window.formatIndianNumber = formatIndianNumber;
window.formatSmallCurrency = formatSmallCurrency;
window.formatDateTime = formatDateTime;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.getRelativeTime = getRelativeTime;
window.showConfirmDialog = showConfirmDialog;
window.setupAutoSave = setupAutoSave;
window.clearAutoSave = clearAutoSave;
window.exportToCSV = exportToCSV;
window.exportToExcel = exportToExcel;
window.createPaginationControls = createPaginationControls;
window.validateEmail = validateEmail;
window.validatePhone = validatePhone;
window.validateRequired = validateRequired;
window.validateNumberRange = validateNumberRange;
window.showFieldError = showFieldError;
window.hideFieldError = hideFieldError;
window.validateField = validateField;
window.validateForm = validateForm;
window.createSkeletonLoader = createSkeletonLoader;
window.showSkeletonLoader = showSkeletonLoader;
window.hideSkeletonLoader = hideSkeletonLoader;

/**
 * Create skeleton loading screen
 * @param {string} type - Type of skeleton ('card', 'list', 'table')
 * @param {number} count - Number of skeleton items
 * @returns {string} HTML string
 */
function createSkeletonLoader(type = 'card', count = 6) {
    const skeletons = [];
    
    for (let i = 0; i < count; i++) {
        if (type === 'card') {
            skeletons.push(`
                <div class="skeleton-card" style="
                    background: var(--card-bg);
                    border-radius: 12px;
                    padding: 1rem;
                    animation: pulse 1.5s ease-in-out infinite;
                ">
                    <div class="skeleton-image" style="
                        width: 100%;
                        height: 200px;
                        background: var(--bg-tertiary);
                        border-radius: 8px;
                        margin-bottom: 1rem;
                    "></div>
                    <div class="skeleton-line" style="
                        height: 20px;
                        background: var(--bg-tertiary);
                        border-radius: 4px;
                        margin-bottom: 0.5rem;
                        width: 80%;
                    "></div>
                    <div class="skeleton-line" style="
                        height: 16px;
                        background: var(--bg-tertiary);
                        border-radius: 4px;
                        margin-bottom: 0.5rem;
                        width: 60%;
                    "></div>
                    <div class="skeleton-line" style="
                        height: 16px;
                        background: var(--bg-tertiary);
                        border-radius: 4px;
                        width: 40%;
                    "></div>
                </div>
            `);
        } else if (type === 'list') {
            skeletons.push(`
                <div class="skeleton-list-item" style="
                    display: flex;
                    gap: 1rem;
                    padding: 1rem;
                    background: var(--card-bg);
                    border-radius: 8px;
                    margin-bottom: 0.5rem;
                    animation: pulse 1.5s ease-in-out infinite;
                ">
                    <div class="skeleton-avatar" style="
                        width: 50px;
                        height: 50px;
                        background: var(--bg-tertiary);
                        border-radius: 50%;
                        flex-shrink: 0;
                    "></div>
                    <div style="flex: 1;">
                        <div class="skeleton-line" style="
                            height: 20px;
                            background: var(--bg-tertiary);
                            border-radius: 4px;
                            margin-bottom: 0.5rem;
                            width: 70%;
                        "></div>
                        <div class="skeleton-line" style="
                            height: 16px;
                            background: var(--bg-tertiary);
                            border-radius: 4px;
                            width: 50%;
                        "></div>
                    </div>
                </div>
            `);
        } else if (type === 'table') {
            skeletons.push(`
                <tr class="skeleton-row" style="animation: pulse 1.5s ease-in-out infinite;">
                    <td><div class="skeleton-line" style="height: 16px; background: var(--bg-tertiary); border-radius: 4px; width: 80%;"></div></td>
                    <td><div class="skeleton-line" style="height: 16px; background: var(--bg-tertiary); border-radius: 4px; width: 60%;"></div></td>
                    <td><div class="skeleton-line" style="height: 16px; background: var(--bg-tertiary); border-radius: 4px; width: 70%;"></div></td>
                    <td><div class="skeleton-line" style="height: 16px; background: var(--bg-tertiary); border-radius: 4px; width: 50%;"></div></td>
                </tr>
            `);
        }
    }
    
    return skeletons.join('');
}

/**
 * Show loading skeleton
 * @param {string} containerId - ID of container to show skeleton in
 * @param {string} type - Type of skeleton
 * @param {number} count - Number of skeleton items
 */
function showSkeletonLoader(containerId, type = 'card', count = 6) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = createSkeletonLoader(type, count);
}

/**
 * Hide loading skeleton
 * @param {string} containerId - ID of container to clear
 */
function hideSkeletonLoader(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const skeletons = container.querySelectorAll('.skeleton-card, .skeleton-list-item, .skeleton-row');
    skeletons.forEach(s => s.remove());
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Validate phone number (Indian format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
function validatePhone(phone) {
    const re = /^[6-9]\d{9}$/;
    return re.test(phone.replace(/[\s-]/g, ''));
}

/**
 * Validate required field
 * @param {string} value - Value to validate
 * @param {string} fieldName - Name of field for error message
 * @returns {object} {valid: boolean, error: string}
 */
function validateRequired(value, fieldName = 'This field') {
    if (!value || value.trim() === '') {
        return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, error: null };
}

/**
 * Validate number range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} fieldName - Name of field for error message
 * @returns {object} {valid: boolean, error: string}
 */
function validateNumberRange(value, min, max, fieldName = 'This field') {
    const num = parseFloat(value);
    if (isNaN(num)) {
        return { valid: false, error: `${fieldName} must be a number` };
    }
    if (num < min) {
        return { valid: false, error: `${fieldName} must be at least ${min}` };
    }
    if (num > max) {
        return { valid: false, error: `${fieldName} must be at most ${max}` };
    }
    return { valid: true, error: null };
}

/**
 * Show field error
 * @param {HTMLElement} input - Input element
 * @param {string} message - Error message
 */
function showFieldError(input, message) {
    if (!input) return;
    
    // Remove existing error
    hideFieldError(input);
    
    // Add error class
    input.classList.add('error');
    input.style.borderColor = '#ef4444';
    
    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        color: #ef4444;
        font-size: 0.875rem;
        margin-top: 0.25rem;
        display: flex;
        align-items: center;
        gap: 0.25rem;
    `;
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    // Insert after input
    input.parentNode.insertBefore(errorDiv, input.nextSibling);
}

/**
 * Hide field error
 * @param {HTMLElement} input - Input element
 */
function hideFieldError(input) {
    if (!input) return;
    
    input.classList.remove('error');
    input.style.borderColor = '';
    
    const errorDiv = input.parentNode.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

/**
 * Validate form field
 * @param {HTMLElement} input - Input element
 * @param {Array} validators - Array of validator functions
 * @returns {boolean} True if valid
 */
function validateField(input, validators = []) {
    if (!input) return true;
    
    const value = input.value;
    let isValid = true;
    
    for (const validator of validators) {
        const result = validator(value, input);
        if (!result.valid) {
            showFieldError(input, result.error);
            isValid = false;
            break;
        }
    }
    
    if (isValid) {
        hideFieldError(input);
    }
    
    return isValid;
}

/**
 * Validate entire form
 * @param {HTMLElement} form - Form element
 * @param {object} fieldValidators - Object mapping field IDs to validator arrays
 * @returns {boolean} True if form is valid
 */
function validateForm(form, fieldValidators = {}) {
    if (!form) return false;
    
    let isValid = true;
    const fields = Object.keys(fieldValidators);
    
    fields.forEach(fieldId => {
        const input = form.querySelector(`#${fieldId}`);
        if (input) {
            const fieldValid = validateField(input, fieldValidators[fieldId]);
            if (!fieldValid) {
                isValid = false;
            }
        }
    });
    
    return isValid;
}

/**
 * Create pagination controls HTML
 * @param {number} currentPage - Current page number (1-based)
 * @param {number} totalPages - Total number of pages
 * @param {string} containerId - ID of container to append pagination to
 */
function createPaginationControls(currentPage, totalPages, containerId) {
    if (totalPages <= 1) return '';
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Remove existing pagination
    const existingPagination = container.querySelector('.pagination');
    if (existingPagination) existingPagination.remove();
    
    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    pagination.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;
        margin: 2rem 0;
        flex-wrap: wrap;
    `;
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            window.currentPage = currentPage - 1;
            if (window.onPageChange) window.onPageChange(currentPage - 1);
        }
    };
    prevBtn.style.cssText = `
        padding: 0.5rem 1rem;
        border: 1px solid var(--border-color);
        background: var(--card-bg);
        color: var(--text-primary);
        border-radius: 6px;
        cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'};
        opacity: ${currentPage === 1 ? 0.5 : 1};
    `;
    
    // Page numbers
    const pageNumbers = document.createElement('div');
    pageNumbers.style.cssText = 'display: flex; gap: 0.25rem; align-items: center;';
    
    // Show first page
    if (currentPage > 3) {
        const firstBtn = createPageButton(1, currentPage, totalPages);
        pageNumbers.appendChild(firstBtn);
        if (currentPage > 4) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.cssText = 'padding: 0 0.5rem; color: var(--text-secondary);';
            pageNumbers.appendChild(ellipsis);
        }
    }
    
    // Show pages around current
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    
    for (let i = start; i <= end; i++) {
        const pageBtn = createPageButton(i, currentPage, totalPages);
        pageNumbers.appendChild(pageBtn);
    }
    
    // Show last page
    if (currentPage < totalPages - 2) {
        if (currentPage < totalPages - 3) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.cssText = 'padding: 0 0.5rem; color: var(--text-secondary);';
            pageNumbers.appendChild(ellipsis);
        }
        const lastBtn = createPageButton(totalPages, currentPage, totalPages);
        pageNumbers.appendChild(lastBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            window.currentPage = currentPage + 1;
            if (window.onPageChange) window.onPageChange(currentPage + 1);
        }
    };
    nextBtn.style.cssText = `
        padding: 0.5rem 1rem;
        border: 1px solid var(--border-color);
        background: var(--card-bg);
        color: var(--text-primary);
        border-radius: 6px;
        cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'};
        opacity: ${currentPage === totalPages ? 0.5 : 1};
    `;
    
    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    pageInfo.style.cssText = 'color: var(--text-secondary); font-size: 0.875rem; margin: 0 1rem;';
    
    pagination.appendChild(prevBtn);
    pagination.appendChild(pageNumbers);
    pagination.appendChild(nextBtn);
    pagination.appendChild(pageInfo);
    
    container.appendChild(pagination);
}

function createPageButton(pageNum, currentPage, totalPages) {
    const btn = document.createElement('button');
    btn.textContent = pageNum;
    btn.className = 'pagination-page-btn';
    const isActive = pageNum === currentPage;
    btn.style.cssText = `
        min-width: 40px;
        height: 40px;
        border: 1px solid var(--border-color);
        background: ${isActive ? '#10b981' : 'var(--card-bg)'};
        color: ${isActive ? 'white' : 'var(--text-primary)'};
        border-radius: 6px;
        cursor: pointer;
        font-weight: ${isActive ? '600' : '400'};
        transition: all 0.2s;
    `;
    
    if (!isActive) {
        btn.onclick = () => {
            window.currentPage = pageNum;
            if (window.onPageChange) window.onPageChange(pageNum);
        };
        btn.onmouseenter = () => {
            if (!isActive) btn.style.background = 'var(--bg-tertiary)';
        };
        btn.onmouseleave = () => {
            if (!isActive) btn.style.background = 'var(--card-bg)';
        };
    }
    
    return btn;
}
