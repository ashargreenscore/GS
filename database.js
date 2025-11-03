const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const EmailService = require('./EmailService');

class Database {
  constructor() {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
      console.error('Please set DATABASE_URL to your PostgreSQL connection string.');
      console.error('Example: postgresql://user:password@host:port/database');
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    // Initialize PostgreSQL connection pool
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false
    });
    
    // Handle connection errors
    this.pool.on('error', (err) => {
      console.error('❌ Unexpected error on idle PostgreSQL client:', err);
    });
    
    // Test connection
    this.pool.query('SELECT NOW()')
      .then(() => {
        console.log('✅ Connected to PostgreSQL database');
      })
      .catch((err) => {
        console.error('❌ Failed to connect to PostgreSQL:', err.message);
        console.error('Please check your DATABASE_URL connection string');
      });
    
    // Initialize email service
    this.emailService = new EmailService();
    
    // Initialize tables asynchronously
    this.initTables();
  }

  async initTables() {
    try {
      // Users table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          company_name TEXT,
          phone TEXT,
          designation TEXT,
          user_type TEXT NOT NULL,
          verification_status TEXT DEFAULT 'pending',
          is_active BOOLEAN DEFAULT TRUE,
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Add designation column if it doesn't exist (for existing databases)
      try {
        await this.pool.query(`ALTER TABLE users ADD COLUMN designation TEXT`);
      } catch (err) {
        if (!err.message.includes('duplicate column') && !err.message.includes('already exists')) {
          console.error('Error adding designation column:', err.message);
        }
      }
      
      // Add default_project_id column if it doesn't exist (for existing databases)
      try {
        await this.pool.query(`ALTER TABLE users ADD COLUMN default_project_id TEXT`);
      } catch (err) {
        if (!err.message.includes('duplicate column') && !err.message.includes('already exists')) {
          console.error('Error adding default_project_id column:', err.message);
        }
      }
      
      // Add project_name column if it doesn't exist (for existing databases)
      try {
        await this.pool.query(`ALTER TABLE users ADD COLUMN project_name TEXT`);
      } catch (err) {
        if (!err.message.includes('duplicate column') && !err.message.includes('already exists')) {
          console.error('Error adding project_name column:', err.message);
        }
      }
      
      // Add address column if it doesn't exist (for existing databases)
      try {
        await this.pool.query(`ALTER TABLE users ADD COLUMN address TEXT`);
      } catch (err) {
        if (!err.message.includes('duplicate column') && !err.message.includes('already exists')) {
          console.error('Error adding address column:', err.message);
        }
      }

      // Create or update default admin user (password: admin123)
      setTimeout(() => {
        this.ensureAdminUser();
      }, 500);

      // Projects table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          seller_id TEXT NOT NULL,
          name TEXT NOT NULL,
          location TEXT,
          description TEXT,
          status TEXT DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (seller_id) REFERENCES users (id)
        )
      `);

      // Materials table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS materials (
          id TEXT PRIMARY KEY,
          listing_id TEXT UNIQUE,
          seller_id TEXT NOT NULL,
          project_id TEXT,
          material TEXT NOT NULL,
          brand TEXT,
          category TEXT,
          condition TEXT DEFAULT 'good',
          quantity INTEGER NOT NULL,
          unit TEXT DEFAULT 'pcs',
          price_today NUMERIC NOT NULL,
          mrp NUMERIC DEFAULT 0,
          price_purchased NUMERIC DEFAULT 0,
          inventory_value NUMERIC DEFAULT 0,
          inventory_type TEXT DEFAULT 'surplus',
          listing_type TEXT DEFAULT 'resale',
          acquisition_type TEXT DEFAULT 'purchased',
          specs TEXT,
          photo TEXT,
          specs_photo TEXT,
          dimensions TEXT,
          weight NUMERIC,
          location_details TEXT,
          is_being_edited BOOLEAN DEFAULT FALSE,
          edit_started_at TIMESTAMP,
          edited_by TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (seller_id) REFERENCES users (id),
          FOREIGN KEY (project_id) REFERENCES projects (id),
          FOREIGN KEY (edited_by) REFERENCES users (id)
        )
      `);

      // Order requests table (simple purchase requests)
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS order_requests (
          id TEXT PRIMARY KEY,
          material_id TEXT NOT NULL,
          buyer_id TEXT NOT NULL,
          seller_id TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price NUMERIC NOT NULL,
          total_amount NUMERIC NOT NULL,
          status TEXT DEFAULT 'pending',
          buyer_company TEXT,
          buyer_contact_person TEXT,
          buyer_email TEXT,
          buyer_phone TEXT,
          delivery_address TEXT,
          delivery_notes TEXT,
          seller_notes TEXT,
          fulfilled_quantity INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          approved_at TIMESTAMP,
          FOREIGN KEY (material_id) REFERENCES materials (id),
          FOREIGN KEY (buyer_id) REFERENCES users (id),
          FOREIGN KEY (seller_id) REFERENCES users (id)
        )
      `);

      // Orders table (for approved order requests)
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          order_request_id TEXT NOT NULL,
          buyer_id TEXT NOT NULL,
          seller_id TEXT NOT NULL,
          material_id TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price NUMERIC NOT NULL,
          total_amount NUMERIC NOT NULL,
          platform_fee NUMERIC NOT NULL,
          status TEXT DEFAULT 'approved',
          shipping_address TEXT,
          delivery_notes TEXT,
          tracking_number TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          shipped_at TIMESTAMP,
          delivered_at TIMESTAMP,
          FOREIGN KEY (order_request_id) REFERENCES order_requests (id),
          FOREIGN KEY (material_id) REFERENCES materials (id),
          FOREIGN KEY (buyer_id) REFERENCES users (id),
          FOREIGN KEY (seller_id) REFERENCES users (id)
        )
      `);

      // Order items table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS order_items (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL,
          material_id TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price NUMERIC NOT NULL,
          total_price NUMERIC NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders (id),
          FOREIGN KEY (material_id) REFERENCES materials (id)
        )
      `);

      // Upload logs table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS upload_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          project_id TEXT,
          filename TEXT NOT NULL,
          file_type TEXT NOT NULL,
          total_rows INTEGER,
          successful_rows INTEGER,
          failed_rows INTEGER,
          errors TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (project_id) REFERENCES projects (id)
        )
      `);

      // Internal transfers table - REMOVED (feature no longer used)

      // Notifications table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT DEFAULT 'info',
          read BOOLEAN DEFAULT FALSE,
          data TEXT,
          related_id TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Transaction history table for comprehensive tracking
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS transaction_history (
          id TEXT PRIMARY KEY,
          seller_id TEXT NOT NULL,
          material_id TEXT,
          listing_id TEXT,
          transaction_type TEXT NOT NULL,
          buyer_id TEXT,
          order_id TEXT,
          from_project_id TEXT,
          to_project_id TEXT,
          quantity INTEGER NOT NULL,
          unit_price NUMERIC,
          total_amount NUMERIC,
          material_name TEXT NOT NULL,
          buyer_company TEXT,
          buyer_contact TEXT,
          delivery_address TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (seller_id) REFERENCES users (id),
          FOREIGN KEY (material_id) REFERENCES materials (id),
          FOREIGN KEY (buyer_id) REFERENCES users (id),
          FOREIGN KEY (order_id) REFERENCES orders (id)
        )
      `);

      console.log('✅ PostgreSQL database tables initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing database tables:', error);
      throw error;
    }
  }

  // User methods
  async createUser(userData) {
    const { email, password, name, userType, companyName } = userData;
    const passwordHash = await bcrypt.hash(password, 10);
    
    try {
      const result = await this.pool.query(`
        INSERT INTO users (id, email, password_hash, name, company_name, user_type)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [userData.id, email, passwordHash, name, companyName || '', userType]);
      
      return { id: userData.id, email, name, userType, companyName };
    } catch (error) {
      throw error;
    }
  }

  async ensureAdminUser() {
    try {
      // Ensure the password hash is correct for "admin123"
      const adminPasswordHash = bcrypt.hashSync('admin123', 10);
      
      const result = await this.pool.query(
        'SELECT id, password_hash FROM users WHERE email = $1',
        ['admin@greenscore.com']
      );
      
      if (result.rows.length === 0) {
        // Admin user doesn't exist, create it
        await this.pool.query(`
          INSERT INTO users (id, email, password_hash, name, user_type, verification_status, company_name)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, ['admin-default', 'admin@greenscore.com', adminPasswordHash, 'System Admin', 'admin', 'verified', 'GreenScore System']);
        
        console.log('✅ Default admin user created: admin@greenscore.com / admin123');
        const testVerify = bcrypt.compareSync('admin123', adminPasswordHash);
        console.log('🔑 Password verification test:', testVerify ? '✅ PASSED' : '❌ FAILED');
      } else {
        // Admin user exists, verify and update password hash if needed
        const row = result.rows[0];
        const currentHashWorks = bcrypt.compareSync('admin123', row.password_hash);
        
        if (!currentHashWorks) {
          // Current hash doesn't work, update it
          console.log('🔄 Updating admin user password hash...');
          await this.pool.query(`
            UPDATE users 
            SET password_hash = $1, user_type = 'admin', verification_status = 'verified'
            WHERE email = 'admin@greenscore.com'
          `, [adminPasswordHash]);
          
          console.log('✅ Admin user password hash updated: admin@greenscore.com / admin123');
          const testVerify = bcrypt.compareSync('admin123', adminPasswordHash);
          console.log('🔑 Password verification test:', testVerify ? '✅ PASSED' : '❌ FAILED');
        } else {
          console.log('✅ Admin user exists and password is correct: admin@greenscore.com / admin123');
        }
      }
    } catch (error) {
      console.error('❌ Error ensuring admin user:', error);
    }
  }

  async findUserByEmail(email) {
    try {
      const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async findUserById(id) {
    try {
      const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  // Project methods
  async createProject(projectData) {
    try {
      await this.pool.query(`
        INSERT INTO projects (id, seller_id, name, location, description)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        projectData.id, 
        projectData.sellerId, 
        projectData.name, 
        projectData.location || '', 
        projectData.description || ''
      ]);
      
      return projectData;
    } catch (error) {
      throw error;
    }
  }

  async getProjectsBySeller(sellerId) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM projects WHERE seller_id = $1 ORDER BY created_at DESC',
        [sellerId]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getAllProjects() {
    try {
      const query = `
        SELECT 
          p.*,
          u.name as seller_name,
          u.company_name as seller_company,
          COUNT(DISTINCT m.id) as material_count
        FROM projects p
        LEFT JOIN users u ON p.seller_id = u.id
        LEFT JOIN materials m ON p.id = m.project_id
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `;
      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getProjectById(projectId) {
    try {
      const result = await this.pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Generate unique listing ID
  generateListingId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `GS-${timestamp}-${random}`.toUpperCase();
  }

  // Material methods
  async createMaterial(materialData) {
    try {
      const listingId = this.generateListingId();
      await this.pool.query(`
        INSERT INTO materials (
          id, listing_id, seller_id, project_id, material, brand, category, condition,
          quantity, unit, price_today, mrp, price_purchased, inventory_value,
          inventory_type, listing_type, specs, photo, specs_photo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      `, [
        materialData.id, listingId, materialData.sellerId, materialData.projectId,
        materialData.material, materialData.brand || '', materialData.category || 'Other',
        materialData.condition || 'good', materialData.qty, materialData.unit || 'pcs',
        materialData.priceToday, materialData.mrp || 0, materialData.pricePurchased || 0,
        materialData.inventoryValue || 0, materialData.inventoryType || 'surplus',
        materialData.listingType || 'resale', materialData.specs || '',
        materialData.photo || '', materialData.specsPhoto || ''
      ]);
      
      return {...materialData, listingId};
    } catch (error) {
      throw error;
    }
  }

  async getMaterialsBySeller(sellerId, filters = {}) {
    try {
      let query = `
        SELECT m.*, 
               p.name as project_name,
               p.location as project_location
        FROM materials m
        LEFT JOIN projects p ON m.project_id = p.id
        WHERE m.seller_id = $1
      `;
      let params = [sellerId];
      let paramIndex = 2;

      if (filters.projectId && filters.projectId !== 'all') {
        query += ` AND m.project_id = $${paramIndex}`;
        params.push(filters.projectId);
        paramIndex++;
      }

      if (filters.inventoryType && filters.inventoryType !== 'all') {
        query += ` AND m.inventory_type = $${paramIndex}`;
        params.push(filters.inventoryType);
        paramIndex++;
      }

      if (filters.listingType && filters.listingType !== 'all') {
        query += ` AND m.listing_type = $${paramIndex}`;
        params.push(filters.listingType);
        paramIndex++;
      }

      query += ' ORDER BY m.created_at DESC';

      const result = await this.pool.query(query, params);
      
      // Convert database fields to frontend-compatible names
      const materials = result.rows.map(row => ({
        ...row,
        category: this.normalizeCategory(row.category),
        qty: row.quantity,
        projectId: row.project_id,
        priceToday: parseFloat(row.price_today) || 0,
        pricePurchased: parseFloat(row.price_purchased) || 0,
        inventoryValue: parseFloat(row.inventory_value) || 0,
        inventoryType: row.inventory_type,
        listingType: row.listing_type,
        acquisitionType: row.acquisition_type,
        specsPhoto: row.specs_photo,
        location_details: row.location_details,
        project_name: row.project_name,
        project_location: row.project_location,
        is_being_edited: row.is_being_edited,
        createdAt: row.created_at
      }));
      
      return materials;
    } catch (error) {
      throw error;
    }
  }

  // Normalize category name to match frontend categories (handles "Tile" → "Tiles", etc.)
  normalizeCategory(category) {
    if (!category) return 'Other';
    const normalized = category.toString().trim();
    const upper = normalized.toUpperCase();
    
    const frontendCategories = [
      'Doors', 'Tiles', 'Handles & Hardware', 'Toilets & Sanitary',
      'Windows', 'Flooring', 'Lighting', 'Paint & Finishes',
      'Plumbing', 'Electrical', 'Furniture', 'Marbles', 'Other'
    ];
    
    // Exact match
    if (frontendCategories.includes(normalized)) {
      return normalized;
    }
    
    // Variations mapping (including singular/plural)
    const variations = {
      'TILE': 'Tiles',           // singular → plural (critical fix)
      'TILES': 'Tiles',
      'HARDWARE': 'Handles & Hardware',
      'HANDLES': 'Handles & Hardware',
      'HANDLE': 'Handles & Hardware',
      'SANITARY': 'Toilets & Sanitary',
      'TOILET': 'Toilets & Sanitary',
      'TOILETS': 'Toilets & Sanitary',
      'BATHROOM': 'Toilets & Sanitary',
      'LIGHTS': 'Lighting',
      'LIGHT': 'Lighting',
      'FAN': 'Lighting',
      'FANS': 'Lighting',
      'WINDOW': 'Windows',
      'WINDOWS': 'Windows',
      'FLOOR': 'Flooring',
      'FLOORS': 'Flooring',
      'FLOORING': 'Flooring',
      'PAINT': 'Paint & Finishes',
      'FINISHES': 'Paint & Finishes',
      'FINISH': 'Paint & Finishes',
      'PLUMB': 'Plumbing',
      'PLUMBING': 'Plumbing',
      'ELECTRIC': 'Electrical',
      'ELECTRICAL': 'Electrical',
      'DOOR': 'Doors',
      'DOORS': 'Doors',
      'FURNITURE': 'Furniture',
      'MARBLE': 'Marbles',
      'MARBLES': 'Marbles'
    };
    
    if (variations[upper]) {
      return variations[upper];
    }
    
    // Partial matching (catches both "Tile" and "Tiles")
    if (upper.includes('TILE')) return 'Tiles';
    if (upper.includes('HARDWARE') || upper.includes('HANDLE')) return 'Handles & Hardware';
    if (upper.includes('SANITARY') || upper.includes('TOILET') || upper.includes('BATH')) return 'Toilets & Sanitary';
    if (upper.includes('LIGHT') || upper.includes('LAMP') || upper.includes('FAN')) return 'Lighting';
    if (upper.includes('WINDOW')) return 'Windows';
    if (upper.includes('FLOOR')) return 'Flooring';
    if (upper.includes('PAINT') || upper.includes('FINISH')) return 'Paint & Finishes';
    if (upper.includes('PLUMB')) return 'Plumbing';
    if (upper.includes('ELECTRIC')) return 'Electrical';
    if (upper.includes('DOOR')) return 'Doors';
    if (upper.includes('FURNITURE')) return 'Furniture';
    if (upper.includes('MARBLE')) return 'Marbles';
    
    return 'Other';
  }

  async getMaterialsForBuyers(filters = {}) {
    try {
      let query = `
        SELECT m.*, 
               p.name as project_name,
               p.location as project_location
        FROM materials m 
        LEFT JOIN projects p ON m.project_id = p.id 
        WHERE m.quantity > 0 AND m.listing_type = 'resale' AND (m.acquisition_type IS NULL OR m.acquisition_type != 'acquired')
      `;
      let params = [];
      let paramIndex = 1;

      if (filters.category && filters.category !== 'all') {
        query += ` AND m.category = $${paramIndex}`;
        params.push(filters.category);
        paramIndex++;
      }

      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        query += ` AND (m.material LIKE $${paramIndex} OR m.brand LIKE $${paramIndex + 1} OR m.specs LIKE $${paramIndex + 2})`;
        params.push(searchTerm, searchTerm, searchTerm);
        paramIndex += 3;
      }

      query += ' ORDER BY m.created_at DESC';

      const result = await this.pool.query(query, params);
      
      // Convert quantity back to qty and include seller info for notifications
      const materials = result.rows.map(row => ({
        id: row.id,
        material: row.material,
        brand: row.brand,
        category: this.normalizeCategory(row.category),
        condition: row.condition,
        qty: row.quantity,
        unit: row.unit,
        priceToday: parseFloat(row.price_today) || 0,
        mrp: parseFloat(row.mrp) || 0,
        specs: row.specs,
        photo: row.photo,
        dimensions: row.dimensions,
        weight: parseFloat(row.weight) || 0,
        location_details: row.location_details,
        project_name: row.project_name,
        project_location: row.project_location,
        sellerId: row.seller_id,
        is_being_edited: row.is_being_edited,
        createdAt: row.created_at
      }));
      
      return materials;
    } catch (error) {
      throw error;
    }
  }

  async updateMaterialListingType(materialId, listingType, targetProjectId = null) {
    try {
      await this.pool.query(`
        UPDATE materials 
        SET listing_type = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [listingType, materialId]);
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  // Bulk insert materials
  async createMaterialsBulk(materialsData) {
    console.log('💾 DATABASE: Starting bulk insert of', materialsData.length, 'materials');
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const insertQuery = `
        INSERT INTO materials (
          id, listing_id, seller_id, project_id, material, brand, category, condition,
          quantity, unit, price_today, mrp, price_purchased, inventory_value,
          inventory_type, listing_type, specs, photo, specs_photo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      `;

      for (const material of materialsData) {
        const listingId = this.generateListingId();
        await client.query(insertQuery, [
          material.id, listingId, material.sellerId, material.projectId,
          material.material, material.brand || '', material.category || 'Other',
          material.condition || 'good', material.qty, material.unit || 'pcs',
          material.priceToday, material.mrp || 0, material.pricePurchased || 0,
          material.inventoryValue || 0, material.inventoryType || 'surplus',
          material.listingType || 'resale', material.specs || '',
          material.photo || '', material.specsPhoto || ''
        ]);
      }

      await client.query('COMMIT');
      console.log('✅ DATABASE: Successfully saved', materialsData.length, 'materials');
      return { success: true, count: materialsData.length };
    } catch (error) {
      await client.query('ROLLBACK');
      console.log('❌ DATABASE: Commit failed:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  // Upload log methods
  async createUploadLog(logData) {
    try {
      await this.pool.query(`
        INSERT INTO upload_logs (id, user_id, project_id, filename, file_type, total_rows, successful_rows, failed_rows, errors)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        logData.id, logData.userId, logData.projectId, logData.filename,
        logData.fileType, logData.totalRows, logData.successfulRows,
        logData.failedRows, JSON.stringify(logData.errors || [])
      ]);
      
      return logData;
    } catch (error) {
      throw error;
    }
  }

  async close() {
    try {
      await this.pool.end();
      console.log('Database connection pool closed');
    } catch (error) {
      console.error('Error closing database:', error.message);
    }
  }

  // Internal transfer methods - REMOVED (feature no longer used)

  async updateMaterialListing(materialId, listingType, acquisitionType = null) {
    try {
      let query = 'UPDATE materials SET listing_type = $1';
      let params = [listingType];
      
      if (acquisitionType) {
        query += ', acquisition_type = $2';
        params.push(acquisitionType);
        query += ' WHERE id = $3';
        params.push(materialId);
      } else {
        query += ' WHERE id = $2';
        params.push(materialId);
      }
      
      const result = await this.pool.query(query, params);
      return { success: true, changes: result.rowCount };
    } catch (error) {
      throw error;
    }
  }

  async updateMaterialQuantityAfterPurchase(materialId, quantityPurchased) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // First, get current material info
      const materialResult = await client.query('SELECT * FROM materials WHERE id = $1', [materialId]);
      
      if (materialResult.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('Material not found');
      }
      
      const material = materialResult.rows[0];
      
      if (material.quantity < quantityPurchased) {
        await client.query('ROLLBACK');
        throw new Error('Insufficient quantity available');
      }
      
      const newQuantity = material.quantity - quantityPurchased;
      
      if (newQuantity <= 0) {
        // If quantity becomes zero or less, mark as sold and set quantity to 0
        await client.query(
          'UPDATE materials SET quantity = 0, listing_type = $1 WHERE id = $2',
          ['sold', materialId]
        );
        
        await client.query('COMMIT');
        console.log(`🏷️ Material ${materialId} marked as SOLD (quantity: 0)`);
        return { success: true, newQuantity: 0, status: 'sold' };
      } else {
        // Just update the quantity
        await client.query(
          'UPDATE materials SET quantity = $1 WHERE id = $2',
          [newQuantity, materialId]
        );
        
        await client.query('COMMIT');
        console.log(`📦 Material ${materialId} quantity updated: ${newQuantity} remaining`);
        return { success: true, newQuantity: newQuantity, status: 'available' };
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Notification methods
  async createNotification(userId, title, message, type = 'info', data = null) {
    try {
      const { v4: uuidv4 } = require('uuid');
      const id = uuidv4();
      
      await this.pool.query(
        'INSERT INTO notifications (id, user_id, title, message, type, data) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, userId, title, message, type, data ? JSON.stringify(data) : null]
      );
      
      return { success: true, notificationId: id };
    } catch (error) {
      throw error;
    }
  }

  async getUserNotifications(userId, unreadOnly = false) {
    try {
      let query = 'SELECT * FROM notifications WHERE user_id = $1';
      if (unreadOnly) {
        query += ' AND read = FALSE';
      }
      query += ' ORDER BY created_at DESC';
      
      const result = await this.pool.query(query, [userId]);
      
      const notifications = result.rows.map(row => ({
        ...row,
        data: row.data ? JSON.parse(row.data) : null,
        read: Boolean(row.read)
      }));
      
      return notifications;
    } catch (error) {
      throw error;
    }
  }

  async markNotificationAsRead(notificationId) {
    try {
      const result = await this.pool.query(
        'UPDATE notifications SET read = TRUE WHERE id = $1',
        [notificationId]
      );
      
      return { success: true, changes: result.rowCount };
    } catch (error) {
      throw error;
    }
  }

  async markAllNotificationsAsRead(userId) {
    try {
      const result = await this.pool.query(
        'UPDATE notifications SET read = TRUE WHERE user_id = $1',
        [userId]
      );
      
      return { success: true, changes: result.rowCount };
    } catch (error) {
      throw error;
    }
  }

  // Order request management methods
  async createOrderRequest(requestData) {
    try {
      const { v4: uuidv4 } = require('uuid');
      const requestId = uuidv4();
      
      // First get material details for notification
      const materialResult = await this.pool.query(
        'SELECT material, listing_id FROM materials WHERE id = $1',
        [requestData.materialId]
      );
      
      const material = materialResult.rows[0];
      
      // Create the order request
      await this.pool.query(
        `INSERT INTO order_requests (
          id, material_id, buyer_id, seller_id, quantity, unit_price, total_amount,
          buyer_company, buyer_contact_person, buyer_email, buyer_phone,
          delivery_address, delivery_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          requestId, requestData.materialId, requestData.buyerId, requestData.sellerId, 
          requestData.quantity, requestData.unitPrice, requestData.totalAmount,
          requestData.companyName, requestData.contactPerson, requestData.email, 
          requestData.phone, requestData.deliveryAddress, requestData.deliveryNotes || ''
        ]
      );
      
      // Create notification for seller
      const notificationId = uuidv4();
      try {
        await this.pool.query(
          `INSERT INTO notifications (
            id, user_id, title, message, type, related_id
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            notificationId,
            requestData.sellerId,
            'New Order Request!',
            `${requestData.contactPerson || 'A buyer'} from ${requestData.companyName || 'Unknown Company'} wants to purchase ${requestData.quantity} units of ${material?.material || 'your material'} (${material?.listing_id || 'N/A'})`,
            'new_order_request',
            requestId
          ]
        );
      } catch (notifErr) {
        // Don't fail if notification fails
        console.error('Failed to create seller notification:', notifErr);
      }
      
      // Send email notification to seller (async, don't wait)
      this.sendOrderRequestEmailNotification(requestId).catch(err => {
        console.error('Failed to send order request email:', err);
      });
      
      return { success: true, requestId };
    } catch (error) {
      throw error;
    }
  }

  async getOrderRequestsBySeller(sellerId) {
    try {
      const query = `
        SELECT 
          r.*,
          m.material as material_name,
          m.listing_id,
          m.unit,
          m.price_today as current_price,
          m.quantity as available_qty,
          m.seller_id,
          m.brand,
          m.category,
          m.condition,
          m.specs,
          m.photo,
          m.dimensions,
          m.weight,
          m.mrp,
          u.name as buyer_name
        FROM order_requests r
        JOIN materials m ON r.material_id = m.id
        JOIN users u ON r.buyer_id = u.id
        WHERE m.seller_id = $1 AND r.status = 'pending'
        ORDER BY r.created_at DESC
      `;
      
      const result = await this.pool.query(query, [sellerId]);
      console.log(`Found ${result.rows.length} order requests for seller ${sellerId}`);
      return result.rows;
    } catch (error) {
      console.error('Database error in getOrderRequestsBySeller:', error);
      throw error;
    }
  }

  async getOrderRequestsForMaterial(materialId) {
    try {
      const query = `
        SELECT 
          r.*,
          u.name as buyer_name,
          u.email as buyer_user_email
        FROM order_requests r
        JOIN users u ON r.buyer_id = u.id
        WHERE r.material_id = $1 AND r.status = 'pending'
        ORDER BY r.created_at DESC
      `;
      
      const result = await this.pool.query(query, [materialId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async approveOrderRequests(requestIds, sellerNotes = '') {
    // Handle bulk approvals with FCFS logic in a single transaction
    if (!Array.isArray(requestIds)) {
      requestIds = [requestIds];
    }
    
    const client = await this.pool.connect();
    const results = [];
    let processedCount = 0;
    let successCount = 0;
    
    try {
      await client.query('BEGIN');
      
      // Get all requests with their details, sorted by created_at (FCFS)
      const placeholders = requestIds.map((_, i) => `$${i + 1}`).join(',');
      const query = `
        SELECT or_table.*, m.quantity as available_quantity, m.material as material_name
        FROM order_requests or_table
        JOIN materials m ON or_table.material_id = m.id
        WHERE or_table.id IN (${placeholders})
        ORDER BY or_table.created_at ASC
      `;
      
      const requestsResult = await client.query(query, requestIds);
      const requests = requestsResult.rows;
      
      if (!requests || requests.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('No order requests found');
      }
      
      // Group requests by material_id to handle inventory properly
      const materialGroups = {};
      requests.forEach(req => {
        if (!materialGroups[req.material_id]) {
          materialGroups[req.material_id] = {
            availableQty: req.available_quantity,
            requests: []
          };
        }
        materialGroups[req.material_id].requests.push(req);
      });
      
      // Process each material group
      for (const materialId of Object.keys(materialGroups)) {
        const group = materialGroups[materialId];
        let remainingQty = group.availableQty;
        
        // Process requests for this material in FCFS order
        for (let index = 0; index < group.requests.length && remainingQty > 0; index++) {
          const request = group.requests[index];
          processedCount++;
          
          // Determine fulfillment quantity
          const fulfilledQty = Math.min(remainingQty, request.quantity);
          
          if (fulfilledQty === 0) {
            // No quantity left, mark as declined due to stock
            try {
              await client.query(
                'UPDATE order_requests SET status = $1, seller_notes = $2 WHERE id = $3',
                ['declined', 'Out of stock - no quantity available', request.id]
              );
            } catch (err) {
              console.error('Failed to decline request:', err);
            }
            results.push({
              requestId: request.id,
              status: 'declined',
              reason: 'Out of stock'
            });
            continue;
          }
          
          // Process approval (full or partial)
          const isPartial = fulfilledQty < request.quantity;
          const status = isPartial ? 'partially_approved' : 'approved';
          const notes = isPartial 
            ? `${sellerNotes} [Partial: ${fulfilledQty}/${request.quantity} units fulfilled]`
            : sellerNotes;
          
          // Update order request
          try {
            await client.query(
              'UPDATE order_requests SET status = $1, approved_at = CURRENT_TIMESTAMP, seller_notes = $2, fulfilled_quantity = $3 WHERE id = $4',
              [status, notes, fulfilledQty, request.id]
            );
          } catch (err) {
            console.error('Failed to update request:', err);
            continue;
          }
          
          // Create order
          const { v4: uuidv4 } = require('uuid');
          const orderId = uuidv4();
          const adjustedTotal = (fulfilledQty / request.quantity) * request.total_amount;
          const platformFee = adjustedTotal * 0.05;
          
          try {
            await client.query(
              `INSERT INTO orders (
                id, order_request_id, buyer_id, seller_id, material_id, quantity, 
                unit_price, total_amount, platform_fee, shipping_address, delivery_notes
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [
                orderId, request.id, request.buyer_id, request.seller_id, 
                request.material_id, fulfilledQty, request.unit_price, 
                adjustedTotal, platformFee, request.delivery_address, 
                request.delivery_notes
              ]
            );
          } catch (err) {
            console.error('Failed to create order:', err);
            continue;
          }
          
          // Create notification
          const notifId = uuidv4();
          const notifMessage = isPartial 
            ? `Your order for ${request.material_name} has been partially fulfilled. ${fulfilledQty}/${request.quantity} units approved. Order ID: ${orderId}`
            : `Your order for ${fulfilledQty} units of ${request.material_name} has been approved. Order ID: ${orderId}`;
          
          try {
            await client.query(
              `INSERT INTO notifications (id, user_id, title, message, type, related_id) 
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                notifId, request.buyer_id,
                isPartial ? 'Order Partially Fulfilled!' : 'Order Approved!',
                notifMessage, 'order_approved', orderId
              ]
            );
          } catch (err) {
            console.error('Failed to create notification:', err);
          }
          
          // Send email notification to buyer (async, don't wait)
          this.sendOrderApprovalEmailNotification(orderId, request.id).catch(err => {
            console.error('Failed to send order approval email:', err);
          });
          
          // Update remaining quantity for next iteration
          remainingQty -= fulfilledQty;
          successCount++;
          
          results.push({
            requestId: request.id,
            orderId,
            status: status,
            fulfilledQty,
            requestedQty: request.quantity,
            isPartial
          });
        }
        
        // Update material quantity after processing all requests for this material
        const totalUsed = group.availableQty - remainingQty;
        if (totalUsed > 0) {
          const newQty = remainingQty;
          try {
            if (newQty === 0) {
              await client.query(
                'UPDATE materials SET quantity = $1, listing_type = $2 WHERE id = $3',
                [0, 'sold', materialId]
              );
            } else {
              await client.query(
                'UPDATE materials SET quantity = $1 WHERE id = $2',
                [newQty, materialId]
              );
            }
          } catch (err) {
            console.error('Failed to update material quantity:', err);
          }
        }
      }
      
      await client.query('COMMIT');
      return { 
        success: true, 
        results,
        totalProcessed: processedCount,
        totalApproved: successCount
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async approveOrderRequest(requestId, sellerNotes = '') {
    // Single approval - delegate to bulk function
    return this.approveOrderRequests([requestId], sellerNotes);
  }

  async declineOrderRequest(requestId, sellerNotes = '') {
    try {
      // First get the order request details for notification
      const requestResult = await this.pool.query('SELECT * FROM order_requests WHERE id = $1', [requestId]);
      
      if (requestResult.rows.length === 0) {
        throw new Error('Order request not found');
      }
      
      const request = requestResult.rows[0];
      
      // Update the order request status
      await this.pool.query(
        'UPDATE order_requests SET status = $1, seller_notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        ['declined', sellerNotes, requestId]
      );
      
      // Create notification for buyer
      const { v4: uuidv4 } = require('uuid');
      const notificationId = uuidv4();
      try {
        await this.pool.query(
          `INSERT INTO notifications (
            id, user_id, title, message, type, related_id
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            notificationId,
            request.buyer_id,
            'Order Request Declined',
            `Your order request for ${request.quantity} units has been declined by the seller. Reason: ${sellerNotes || 'No reason provided'}`,
            'order_declined',
            requestId
          ]
        );
      } catch (notifErr) {
        // Don't fail if notification fails
        console.error('Failed to create buyer notification:', notifErr);
      }
      
      // Send email notification to buyer (async, don't wait)
      this.sendOrderDeclineEmailNotification(requestId, sellerNotes).catch(err => {
        console.error('Failed to send order decline email:', err);
      });
      
      return { success: true, changes: 1 };
    } catch (error) {
      throw error;
    }
  }


  async updateOrderStatus(orderId, status, sellerNotes = '') {
    try {
      let query = 'UPDATE orders SET status = $1, seller_notes = $2';
      const params = [status, sellerNotes];
      
      if (status === 'approved') {
        query += ', approved_at = CURRENT_TIMESTAMP';
      } else if (status === 'completed') {
        query += ', completed_at = CURRENT_TIMESTAMP';
      }
      
      query += ', updated_at = CURRENT_TIMESTAMP WHERE id = $3';
      params.push(orderId);
      
      const result = await this.pool.query(query, params);
      return { success: true, changes: result.rowCount };
    } catch (error) {
      throw error;
    }
  }

  async getOrdersBySeller(sellerId) {
    try {
      const query = `
        SELECT 
          o.*,
          m.material as material_name,
          m.listing_id,
          m.unit,
          m.brand,
          m.category,
          m.condition,
          m.specs,
          m.photo,
          m.dimensions,
          m.weight,
          m.mrp,
          m.price_today as current_price,
          u.name as buyer_name,
          u.company_name as buyer_company
        FROM orders o
        JOIN materials m ON o.material_id = m.id
        JOIN users u ON o.buyer_id = u.id
        WHERE o.seller_id = $1
        ORDER BY o.created_at DESC
      `;
      
      const result = await this.pool.query(query, [sellerId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getOrdersByBuyer(buyerId) {
    try {
      const query = `
        SELECT 
          o.*,
          m.material as material_name,
          m.listing_id,
          m.unit,
          m.brand,
          m.category,
          m.condition,
          m.specs,
          m.photo,
          m.dimensions,
          m.weight,
          m.mrp,
          m.price_today as current_price,
          u.name as seller_name,
          u.company_name as seller_company,
          u.email as seller_email,
          u.phone as seller_phone
        FROM orders o
        JOIN materials m ON o.material_id = m.id
        JOIN users u ON o.seller_id = u.id
        WHERE o.buyer_id = $1
        ORDER BY o.created_at DESC
      `;
      
      const result = await this.pool.query(query, [buyerId]);
      
      // Normalize categories
      const normalizedRows = result.rows.map(row => ({
        ...row,
        category: this.normalizeCategory(row.category)
      }));
      
      return normalizedRows;
    } catch (error) {
      throw error;
    }
  }

  async getOrderRequestsByBuyer(buyerId) {
    try {
      const query = `
        SELECT 
          r.*,
          m.material as material_name,
          m.listing_id,
          m.unit,
          m.brand,
          m.category,
          m.condition,
          m.specs,
          m.photo,
          m.dimensions,
          m.weight,
          m.mrp,
          m.price_today as current_price,
          u.name as seller_name,
          u.company_name as seller_company,
          u.email as seller_email
        FROM order_requests r
        JOIN materials m ON r.material_id = m.id
        JOIN users u ON r.seller_id = u.id
        WHERE r.buyer_id = $1
        ORDER BY r.created_at DESC
      `;
      
      const result = await this.pool.query(query, [buyerId]);
      
      // Normalize categories
      const normalizedRows = result.rows.map(row => ({
        ...row,
        category: this.normalizeCategory(row.category)
      }));
      
      return normalizedRows;
    } catch (error) {
      throw error;
    }
  }

  async getTransactionHistory(sellerId) {
    try {
      const query = `
        SELECT 
          th.*,
          CASE 
            WHEN th.buyer_id IS NOT NULL THEN u.name 
            ELSE NULL 
          END as buyer_name,
          fp.name as from_project_name,
          tp.name as to_project_name
        FROM transaction_history th
        LEFT JOIN users u ON th.buyer_id = u.id
        LEFT JOIN projects fp ON th.from_project_id = fp.id
        LEFT JOIN projects tp ON th.to_project_id = tp.id
        WHERE th.seller_id = $1
        ORDER BY th.created_at DESC
      `;
      
      const result = await this.pool.query(query, [sellerId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async createTransactionRecord(transactionData) {
    try {
      const { v4: uuidv4 } = require('uuid');
      const transactionId = uuidv4();
      
      await this.pool.query(
        `INSERT INTO transaction_history (
          id, seller_id, material_id, listing_id, transaction_type, buyer_id, order_id,
          from_project_id, to_project_id, quantity, unit_price, total_amount,
          material_name, buyer_company, buyer_contact, delivery_address, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          transactionId, transactionData.sellerId, transactionData.materialId,
          transactionData.listingId, transactionData.transactionType, transactionData.buyerId,
          transactionData.orderId, transactionData.fromProjectId, transactionData.toProjectId,
          transactionData.quantity, transactionData.unitPrice, transactionData.totalAmount,
          transactionData.materialName, transactionData.buyerCompany, transactionData.buyerContact,
          transactionData.deliveryAddress, transactionData.notes || ''
        ]
      );
      
      return { success: true, transactionId };
    } catch (error) {
      throw error;
    }
  }

  // Admin methods
  async getAllUsers() {
    try {
      const query = `
        SELECT 
          u.*,
          COUNT(DISTINCT p.id) as project_count,
          COUNT(DISTINCT m.id) as material_count,
          COUNT(DISTINCT o.id) as order_count
        FROM users u
        LEFT JOIN projects p ON u.id = p.seller_id
        LEFT JOIN materials m ON u.id = m.seller_id
        LEFT JOIN orders o ON u.id = o.buyer_id OR u.id = o.seller_id
        WHERE u.user_type != 'admin'
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `;
      
      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getAllMaterials() {
    try {
      const query = `
        SELECT 
          m.*,
          u.name as seller_name,
          u.company_name as seller_company,
          p.name as project_name,
          p.location as project_location,
          COUNT(DISTINCT req.id) as pending_requests,
          COUNT(DISTINCT o.id) as completed_orders
        FROM materials m
        JOIN users u ON m.seller_id = u.id
        LEFT JOIN projects p ON m.project_id = p.id
        LEFT JOIN order_requests req ON m.id = req.material_id AND req.status = 'pending'
        LEFT JOIN orders o ON m.id = o.material_id
        GROUP BY m.id
        ORDER BY m.created_at DESC
      `;
      
      const result = await this.pool.query(query);
      
      // Normalize categories for all materials (e.g., "Tile" → "Tiles")
      const normalizedRows = result.rows.map(row => ({
        ...row,
        category: this.normalizeCategory(row.category)
      }));
      
      return normalizedRows;
    } catch (error) {
      throw error;
    }
  }

  async getAllOrderRequests() {
    try {
      const query = `
        SELECT 
          r.*,
          m.material as material_name,
          m.listing_id,
          m.brand,
          m.category,
          m.condition,
          m.specs,
          m.photo,
          m.dimensions,
          m.weight,
          m.mrp,
          m.price_today as current_price,
          m.unit,
          m.quantity as available_quantity,
          u_buyer.name as buyer_name,
          u_buyer.company_name as buyer_company,
          u_buyer.email as buyer_email,
          u_buyer.phone as buyer_phone,
          u_seller.name as seller_name,
          u_seller.company_name as seller_company,
          u_seller.email as seller_email
        FROM order_requests r
        JOIN materials m ON r.material_id = m.id
        JOIN users u_buyer ON r.buyer_id = u_buyer.id
        JOIN users u_seller ON r.seller_id = u_seller.id
        ORDER BY r.created_at DESC
      `;
      
      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getAllOrders() {
    try {
      const query = `
        SELECT 
          o.*,
          m.material as material_name,
          m.listing_id,
          m.brand,
          m.category,
          m.condition,
          m.specs,
          m.photo,
          m.dimensions,
          m.weight,
          m.mrp,
          m.price_today as current_price,
          m.unit,
          u_buyer.name as buyer_name,
          u_buyer.company_name as buyer_company,
          u_buyer.email as buyer_email,
          u_buyer.phone as buyer_phone,
          u_seller.name as seller_name,
          u_seller.company_name as seller_company,
          u_seller.email as seller_email
        FROM orders o
        JOIN materials m ON o.material_id = m.id
        JOIN users u_buyer ON o.buyer_id = u_buyer.id
        JOIN users u_seller ON o.seller_id = u_seller.id
        ORDER BY o.created_at DESC
      `;
      
      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async deleteMaterial(materialId) {
    try {
      const result = await this.pool.query('DELETE FROM materials WHERE id = $1', [materialId]);
      return { success: true, changes: result.rowCount };
    } catch (error) {
      throw error;
    }
  }

  async deleteMaterialBySeller(materialId, sellerId) {
    try {
      // First check if the material belongs to this seller
      const materialResult = await this.pool.query('SELECT id, seller_id FROM materials WHERE id = $1', [materialId]);
      
      if (materialResult.rows.length === 0) {
        throw new Error('Material not found');
      }
      
      const material = materialResult.rows[0];
      
      if (material.seller_id !== sellerId) {
        throw new Error('Unauthorized: You can only delete your own materials');
      }
      
      // Delete the material
      const result = await this.pool.query('DELETE FROM materials WHERE id = $1 AND seller_id = $2', [materialId, sellerId]);
      return { success: true, changes: result.rowCount };
    } catch (error) {
      throw error;
    }
  }

  async updateMaterial(materialId, updateData) {
    try {
      const fields = Object.keys(updateData).map((key, index) => `${key} = $${index + 1}`).join(', ');
      const values = Object.values(updateData);
      values.push(materialId);
      
      const query = `UPDATE materials SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`;
      const result = await this.pool.query(query, values);
      return { success: true, changes: result.rowCount };
    } catch (error) {
      throw error;
    }
  }

  // Lock material for editing
  async lockMaterialForEdit(materialId, userId) {
    try {
      // First check if material is already being edited
      const materialResult = await this.pool.query(
        'SELECT is_being_edited, edited_by, edit_started_at FROM materials WHERE id = $1',
        [materialId]
      );
      
      if (materialResult.rows.length === 0) {
        throw new Error('Material not found');
      }
      
      const material = materialResult.rows[0];
      
      // Check if already being edited by someone else
      if (material.is_being_edited && material.edited_by !== userId) {
        // Check if edit session has timed out (15 minutes)
        const editStarted = new Date(material.edit_started_at);
        const now = new Date();
        const diffMinutes = (now - editStarted) / 1000 / 60;
        
        if (diffMinutes < 15) {
          throw new Error('Material is currently being edited by another user');
        }
      }
      
      // Lock the material for editing
      await this.pool.query(
        'UPDATE materials SET is_being_edited = TRUE, edited_by = $1, edit_started_at = CURRENT_TIMESTAMP WHERE id = $2',
        [userId, materialId]
      );
      
      return { success: true, locked: true };
    } catch (error) {
      throw error;
    }
  }

  // Unlock material after editing
  async unlockMaterial(materialId, userId) {
    try {
      const result = await this.pool.query(
        'UPDATE materials SET is_being_edited = FALSE, edited_by = NULL, edit_started_at = NULL WHERE id = $1 AND (edited_by = $2 OR edited_by IS NULL)',
        [materialId, userId]
      );
      return { success: true, unlocked: true, changes: result.rowCount };
    } catch (error) {
      throw error;
    }
  }

  // Update material with edit lock check
  async updateMaterialWithLock(materialId, userId, updateData) {
    try {
      // First check if user has lock on this material
      const materialResult = await this.pool.query(
        'SELECT is_being_edited, edited_by FROM materials WHERE id = $1',
        [materialId]
      );
      
      if (materialResult.rows.length === 0) {
        throw new Error('Material not found');
      }
      
      const material = materialResult.rows[0];
      
      // Check if material is locked by another user
      if (material.is_being_edited && material.edited_by !== userId) {
        throw new Error('Material is being edited by another user');
      }
      
      // Get current material values to calculate inventory_value
      const currentResult = await this.pool.query(
        'SELECT quantity, price_today FROM materials WHERE id = $1',
        [materialId]
      );
      const current = currentResult.rows[0];
      
      // Map frontend field names to database column names
      const dbUpdateData = {};
      if (updateData.material !== undefined) dbUpdateData.material = updateData.material;
      if (updateData.brand !== undefined) dbUpdateData.brand = updateData.brand;
      if (updateData.category !== undefined) dbUpdateData.category = this.normalizeCategory(updateData.category);
      if (updateData.qty !== undefined) dbUpdateData.quantity = updateData.qty;
      if (updateData.quantity !== undefined) dbUpdateData.quantity = updateData.quantity;
      if (updateData.unit !== undefined) dbUpdateData.unit = updateData.unit;
      if (updateData.condition !== undefined) dbUpdateData.condition = updateData.condition;
      if (updateData.priceToday !== undefined) dbUpdateData.price_today = updateData.priceToday;
      if (updateData.price_today !== undefined) dbUpdateData.price_today = updateData.price_today;
      if (updateData.mrp !== undefined) dbUpdateData.mrp = updateData.mrp;
      if (updateData.specs !== undefined) dbUpdateData.specs = updateData.specs;
      if (updateData.photo !== undefined) dbUpdateData.photo = updateData.photo;
      if (updateData.dimensions !== undefined) dbUpdateData.dimensions = updateData.dimensions;
      if (updateData.weight !== undefined) dbUpdateData.weight = updateData.weight;
      
      // Calculate inventory_value if quantity or price changed
      if (dbUpdateData.quantity !== undefined || dbUpdateData.price_today !== undefined) {
        const qty = dbUpdateData.quantity !== undefined ? dbUpdateData.quantity : (current ? parseInt(current.quantity) : 0);
        const price = dbUpdateData.price_today !== undefined ? dbUpdateData.price_today : (current ? parseFloat(current.price_today) : 0);
        dbUpdateData.inventory_value = qty * price;
      }
      
      // Check if we have any fields to update
      if (Object.keys(dbUpdateData).length === 0) {
        return { success: true, changes: 0, message: 'No fields to update' };
      }
      
      // Update the material
      const fields = Object.keys(dbUpdateData).map((key, index) => `${key} = $${index + 1}`).join(', ');
      const values = Object.values(dbUpdateData);
      values.push(materialId);
      
      const query = `UPDATE materials SET ${fields}, updated_at = CURRENT_TIMESTAMP, is_being_edited = FALSE, edited_by = NULL, edit_started_at = NULL WHERE id = $${values.length}`;
      const result = await this.pool.query(query, values);
      
      return { success: true, changes: result.rowCount };
    } catch (error) {
      console.error('Database update error:', error);
      throw error;
    }
  }

  // Check if material is locked for editing
  async isMaterialLocked(materialId) {
    try {
      const result = await this.pool.query(
        'SELECT is_being_edited, edited_by, edit_started_at FROM materials WHERE id = $1',
        [materialId]
      );
      
      if (result.rows.length === 0) {
        return { locked: false };
      }
      
      const row = result.rows[0];
      
      // Check if edit session has timed out (15 minutes)
      if (row.is_being_edited) {
        const editStarted = new Date(row.edit_started_at);
        const now = new Date();
        const diffMinutes = (now - editStarted) / 1000 / 60;
        
        if (diffMinutes >= 15) {
          // Session timed out, automatically unlock
          await this.pool.query(
            'UPDATE materials SET is_being_edited = FALSE, edited_by = NULL, edit_started_at = NULL WHERE id = $1',
            [materialId]
          );
          return { locked: false, timedOut: true };
        } else {
          return { 
            locked: true, 
            editedBy: row.edited_by,
            editStartedAt: row.edit_started_at
          };
        }
      } else {
        return { locked: false };
      }
    } catch (error) {
      throw error;
    }
  }

  async getSystemStats() {
    try {
      const queries = [
        'SELECT COUNT(*) as total_users FROM users WHERE user_type != \'admin\'',
        'SELECT COUNT(*) as total_materials FROM materials',
        'SELECT COUNT(*) as pending_requests FROM order_requests WHERE status = \'pending\'',
        'SELECT COUNT(*) as completed_orders FROM orders',
        'SELECT SUM(total_amount) as total_revenue FROM orders'
      ];
      
      const results = await Promise.all(queries.map(query => this.pool.query(query)));
      
      return {
        totalUsers: parseInt(results[0].rows[0].total_users) || 0,
        totalMaterials: parseInt(results[1].rows[0].total_materials) || 0,
        pendingRequests: parseInt(results[2].rows[0].pending_requests) || 0,
        completedOrders: parseInt(results[3].rows[0].completed_orders) || 0,
        totalRevenue: parseFloat(results[4].rows[0].total_revenue) || 0
      };
    } catch (error) {
      throw error;
    }
  }

  async updateUser(userId, updateData) {
    try {
      const fields = Object.keys(updateData).map((key, index) => `${key} = $${index + 1}`).join(', ');
      const values = Object.values(updateData);
      values.push(userId);
      
      const query = `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`;
      const result = await this.pool.query(query, values);
      return { success: true, changes: result.rowCount };
    } catch (error) {
      throw error;
    }
  }

  async deleteUserAndData(userId) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete user's materials
      await client.query('DELETE FROM materials WHERE seller_id = $1', [userId]);
      
      // Delete user's projects
      await client.query('DELETE FROM projects WHERE seller_id = $1', [userId]);
      
      // Delete user's orders
      await client.query('DELETE FROM orders WHERE buyer_id = $1 OR seller_id = $1', [userId]);
      
      // Delete user's order requests
      await client.query('DELETE FROM order_requests WHERE buyer_id = $1 OR seller_id = $1', [userId]);
      
      // Finally, delete the user
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
      
      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateOrderStatus(orderId, status) {
    try {
      const result = await this.pool.query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, orderId]
      );
      return { success: true, changes: result.rowCount };
    } catch (error) {
      throw error;
    }
  }

  // Email notification helper methods
  async sendOrderRequestEmailNotification(requestId) {
    try {
      // Get order request details with related data
      const query = `
        SELECT 
          r.*,
          m.material, m.listing_id, m.unit,
          seller.name as seller_name, seller.email as seller_email,
          buyer.name as buyer_name, buyer.email as buyer_email, buyer.company_name as buyer_company
        FROM order_requests r
        JOIN materials m ON r.material_id = m.id
        JOIN users seller ON r.seller_id = seller.id
        LEFT JOIN users buyer ON r.buyer_id = buyer.id
        WHERE r.id = $1
      `;
      const result = await this.pool.query(query, [requestId]);
      const request = result.rows[0];

      if (!request) {
        console.log('Order request not found for email notification');
        return;
      }

      // Prepare seller and buyer objects
      const seller = {
        id: request.seller_id,
        name: request.seller_name,
        email: request.seller_email
      };

      const buyer = {
        id: request.buyer_id,
        name: request.buyer_name || request.buyer_contact_person,
        email: request.buyer_email,
        company_name: request.buyer_company || request.buyer_company
      };

      const material = {
        material: request.material,
        listing_id: request.listing_id,
        unit: request.unit
      };

      const orderRequest = {
        quantity: request.quantity,
        unit_price: request.unit_price,
        total_amount: request.total_amount,
        buyer_contact_person: request.buyer_contact_person,
        buyer_company: request.buyer_company,
        buyer_email: request.buyer_email,
        buyer_phone: request.buyer_phone,
        delivery_address: request.delivery_address,
        delivery_notes: request.delivery_notes
      };

      // Send email
      await this.emailService.sendOrderRequestEmail(seller, orderRequest, material, buyer);
      console.log('✅ Order request email sent successfully');
    } catch (error) {
      console.error('❌ Error sending order request email:', error);
    }
  }

  async sendOrderApprovalEmailNotification(orderId, requestId) {
    try {
      // Get order details with related data
      const query = `
        SELECT 
          o.*,
          m.material, m.unit, m.listing_id,
          buyer.name as buyer_name, buyer.email as buyer_email, buyer.user_type as buyer_type,
          seller.name as seller_name, seller.email as seller_email
        FROM orders o
        JOIN materials m ON o.material_id = m.id
        JOIN users buyer ON o.buyer_id = buyer.id
        JOIN users seller ON o.seller_id = seller.id
        WHERE o.id = $1
      `;
      const result = await this.pool.query(query, [orderId]);
      const order = result.rows[0];

      if (!order) {
        console.log('Order not found for email notification');
        return;
      }

      // Prepare objects
      const buyer = {
        id: order.buyer_id,
        name: order.buyer_name,
        email: order.buyer_email,
        user_type: order.buyer_type
      };

      const seller = {
        id: order.seller_id,
        name: order.seller_name,
        email: order.seller_email
      };

      const material = {
        material: order.material,
        listing_id: order.listing_id,
        unit: order.unit
      };

      const orderData = {
        id: order.id,
        quantity: order.quantity,
        unit_price: order.unit_price,
        total_amount: order.total_amount,
        platform_fee: order.platform_fee,
        seller_notes: order.seller_notes
      };

      // Send email
      await this.emailService.sendOrderApprovalEmail(buyer, orderData, material, seller);
      console.log('✅ Order approval email sent successfully');
    } catch (error) {
      console.error('❌ Error sending order approval email:', error);
    }
  }

  async sendOrderDeclineEmailNotification(requestId, reason) {
    try {
      // Get order request details
      const query = `
        SELECT 
          r.*,
          m.material, m.listing_id, m.unit,
          buyer.name as buyer_name, buyer.email as buyer_email,
          seller.name as seller_name, seller.email as seller_email
        FROM order_requests r
        JOIN materials m ON r.material_id = m.id
        LEFT JOIN users buyer ON r.buyer_id = buyer.id
        JOIN users seller ON r.seller_id = seller.id
        WHERE r.id = $1
      `;
      const result = await this.pool.query(query, [requestId]);
      const request = result.rows[0];

      if (!request) {
        console.log('Order request not found for email notification');
        return;
      }

      // Prepare objects
      const buyer = {
        id: request.buyer_id,
        name: request.buyer_name || request.buyer_contact_person,
        email: request.buyer_email
      };

      const seller = {
        id: request.seller_id,
        name: request.seller_name,
        email: request.seller_email
      };

      const material = {
        material: request.material,
        listing_id: request.listing_id,
        unit: request.unit
      };

      const orderRequest = {
        quantity: request.quantity,
        created_at: request.created_at,
        seller_notes: request.seller_notes
      };

      // Send email
      await this.emailService.sendOrderDeclineEmail(buyer, orderRequest, material, seller, reason);
      console.log('✅ Order decline email sent successfully');
    } catch (error) {
      console.error('❌ Error sending order decline email:', error);
    }
  }

  // Migrate material categories to normalized frontend categories
  async migrateMaterialCategories() {
    try {
      // Import FileParser for normalizeCategoryName (or define here)
      const frontendCategories = [
        'Doors', 'Tiles', 'Handles & Hardware', 'Toilets & Sanitary',
        'Windows', 'Flooring', 'Lighting', 'Paint & Finishes',
        'Plumbing', 'Electrical', 'Furniture', 'Marbles', 'Other'
      ];
      
      const normalizeCategory = (category, inventoryType) => {
        // First check if inventory_type is 'F' (Furniture)
        if (inventoryType && inventoryType.toString().trim().toUpperCase() === 'F') {
          return 'Furniture';
        }
        
        if (!category) return 'Other';
        const normalized = category.toString().trim();
        const upper = normalized.toUpperCase();
        
        // Exact match
        if (frontendCategories.includes(normalized)) {
          return normalized;
        }
        
        // Variations mapping (including singular/plural - e.g., "Tile" → "Tiles")
        const variations = {
          'TILE': 'Tiles',
          'TILES': 'Tiles',
          'HARDWARE': 'Handles & Hardware',
          'HANDLES': 'Handles & Hardware',
          'HANDLE': 'Handles & Hardware',
          'SANITARY': 'Toilets & Sanitary',
          'TOILET': 'Toilets & Sanitary',
          'TOILETS': 'Toilets & Sanitary',
          'BATHROOM': 'Toilets & Sanitary',
          'LIGHTS': 'Lighting',
          'LIGHT': 'Lighting',
          'FAN': 'Lighting',
          'FANS': 'Lighting',
          'WINDOW': 'Windows',
          'WINDOWS': 'Windows',
          'FLOOR': 'Flooring',
          'FLOORS': 'Flooring',
          'FLOORING': 'Flooring',
          'PAINT': 'Paint & Finishes',
          'FINISHES': 'Paint & Finishes',
          'FINISH': 'Paint & Finishes',
          'PLUMB': 'Plumbing',
          'PLUMBING': 'Plumbing',
          'ELECTRIC': 'Electrical',
          'ELECTRICAL': 'Electrical',
          'DOOR': 'Doors',
          'DOORS': 'Doors',
          'FURNITURE': 'Furniture',
          'MARBLE': 'Marbles',
          'MARBLES': 'Marbles'
        };
        
        if (variations[upper]) {
          return variations[upper];
        }
        
        // Partial matching (catches both "Tile" and "Tiles")
        if (upper.includes('TILE')) return 'Tiles';
        if (upper.includes('HARDWARE') || upper.includes('HANDLE')) return 'Handles & Hardware';
        if (upper.includes('SANITARY') || upper.includes('TOILET') || upper.includes('BATH')) return 'Toilets & Sanitary';
        if (upper.includes('LIGHT') || upper.includes('LAMP') || upper.includes('FAN')) return 'Lighting';
        if (upper.includes('WINDOW')) return 'Windows';
        if (upper.includes('FLOOR')) return 'Flooring';
        if (upper.includes('PAINT') || upper.includes('FINISH')) return 'Paint & Finishes';
        if (upper.includes('PLUMB')) return 'Plumbing';
        if (upper.includes('ELECTRIC')) return 'Electrical';
        if (upper.includes('DOOR')) return 'Doors';
        if (upper.includes('FURNITURE')) return 'Furniture';
        if (upper.includes('MARBLE')) return 'Marbles';
        
        return 'Other';
      };
      
      // Get all materials
      const materialsResult = await this.pool.query('SELECT id, category, inventory_type FROM materials');
      const materials = materialsResult.rows;
      
      let updated = 0;
      let total = materials.length;
      
      console.log(`🔄 Migrating categories for ${total} materials...`);
      
      if (total === 0) {
        return { updated: 0, total: 0, message: 'No materials to migrate' };
      }
      
      // Update each material's category
      for (const material of materials) {
        const oldCategory = material.category;
        let newCategory = normalizeCategory(oldCategory, material.inventory_type);
        
        // If category is already correct, skip
        if (oldCategory === newCategory) {
          continue;
        }
        
        // Update in database
        try {
          await this.pool.query(
            'UPDATE materials SET category = $1 WHERE id = $2',
            [newCategory, material.id]
          );
          updated++;
          if (updated % 10 === 0) {
            console.log(`✅ Migrated ${updated}/${total} materials...`);
          }
        } catch (updateErr) {
          console.error(`❌ Error updating material ${material.id}:`, updateErr);
        }
      }
      
      console.log(`✅ Migration complete! Updated ${updated} out of ${total} materials`);
      return { updated, total, message: `Updated ${updated} out of ${total} materials` };
    } catch (error) {
      console.error('❌ Error fetching materials for migration:', error);
      throw error;
    }
  }
}

module.exports = Database;
