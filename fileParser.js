const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');
const ImageExtractor = require('./imageExtractor');
const yauzl = require('yauzl');
const path = require('path');

class FileParser {
  constructor() {
    // Initialize image extractor
    this.imageExtractor = new ImageExtractor();
    
    // Column mapping for flexible parsing - expanded with more variations
    this.columnMappings = {
      material: [
        'material', 'material name', 'material_name', 'item', 'item name', 'item_name', 
        'product', 'product name', 'product_name', 'name', 'description', 'item description',
        'product description', 'material description', 'item description', 'item_description'
      ],
      qty: [
        'qty', 'qty.', 'quantity', 'qty', 'qty.', 'qty', 'amount', 'count', 'stock', 
        'available', 'available quantity', 'available_quantity', 'units', 'unit quantity',
        'qty available', 'stock quantity', 'stock_quantity'
      ],
      unit: [
        'unit', 'units', 'measurement', 'uom', 'unit of measure', 'unit_of_measure',
        'unit type', 'unit_type', 'measuring unit'
      ],
      brand: [
        'brand', 'manufacturer', 'make', 'company', 'brand name', 'brand_name',
        'manufacturer name', 'make name'
      ],
      condition: [
        'condition', 'state', 'quality', 'grade', 'item condition', 'condition status'
      ],
      priceToday: [
        'price today', 'price_today', 'current price', 'current_price', 'selling price', 'selling_price',
        'price', 'cost', 'unit price', 'unit_price', 'rate', 'selling rate', 'rate per unit',
        'price per unit', 'price_per_unit', 'today price', 'today_price'
      ],
      mrp: [
        'mrp', 'retail price', 'retail_price', 'original price', 'original_price', 
        'list price', 'list_price', 'msrp', 'marked price', 'marked_price'
      ],
      pricePurchased: [
        'price purchased', 'price_purchased', 'purchase price', 'purchase_price',
        'bought price', 'bought_price', 'cost price', 'cost_price', 'purchase cost'
      ],
      inventoryType: [
        'inventory type', 'inventory_type', 'type', 'category type', 'category_type',
        'stock type', 'stock_type', 'inventory code'
      ],
      specs: [
        'specs', 'specifications', 'specification', 'details', 'description', 'features',
        'item specs', 'product specs', 'technical specs'
      ],
      photo: [
        'photo', 'image', 'picture', 'url', 'image url', 'image_url', 'photo url', 'photo_url',
        'picture url', 'img', 'image link', 'photo link'
      ],
      specsPhoto: [
        'specs photo', 'spec photo', 'spec image', 'specification image', 'tech sheet',
        'technical sheet'
      ],
      category: [
        'category', 'group', 'class', 'type', 'item category', 'product category',
        'category name', 'classification'
      ],
      dimensions: [
        'dimensions', 'size', 'measurements', 'length x width', 'length x width x height',
        'l x w x h', 'dimension', 'sizes'
      ],
      weight: [
        'weight', 'mass', 'kg', 'lbs', 'pounds', 'weight kg', 'weight_kg'
      ]
    };
  }

  async parseFile(filePath, fileType, sellerId, projectId) {
    try {
      let data = [];
      let errors = [];
      let totalRows = 0;

      let imageMap = {};
      let extractedImages = [];
      
      switch (fileType.toLowerCase()) {
        case 'csv':
          ({ data, errors, totalRows } = await this.parseCSV(filePath));
          break;
        case 'xlsx':
        case 'xls':
          ({ data, errors, totalRows, extractedImages, imageMap } = await this.parseExcel(filePath));
          break;
        case 'pdf':
          ({ data, errors, totalRows } = await this.parsePDF(filePath));
          break;
        case 'zip':
          ({ data, errors, totalRows, extractedImages, imageMap } = await this.parseZip(filePath));
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }

      // Process and validate the extracted data
      const processedMaterials = [];
      let rowIndex = 0;

      // Log column names from first row for debugging
      if (data.length > 0 && fileType !== 'pdf') {
        const firstRow = data[0];
        const columnNames = Object.keys(firstRow);
        console.log(`📋 Found ${columnNames.length} columns in file:`, columnNames);
        console.log(`📋 First row sample:`, JSON.stringify(firstRow).substring(0, 200));
      }

      let skippedRows = 0;
      for (const row of data) {
        rowIndex++;
        try {
          let material;
          
          // For PDF data, row is already processed by processInventoryItem
          if (fileType === 'pdf' && typeof row === 'object' && row.material) {
            material = {
              id: uuidv4(),
              sellerId: sellerId,
              projectId: projectId || 'default',
              ...row,
              createdAt: new Date().toISOString()
            };
          } else {
            // For CSV/Excel data, use processRow
            try {
              material = this.processRow(row, sellerId, projectId, rowIndex);
            } catch (processError) {
              // Log why row was skipped
              if (processError.message.includes('Material name is required')) {
                skippedRows++;
                if (skippedRows <= 5) {
                  console.warn(`⚠️ Row ${rowIndex} skipped: Missing material name. Available columns:`, Object.keys(row));
                }
              }
              throw processError;
            }
            
            // Handle image assignment with proper priority:
            // 1. Use mapped image from photo column (for ZIP files)
            // 2. Use 'photo' column as URL (for direct URLs)
            // 3. Use extracted embedded image as fallback
            // 4. Set placeholder if neither available
            if (material) {
              // Check if we have a mapped image for this row (from ZIP photo column)
              if (imageMap[rowIndex]) {
                material.photo = imageMap[rowIndex];
                console.log(`📸 Assigned mapped image to row ${rowIndex}: ${material.photo}`);
              } else if (material.photo && material.photo !== '' && material.photo !== 'n/a' && 
                         (material.photo.startsWith('http') || material.photo.startsWith('/'))) {
                // Photo column contains a URL, use it directly
                console.log(`📷 Using photo column URL for row ${rowIndex}: ${material.photo}`);
              } else {
                // No mapped image and no valid URL, set empty for placeholder
                material.photo = '';
                console.log(`🖼️ No image available for row ${rowIndex} - will use frontend placeholder`);
              }
            } else {
              skippedRows++;
              if (skippedRows <= 5) {
                const qtyValue = this.findColumnValue(row, this.columnMappings.qty);
                console.warn(`⚠️ Row ${rowIndex} skipped: Invalid quantity (found: "${qtyValue}"). Columns:`, Object.keys(row));
              }
            }
          }
          
          if (material) {
            processedMaterials.push(material);
          }
        } catch (error) {
          errors.push(`Row ${rowIndex}: ${error.message}`);
        }
      }
      
      if (processedMaterials.length === 0 && data.length > 0) {
        console.error('❌ No valid materials processed. Summary:');
        console.error(`   Total rows in file: ${data.length}`);
        console.error(`   Rows skipped: ${skippedRows}`);
        console.error(`   Errors: ${errors.length}`);
        console.error(`   Column names found:`, data.length > 0 ? Object.keys(data[0]) : 'none');
        console.error(`   Looking for columns: material (${this.columnMappings.material.join(', ')}), qty (${this.columnMappings.qty.join(', ')}), price (${this.columnMappings.priceToday.join(', ')})`);
      }

      return {
        success: true,
        materials: processedMaterials,
        totalRows: totalRows,
        successfulRows: processedMaterials.length,
        failedRows: errors.length,
        errors: errors
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        materials: [],
        totalRows: 0,
        successfulRows: 0,
        failedRows: 0,
        errors: [error.message]
      };
    }
  }

  async parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const data = [];
      const errors = [];
      let totalRows = 0;

      const stream = fs.createReadStream(filePath);
      
      stream.on('error', (error) => {
        reject(error);
      });

      stream
        .pipe(csv())
        .on('data', (row) => {
          totalRows++;
          data.push(row);
        })
        .on('end', () => {
          resolve({ data, errors, totalRows });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  async parseExcel(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // Use first sheet
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with null for empty cells instead of empty strings
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });
      
      // Extract images from Excel file
      console.log('🖼️ Extracting embedded images from Excel...');
      let extractedImages = [];
      let imageMap = {};
      
      try {
        extractedImages = await this.imageExtractor.extractImagesFromExcel(filePath);
        
        if (extractedImages.length > 0) {
          // Map images to rows (sequential mapping)
          imageMap = this.imageExtractor.mapImagesToRows(extractedImages, data.length);
          console.log(`✅ Successfully extracted ${extractedImages.length} images`);
        } else {
          console.log('ℹ️ No images found in Excel file');
        }
      } catch (imageError) {
        console.error('❌ Error extracting images:', imageError.message);
        // Continue without images - don't fail the entire parsing
      }
      
      return {
        data: data,
        errors: [],
        totalRows: data.length,
        extractedImages: extractedImages,
        imageMap: imageMap
      };
    } catch (error) {
      throw new Error(`Error parsing Excel file: ${error.message}`);
    }
  }

  async parsePDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      
      // Extract text and try to parse as table data
      const text = pdfData.text;
      const lines = text.split('\n').filter(line => line.trim());
      
      // Try to detect table structure
      const data = this.extractTableFromPDFText(lines);
      
      return {
        data: data,
        errors: data.length === 0 ? ['Could not extract tabular data from PDF'] : [],
        totalRows: data.length
      };
    } catch (error) {
      throw new Error(`Error parsing PDF file: ${error.message}`);
    }
  }

  async parseZip(filePath) {
    let tempDir = null;
    try {
      console.log('📦 Starting ZIP file processing:', filePath);
      
      // Verify file exists and is readable
      if (!fs.existsSync(filePath)) {
        throw new Error(`ZIP file not found: ${filePath}`);
      }
      
      const fileStats = fs.statSync(filePath);
      console.log(`📦 ZIP file size: ${(fileStats.size / 1024).toFixed(2)} KB`);
      
      // Create temporary directory for extraction (use OS temp if available, otherwise local)
      const os = require('os');
      const tempBase = os.tmpdir ? os.tmpdir() : path.join(__dirname, 'temp');
      tempDir = path.join(tempBase, `zip_extract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        console.log(`📁 Created temp directory: ${tempDir}`);
      }
      
      console.log('🔄 Extracting ZIP contents...');
      let extractedFiles;
      try {
        console.log(`📦 Attempting to extract ZIP from: ${filePath}`);
        console.log(`📁 Extracting to: ${tempDir}`);
        extractedFiles = await this.extractZipFile(filePath, tempDir);
        console.log(`✅ Successfully extracted ${extractedFiles.length} files from ZIP`);
        
        if (!Array.isArray(extractedFiles)) {
          throw new Error(`Extraction returned invalid data type: ${typeof extractedFiles}`);
        }
      } catch (extractError) {
        console.error('❌ ZIP extraction failed:', extractError);
        console.error('Extraction error stack:', extractError.stack);
        throw new Error(`Failed to extract ZIP file: ${extractError.message || extractError.toString()}`);
      }
      
      if (!extractedFiles || extractedFiles.length === 0) {
        throw new Error('ZIP file appears to be empty or extraction failed');
      }
      
      // Find data file (Excel or CSV) and images folder
      let dataFile = null;
      let dataFileType = null;
      let imagesDir = null;
      
      // First, search for data files
      for (const file of extractedFiles) {
        // Skip Mac metadata files and hidden files
        const fileName = path.basename(file);
        if (fileName.startsWith('._') || fileName.startsWith('.DS_Store')) {
          continue;
        }
        
        // Check for Excel files
        if ((file.endsWith('.xlsx') || file.endsWith('.xls')) && !dataFile) {
          dataFile = file;
          dataFileType = 'excel';
          console.log(`📊 Found Excel file: ${fileName}`);
        }
        // Check for CSV files (only if no Excel file found)
        else if (file.endsWith('.csv') && !dataFile) {
          dataFile = file;
          dataFileType = 'csv';
          console.log(`📊 Found CSV file: ${fileName}`);
        }
      }
      
      // Find images directory (could be at root or in subfolder)
      // Also check all directories for image files
      const allDirs = new Set();
      extractedFiles.forEach(file => {
        const dir = path.dirname(file);
        if (dir !== tempDir && dir !== '.') {
          allDirs.add(dir);
          // Also check parent directories
          let parentDir = path.dirname(dir);
          while (parentDir !== tempDir && parentDir !== dir && parentDir.length > tempDir.length) {
            allDirs.add(parentDir);
            parentDir = path.dirname(parentDir);
          }
        }
      });
      
      // Check if images are in root directory
      const rootImages = extractedFiles.filter(file => {
        const fileName = path.basename(file);
        return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName) && 
               path.dirname(file) === tempDir;
      });
      
      const possibleImageDirs = [
        tempDir, // Check root first
        path.join(tempDir, 'images'),
        path.join(tempDir, 'Images'),
        path.join(tempDir, 'IMAGES'),
        path.join(tempDir, 'test_folder', 'images'),
        path.join(tempDir, 'test_folder', 'Images'),
        ...Array.from(allDirs)
      ];
      
      for (const dirPath of possibleImageDirs) {
        if (fs.existsSync(dirPath)) {
          try {
            const stat = fs.statSync(dirPath);
            if (stat.isDirectory()) {
              // Check if directory contains image files
              const files = fs.readdirSync(dirPath);
              const imageFiles = files.filter(file => 
                /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file)
              );
              
              if (imageFiles.length > 0) {
                imagesDir = dirPath;
                console.log(`🖼️ Found images directory with ${imageFiles.length} images: ${dirPath}`);
                break;
              }
            } else if (rootImages.length > 0 && dirPath === tempDir) {
              // Images in root directory
              imagesDir = tempDir;
              console.log(`🖼️ Found ${rootImages.length} images in root directory`);
              break;
            }
          } catch (err) {
            // Skip if can't read directory
            continue;
          }
        }
      }
      
      if (!dataFile) {
        // Try to find any file that might be data (more flexible search)
        const dataFiles = extractedFiles.filter(file => {
          const ext = path.extname(file).toLowerCase();
          const fileName = path.basename(file).toLowerCase();
          return ['.csv', '.xlsx', '.xls'].includes(ext) && 
                 !fileName.startsWith('._') && 
                 !fileName.includes('~$'); // Exclude temp Excel files
        });
        
        if (dataFiles.length === 0) {
          // List what we found for debugging
          const foundFiles = extractedFiles.slice(0, 10).map(f => path.basename(f));
          console.error('❌ No data files found. Found files:', foundFiles);
          throw new Error(`No Excel (.xlsx/.xls) or CSV file found in ZIP archive. Found ${extractedFiles.length} files but none were valid data files. Please ensure your ZIP contains at least one Excel or CSV file.`);
        } else {
          // Use the first valid data file
          dataFile = dataFiles[0];
          dataFileType = path.extname(dataFile).toLowerCase().replace('.', '');
          console.log(`📊 Using first data file found: ${path.basename(dataFile)}`);
        }
      }
      
      console.log(`📊 Data file: ${dataFile ? path.basename(dataFile) : 'Not found'}`);
      console.log(`🖼️ Images directory: ${imagesDir ? 'Found' : 'Not found'}`);
      
      // Parse the data file
      let data = [];
      
      try {
        if (dataFileType === 'excel') {
          // Parse Excel file
          console.log(`📖 Reading Excel file: ${dataFile}`);
          const workbook = XLSX.readFile(dataFile);
          
          if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('Excel file appears to be empty or corrupted');
          }
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          if (!worksheet) {
            throw new Error(`Could not read worksheet "${sheetName}" from Excel file`);
          }
          
          data = XLSX.utils.sheet_to_json(worksheet, { defval: null });
          console.log(`📊 Parsed ${data.length} rows from Excel file`);
        } else if (dataFileType === 'csv') {
          // Parse CSV file
          console.log(`📖 Reading CSV file: ${dataFile}`);
          const csvResult = await this.parseCSV(dataFile);
          data = csvResult.data;
          console.log(`📊 Parsed ${data.length} rows from CSV file`);
        } else {
          throw new Error(`Unable to determine data file type: ${dataFileType}`);
        }
      } catch (parseError) {
        console.error('❌ Error parsing data file:', parseError);
        throw new Error(`Failed to parse ${dataFileType.toUpperCase()} file: ${parseError.message}`);
      }
      
      if (!data || data.length === 0) {
        throw new Error('No data rows found in the file. Please check that your file has data and is not empty.');
      }
      
      // Process images from the images folder
      let imageMap = {};
      let extractedImages = [];
      
      if (imagesDir && fs.existsSync(imagesDir)) {
        console.log('🖼️ Processing images from ZIP...');
        try {
          const imageFiles = fs.readdirSync(imagesDir).filter(file => 
            /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file)
          );
          
          console.log(`📸 Found ${imageFiles.length} image files`);
          
          // Copy images to uploads/images and create mapping
          const uploadsImagesDir = path.join(__dirname, 'uploads', 'images');
          if (!fs.existsSync(uploadsImagesDir)) {
            fs.mkdirSync(uploadsImagesDir, { recursive: true });
          }
          
          for (const imageFile of imageFiles) {
            try {
              const sourcePath = path.join(imagesDir, imageFile);
              const uniqueName = `${uuidv4()}${path.extname(imageFile)}`;
              const destPath = path.join(uploadsImagesDir, uniqueName);
              
              // Copy image file
              fs.copyFileSync(sourcePath, destPath);
              
              extractedImages.push({
                originalName: imageFile,
                fileName: uniqueName,
                filePath: destPath,
                relativePath: `uploads/images/${uniqueName}`,
                webPath: `/uploads/images/${uniqueName}`
              });
              
              console.log(`📸 Copied ${imageFile} → ${uniqueName}`);
            } catch (imgError) {
              console.error(`⚠️ Error copying image ${imageFile}:`, imgError.message);
            }
          }
          
          // Create image mapping based on photo column values
          if (extractedImages.length > 0) {
            imageMap = this.createImageMapFromPhotoColumn(data, extractedImages);
          }
        } catch (imgDirError) {
          console.error('⚠️ Error processing images directory:', imgDirError.message);
          // Don't fail the whole process if images fail
        }
      }
      
      // Clean up temporary directory
      if (tempDir) {
        this.cleanupDirectory(tempDir);
      }
      
      return {
        data: data,
        errors: [],
        totalRows: data.length,
        extractedImages: extractedImages,
        imageMap: imageMap
      };
      
    } catch (error) {
      // Clean up temp directory on error
      if (tempDir) {
        try {
          this.cleanupDirectory(tempDir);
        } catch (cleanupError) {
          console.error('⚠️ Error cleaning up temp directory:', cleanupError.message);
        }
      }
      
      console.error('❌ ZIP parsing error:', error);
      throw new Error(`Error parsing ZIP file: ${error.message}`);
    }
  }

  extractTableFromPDFText(lines) {
    const data = [];
    
    // For this specific inventory format, we'll look for patterns
    // The header pattern is: PhotoMaterialUnitQty.BrandSpecs photoSpecsConditionMRPPrice PurchasedPrice today
    let headerFound = false;
    let itemFields = [];
    let collectingItem = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;

      // Detect header row
      if (line.includes('PhotoMaterial') && line.includes('Price today')) {
        headerFound = true;
        continue;
      }

      if (!headerFound) continue;

      // Check if this line looks like the start of a new item
      const isNewItemStart = this.looksLikeMaterialName(line) && 
                            (itemFields.length === 0 || this.hasEnoughDataForItem(itemFields));
      
      if (isNewItemStart && itemFields.length > 0) {
        // Process previous item
        const processedItem = this.processInventoryItem(itemFields);
        if (processedItem) {
          data.push(processedItem);
        }
        itemFields = [];
      }
      
      // Add line to current item
      itemFields.push(line);
      collectingItem = true;
      
      // Check if we have enough data and next line starts a new item
      if (this.hasEnoughDataForItem(itemFields) && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine && this.looksLikeMaterialName(nextLine)) {
          // Process current item
          const processedItem = this.processInventoryItem(itemFields);
          if (processedItem) {
            data.push(processedItem);
          }
          itemFields = [];
          collectingItem = false;
        }
      }
    }

    // Process last item if exists
    if (itemFields.length > 0) {
      const processedItem = this.processInventoryItem(itemFields);
      if (processedItem) {
        data.push(processedItem);
      }
    }

    return data;
  }

  hasEnoughDataForItem(fields) {
    // Check if we have enough data to constitute an item
    // Need: material name, some numbers (qty, prices), and possibly inventory type
    let hasNumbers = false;
    let hasText = false;
    let hasInventoryType = false;
    
    for (const field of fields) {
      if (/^\d+(\.\d+)?$/.test(field.trim())) {
        hasNumbers = true;
      } else if (/^[A-Za-z\s]+$/.test(field.trim()) && field.trim().length > 2) {
        hasText = true;
      } else if (/^[A-Z]{1,3}$/.test(field.trim())) {
        hasInventoryType = true;
      }
    }
    
    return hasText && hasNumbers && fields.length >= 5;
  }

  looksLikeMaterialName(line) {
    // Material names are usually descriptive and longer
    if (line.length < 3) return false;
    
    // Common material indicators
    const materialKeywords = [
      'basin', 'shower', 'pipe', 'flange', 'elbow', 'sink', 'cabin', 'tanker', 
      'lock', 'hinge', 'door', 'window', 'tile', 'faucet', 'tap', 'valve',
      'counter', 'health', 'metro', 'overhead', 'bottle', 'trap', 'cp', 'ss'
    ];
    
    const lowerLine = line.toLowerCase();
    return materialKeywords.some(keyword => lowerLine.includes(keyword)) ||
           line.match(/^[A-Za-z\s]{5,}/); // At least 5 characters of text
  }

  looksLikeEndOfItem(currentLine, nextLine) {
    // End of item indicators
    if (!nextLine) return true;
    
    // If next line looks like a new material
    if (this.looksLikeMaterialName(nextLine)) return true;
    
    // If current line has inventory type indicators (B, BA, D, L, etc.)
    if (/^[A-Z]{1,3}$/.test(currentLine.trim())) return true;
    
    return false;
  }

  processInventoryItem(fields) {
    if (fields.length < 3) return null;
    
    // Reconstruct material name from potentially split fields
    let material = '';
    let numbers = [];
    let textFields = [];
    let unit = 'No.';
    let inventoryType = 'surplus';
    let condition = 'good';
    
    // First pass: categorize fields
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i].trim();
      if (!field) continue;
      
      if (/^\d+$/.test(field)) {
        numbers.push(parseInt(field));
      } else if (/^\d+(\.\d+)?$/.test(field)) {
        numbers.push(parseFloat(field));
      } else if (field === 'No.' || field === 'Pcs' || field === 'Kg' || field === 'Ltr') {
        unit = field;
      } else if (/^[A-Z]{1,3}$/.test(field)) {
        inventoryType = this.mapInventoryType(field);
      } else if (field.toLowerCase().includes('new') || field.toLowerCase().includes('good') || 
                 field.toLowerCase().includes('old') || field.toLowerCase().includes('packed')) {
        condition = field.toLowerCase().includes('new') ? 'new' : 
                   field.toLowerCase().includes('good') ? 'good' :
                   field.toLowerCase().includes('packed') ? 'good' : 'used';
      } else if (/^[A-Za-z\s]+$/.test(field) && field.length > 1) {
        textFields.push(field);
      }
    }
    
    // Reconstruct material name from text fields (exclude brand-like single words)
    if (textFields.length > 0) {
      // If first text field looks like a material description, use it
      if (textFields[0].length > 5 || textFields.length === 1) {
        material = textFields[0];
      } else {
        // Combine multiple short text fields
        material = textFields.slice(0, 2).join(' ');
      }
    }
    
    // Find brand (usually a single word that's not the material)
    let brand = '';
    for (const text of textFields) {
      if (text !== material && text.length > 2 && /^[A-Za-z]+$/.test(text)) {
        brand = text;
        break;
      }
    }
    
    // Extract quantities and prices from numbers
    // Sort numbers to identify patterns
    const sortedNumbers = [...numbers].sort((a, b) => a - b);
    
    let qty = 0;
    let priceToday = 0;
    let mrp = 0;
    let pricePurchased = 0;
    
    if (sortedNumbers.length >= 2) {
      // Assume smallest number is quantity (if reasonable)
      const potentialQty = sortedNumbers[0];
      if (potentialQty > 0 && potentialQty < 1000) {
        qty = potentialQty;
        
        // Remaining numbers are likely prices
        const priceNumbers = sortedNumbers.slice(1);
        if (priceNumbers.length >= 1) {
          priceToday = priceNumbers[priceNumbers.length - 1]; // Highest price as current price
          if (priceNumbers.length >= 2) {
            pricePurchased = priceNumbers[0]; // Lowest as purchased price
          }
          if (priceNumbers.length >= 3) {
            mrp = Math.max(...priceNumbers); // Highest as MRP
          }
        }
      } else {
        // If first number is too large for quantity, try second smallest
        if (sortedNumbers.length >= 2) {
          const secondSmallest = sortedNumbers[1];
          if (secondSmallest > 0 && secondSmallest < 1000) {
            qty = secondSmallest;
            const remainingNumbers = sortedNumbers.filter(n => n !== secondSmallest);
            if (remainingNumbers.length > 0) {
              priceToday = remainingNumbers[remainingNumbers.length - 1];
              if (remainingNumbers.length >= 2) {
                pricePurchased = remainingNumbers[0];
              }
            }
          }
        }
      }
    }
    
    // Fallback: if still no reasonable quantity found, try to extract from the data pattern
    if (qty === 0 && numbers.length > 0) {
      // Look for small numbers that could be quantities
      for (const num of numbers) {
        if (num > 0 && num < 100) {
          qty = num;
          break;
        }
      }
      
      // If still no qty, use a reasonable default
      if (qty === 0) {
        qty = 1;
      }
      
      // Use largest number as price
      if (priceToday === 0 && numbers.length > 0) {
        priceToday = Math.max(...numbers.filter(n => n > qty));
      }
    }
    
    // Must have material, quantity, and price
    if (!material || qty <= 0 || priceToday <= 0) {
      return null;
    }
    
    // Map inventory type to category - ONLY use the inventory type code
    const category = this.mapInventoryTypeToCategory(inventoryType) || 'Other';
    
    return {
      material: material,
      unit: unit,
      qty: qty,
      brand: brand || 'n/a',
      condition: condition,
      mrp: mrp,
      pricePurchased: pricePurchased,
      priceToday: priceToday,
      inventoryType: inventoryType,
      category: category,
      specs: 'n/a',
      photo: 'n/a',
      specsPhoto: 'n/a',
      dimensions: 'n/a',
      weight: 0
    };
  }

  mapInventoryType(code) {
    const mapping = {
      'B': 'surplus',
      'BA': 'surplus', 
      'D': 'damaged',
      'L': 'liquidation',
      'N': 'new',
      'U': 'used'
    };
    return mapping[code] || 'surplus';
  }

  looksLikeHeader(line) {
    const lowerLine = line.toLowerCase();
    const headerKeywords = ['material', 'item', 'quantity', 'price', 'brand', 'condition'];
    return headerKeywords.some(keyword => lowerLine.includes(keyword));
  }

  looksLikeDataRow(line) {
    // Check if line contains numbers (likely quantities or prices)
    return /\d/.test(line) && line.split(/\s+/).length >= 3;
  }

  parseTableRow(line) {
    // Split by multiple spaces or tabs, but preserve single spaces within values
    return line.split(/\s{2,}|\t/).map(cell => cell.trim()).filter(cell => cell);
  }

  processRow(row, sellerId, projectId, rowIndex) {
    // Extract material name (mandatory)
    const materialName = this.findColumnValue(row, this.columnMappings.material);
    if (!materialName) {
      throw new Error('Material name is required');
    }

    // Extract quantity (skip if zero or missing)
    const qtyValue = this.findColumnValue(row, this.columnMappings.qty);
    const qty = this.parseNumber(qtyValue);
    if (!qty || qty <= 0) {
      return null; // Skip this row instead of throwing error
    }

    // Extract selling price (try to get it, but allow zero/missing)
    const priceValue = this.findColumnValue(row, this.columnMappings.priceToday);
    const priceToday = this.parseNumber(priceValue);
    
    // If no price is available, try to get MRP or purchased price as fallback
    let finalPrice = priceToday;
    if (finalPrice <= 0) {
      const mrpValue = this.findColumnValue(row, this.columnMappings.mrp);
      const mrpPrice = this.parseNumber(mrpValue);
      if (mrpPrice > 0) {
        finalPrice = mrpPrice;
      } else {
        const purchasedValue = this.findColumnValue(row, this.columnMappings.pricePurchased);
        const purchasedPrice = this.parseNumber(purchasedValue);
        if (purchasedPrice > 0) {
          finalPrice = purchasedPrice;
        } else {
          // Set a minimal price to avoid validation error, but mark inventory value as 0
          finalPrice = 1;
        }
      }
    }

    // Extract inventory type code first (needed for both category mapping and material object)
    const inventoryTypeCode = this.findColumnValue(row, this.columnMappings.inventoryType);
    
    // First, try to get category directly from Excel "Category" column
    let category = this.findColumnValue(row, this.columnMappings.category);
    
    // If no direct category column, use inventory type code mapping
    if (!category || category.trim() === '') {
      category = this.mapInventoryTypeToCategory(inventoryTypeCode);
    }
    
    // Normalize category name to match frontend categories
    category = this.normalizeCategoryName(category);
    
    // If still no category, try to categorize based on material name
    if (!category || category.trim() === '') {
      category = this.categorizeItem(materialName);
      // Normalize the categorized result
      category = this.normalizeCategoryName(category);
    }
    
    // If no valid category found after all attempts, default to 'Other'
    if (!category || category.trim() === '') {
      category = 'Other';
    }

    // Create material object with extracted data
    const material = {
      id: uuidv4(),
      sellerId: sellerId,
      projectId: projectId || 'default',
      material: materialName,
      brand: this.safeStringValue(row, this.columnMappings.brand, 'n/a'),
      category: category,
      condition: this.findColumnValue(row, this.columnMappings.condition) || 'good',
      qty: qty,
      unit: this.findColumnValue(row, this.columnMappings.unit) || 'pcs',
      priceToday: finalPrice,
      mrp: this.safeNumericValue(row, this.columnMappings.mrp, 0),
      pricePurchased: this.safeNumericValue(row, this.columnMappings.pricePurchased, 0),
      inventoryValue: (finalPrice && finalPrice > 1) ? finalPrice * qty : 0,
      inventoryType: inventoryTypeCode || 'surplus',
      listingType: 'resale',
      specs: this.safeStringValue(row, this.columnMappings.specs, ''),
      photo: this.safeStringValue(row, this.columnMappings.photo, ''),
      specsPhoto: this.safeStringValue(row, this.columnMappings.specsPhoto, ''),
      dimensions: this.safeStringValue(row, this.columnMappings.dimensions, 'n/a'),
      weight: this.safeNumericValue(row, this.columnMappings.weight, 0),
      createdAt: new Date().toISOString()
    };

    return material;
  }

  findColumnValue(data, fieldMappings) {
    // First, normalize the data keys to handle Excel's quirky column names
    const normalizedData = {};
    for (const key in data) {
      // Remove extra spaces, convert to lowercase for matching
      const normalizedKey = key.trim().replace(/\s+/g, ' ');
      normalizedData[normalizedKey.toLowerCase()] = data[key];
      normalizedData[key] = data[key]; // Keep original too
    }
    
    for (const mapping of fieldMappings) {
      // Try exact match first (case-sensitive)
      let value = data[mapping];
      if (value !== undefined && value !== null && value !== '') {
        const strValue = String(value).trim();
        if (strValue !== '') {
          return strValue;
        }
      }

      // Try case-insensitive match
      const mappingLower = mapping.toLowerCase().trim();
      value = normalizedData[mappingLower];
      if (value !== undefined && value !== null && value !== '') {
        const strValue = String(value).trim();
        if (strValue !== '') {
          return strValue;
        }
      }
      
      // Try partial matching (e.g., "Material Name" matches "Material")
      for (const key in data) {
        const keyLower = key.toLowerCase().trim().replace(/\s+/g, ' ');
        const mappingWords = mappingLower.split(/[\s_\-]+/);
        
        // Check if all words in mapping are present in the key
        if (mappingWords.every(word => word.length > 0 && keyLower.includes(word))) {
          value = data[key];
          if (value !== undefined && value !== null && value !== '') {
            const strValue = String(value).trim();
            if (strValue !== '') {
              return strValue;
            }
          }
        }
      }
    }
    return null;
  }

  // Helper function to safely get string value or return "n/a"
  safeStringValue(data, fieldMappings, defaultValue = 'n/a') {
    const value = this.findColumnValue(data, fieldMappings);
    return value || defaultValue;
  }

  // Helper function to safely get numeric value without affecting calculations
  safeNumericValue(data, fieldMappings, defaultValue = 0) {
    const value = this.findColumnValue(data, fieldMappings);
    const parsed = this.parseNumber(value);
    return parsed > 0 ? parsed : defaultValue;
  }

  parseNumber(value) {
    if (!value || value === null || value === undefined) return 0;
    
    // Convert to string and trim
    let cleanValue = String(value).trim();
    
    // Handle empty strings
    if (cleanValue === '') return 0;
    
    // Remove currency symbols and commas
    cleanValue = cleanValue.replace(/[$,€£¥₹]/g, '');
    
    // Handle fractions or ranges (like "665/735" or "100-200")
    if (cleanValue.includes('/')) {
      const parts = cleanValue.split('/');
      if (parts.length === 2) {
        const num1 = parseFloat(parts[0].trim());
        const num2 = parseFloat(parts[1].trim());
        if (!isNaN(num1) && !isNaN(num2)) {
          // Return the average of the two numbers
          return (num1 + num2) / 2;
        } else if (!isNaN(num1)) {
          return num1; // Use first number if second is invalid
        } else if (!isNaN(num2)) {
          return num2; // Use second number if first is invalid
        }
      }
    }
    
    // Handle ranges with dashes
    if (cleanValue.includes('-') && !cleanValue.startsWith('-')) {
      const parts = cleanValue.split('-');
      if (parts.length === 2) {
        const num1 = parseFloat(parts[0].trim());
        const num2 = parseFloat(parts[1].trim());
        if (!isNaN(num1) && !isNaN(num2)) {
          return (num1 + num2) / 2; // Return average
        } else if (!isNaN(num1)) {
          return num1;
        } else if (!isNaN(num2)) {
          return num2;
        }
      }
    }
    
    // Try to parse as regular number
    const number = parseFloat(cleanValue);
    
    return isNaN(number) ? 0 : number;
  }

  // Map inventory type codes to category names (matching frontend categories)
  mapInventoryTypeToCategory(inventoryType) {
    if (!inventoryType) return null;
    
    const type = inventoryType.toString().trim().toUpperCase();
    
    const inventoryTypeMap = {
      'B': 'Toilets & Sanitary', // Bathroom items → Toilets & Sanitary
      'BA': 'Other', // Big Appliances → Other (not in frontend list)
      'D': 'Doors',
      'E': 'Electrical',
      'F': 'Furniture', // Furniture → Furniture
      'H': 'Handles & Hardware',
      'L': 'Lighting',
      'P': 'Plumbing',
      'S': 'Toilets & Sanitary',
      'SF': 'Lighting', // Fans → Lighting (closest match)
      'T': 'Tiles'
    };
    
    return inventoryTypeMap[type] || null;
  }

  // Normalize category names to match frontend categories
  normalizeCategoryName(category) {
    if (!category) return null;
    
    const normalized = category.toString().trim();
    const upper = normalized.toUpperCase();
    
    // Define frontend categories (must match server.js)
    const frontendCategories = [
      'Doors',
      'Tiles',
      'Handles & Hardware',
      'Toilets & Sanitary',
      'Windows',
      'Flooring',
      'Lighting',
      'Paint & Finishes',
      'Plumbing',
      'Electrical',
      'Furniture',
      'Marbles',
      'Other'
    ];
    
    // Exact match check
    if (frontendCategories.includes(normalized)) {
      return normalized;
    }
    
    // Common variations mapping (including singular/plural variations)
    const variations = {
      'TILE': 'Tiles',          // singular → plural
      'TILES': 'Tiles',          // already plural
      'TILE S': 'Tiles',
      'TILE S': 'Tiles',
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
    
    // Check variations (case-insensitive)
    if (variations[upper]) {
      return variations[upper];
    }
    
    // Partial matching for common patterns (handles "Tile" vs "Tiles")
    if (upper.includes('TILE')) return 'Tiles';  // Catches both "Tile" and "Tiles"
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
    
    return null;
  }

  categorizeItem(materialName) {
    if (!materialName) return 'Other';
    
    const name = materialName.toLowerCase();
    
    // Check for furniture items first (before other matches)
    if (name.includes('furniture') || name.includes('cabinet') || name.includes('chair') || 
        name.includes('table') || name.includes('pouf') || name.includes('sofa') || 
        name.includes('bed') || name.includes('wardrobe') || name.includes('dresser') ||
        name.includes('center table') || name.includes('coffee table') || name.includes('side table')) {
      return 'Furniture';
    }
    
    // Check for plumbing items (geyser, water heater, etc.)
    if (name.includes('geyser') || name.includes('water heater') || name.includes('hot water')) {
      return 'Plumbing';
    }
    
    if (name.includes('door')) return 'Doors';
    if (name.includes('tile') || name.includes('ceramic') || name.includes('marble') || name.includes('granite')) {
      // Distinguish between tiles and marbles
      if (name.includes('marble') || name.includes('granite')) return 'Marbles';
      return 'Tiles';
    }
    if (name.includes('handle') || name.includes('knob') || name.includes('lock') || name.includes('hinge')) {
      return 'Handles & Hardware';
    }
    if (name.includes('toilet') || name.includes('sink') || name.includes('basin') || name.includes('faucet') || name.includes('tap')) {
      return 'Toilets & Sanitary';
    }
    if (name.includes('bath') || name.includes('shower')) return 'Toilets & Sanitary';
    if (name.includes('window') || name.includes('glass')) return 'Windows';
    if (name.includes('floor') || name.includes('laminate') || name.includes('vinyl') || name.includes('carpet')) return 'Flooring';
    if (name.includes('light') || name.includes('lamp') || name.includes('bulb') || name.includes('fixture')) return 'Lighting';
    if (name.includes('fan') || name.includes('ventilat')) return 'Lighting';
    if (name.includes('paint') || name.includes('primer') || name.includes('varnish') || name.includes('coating')) return 'Paint & Finishes';
    if (name.includes('pipe') || name.includes('plumb') || name.includes('valve')) return 'Plumbing';
    if (name.includes('wire') || name.includes('electric') || name.includes('switch') || name.includes('outlet') || name.includes('socket')) return 'Electrical';
    if (name.includes('appliance') || name.includes('refrigerat') || name.includes('washing') || name.includes('dishwash')) return 'Other';
    
    return 'Other';
  }

  // Extract ZIP file to temporary directory
  async extractZipFile(zipPath, tempDir) {
    return new Promise((resolve, reject) => {
      const extractedFiles = [];
      let isComplete = false;
      let hasError = false;
      
      // Add timeout protection (30 seconds for extraction)
      const extractionTimeout = setTimeout(() => {
        if (!isComplete) {
          isComplete = true;
          hasError = true;
          console.error('⏱️ ZIP extraction timeout after 30 seconds');
          reject(new Error('ZIP extraction timeout - file may be corrupted or too large'));
        }
      }, 30000);
      
      // Track active operations to ensure we don't miss entries
      let pendingReads = 0;
      let totalEntries = 0;
      let processedEntries = 0;
      
      try {
        yauzl.open(zipPath, { lazyEntries: true, decodeStrings: true }, (err, zipfile) => {
          if (err) {
            clearTimeout(extractionTimeout);
            console.error('❌ Error opening ZIP file:', err);
            reject(new Error(`Failed to open ZIP file: ${err.message}`));
            return;
          }
          
          if (!zipfile) {
            clearTimeout(extractionTimeout);
            reject(new Error('Failed to open ZIP file - invalid or corrupted archive'));
            return;
          }
          
          console.log('✅ ZIP file opened successfully');
          
          // Start reading entries
          zipfile.readEntry();
          
          zipfile.on('entry', (entry) => {
            totalEntries++;
            processedEntries++;
            
            try {
              // Handle directory entries
              if (/\/$/.test(entry.fileName)) {
                const dirPath = path.join(tempDir, entry.fileName);
                if (!fs.existsSync(dirPath)) {
                  fs.mkdirSync(dirPath, { recursive: true });
                }
                zipfile.readEntry();
                return;
              }
              
              // Skip dangerous file paths (security)
              if (entry.fileName.includes('..') || entry.fileName.startsWith('/')) {
                console.warn(`⚠️ Skipping potentially unsafe path: ${entry.fileName}`);
                zipfile.readEntry();
                return;
              }
              
              // File entry - open read stream
              pendingReads++;
              
              zipfile.openReadStream(entry, (err, readStream) => {
                pendingReads--;
                
                if (err) {
                  console.error(`❌ Error reading ZIP entry "${entry.fileName}":`, err.message);
                  // Continue with next entry instead of failing completely
                  zipfile.readEntry();
                  return;
                }
                
                if (!readStream) {
                  console.error(`❌ No read stream for entry: ${entry.fileName}`);
                  zipfile.readEntry();
                  return;
                }
                
                try {
                  const filePath = path.join(tempDir, entry.fileName);
                  const fileDir = path.dirname(filePath);
                  
                  // Ensure directory exists
                  if (!fs.existsSync(fileDir)) {
                    fs.mkdirSync(fileDir, { recursive: true });
                  }
                  
                  const writeStream = fs.createWriteStream(filePath);
                  
                  readStream.pipe(writeStream);
                  
                  writeStream.on('close', () => {
                    extractedFiles.push(filePath);
                    console.log(`📄 Extracted (${extractedFiles.length}/${totalEntries}): ${entry.fileName}`);
                    
                    // Continue reading entries
                    zipfile.readEntry();
                  });
                  
                  writeStream.on('error', (err) => {
                    console.error(`❌ Error writing file "${entry.fileName}":`, err.message);
                    // Continue with next entry
                    zipfile.readEntry();
                  });
                  
                  readStream.on('error', (err) => {
                    console.error(`❌ Error reading stream for "${entry.fileName}":`, err.message);
                    // Continue with next entry
                    zipfile.readEntry();
                  });
                  
                } catch (fileError) {
                  console.error(`❌ Error processing file "${entry.fileName}":`, fileError.message);
                  zipfile.readEntry();
                }
              });
              
            } catch (entryError) {
              console.error(`❌ Error processing entry "${entry.fileName}":`, entryError.message);
              zipfile.readEntry();
            }
          });
          
          zipfile.on('end', () => {
            console.log(`📦 ZIP file reading completed. Total entries processed: ${totalEntries}`);
            clearTimeout(extractionTimeout);
            
            // Wait a bit for any pending writes to complete
            let checkCount = 0;
            const maxChecks = 50; // 5 seconds max wait (50 * 100ms)
            
            const checkComplete = setInterval(() => {
              checkCount++;
              
              if (pendingReads === 0 || hasError || checkCount >= maxChecks) {
                clearInterval(checkComplete);
                
                if (!isComplete) {
                  isComplete = true;
                  if (hasError && extractedFiles.length === 0) {
                    // If there was an error and no files extracted, reject
                    reject(new Error('ZIP extraction failed - no files were extracted'));
                  } else {
                    console.log(`✅ ZIP extraction completed. ${extractedFiles.length} files extracted from ${totalEntries} total entries.`);
                    resolve(extractedFiles);
                  }
                }
              }
            }, 100);
            
            // Safety timeout for pending operations
            setTimeout(() => {
              clearInterval(checkComplete);
              if (!isComplete) {
                isComplete = true;
                if (extractedFiles.length === 0) {
                  reject(new Error('ZIP extraction timeout - no files were extracted'));
                } else {
                  console.log(`✅ ZIP extraction completed (with ${pendingReads} pending operations). ${extractedFiles.length} files extracted.`);
                  resolve(extractedFiles);
                }
              }
            }, 5000); // Increased to 5 seconds for safety
          });
          
          zipfile.on('error', (err) => {
            clearTimeout(extractionTimeout);
            if (!isComplete) {
              isComplete = true;
              hasError = true;
              console.error('❌ ZIP file error:', err);
              reject(new Error(`ZIP file error: ${err.message}`));
            }
          });
        });
      } catch (openError) {
        clearTimeout(extractionTimeout);
        console.error('❌ Exception opening ZIP:', openError);
        reject(new Error(`Failed to process ZIP file: ${openError.message}`));
      }
    });
  }

  // Create image mapping based on photo column values
  createImageMapFromPhotoColumn(data, extractedImages) {
    console.log('🔗 Creating image mapping from photo column...');
    
    const imageMap = {};
    
    // Create a lookup map of original image names to extracted images
    const imageNameMap = {};
    extractedImages.forEach(img => {
      imageNameMap[img.originalName.toLowerCase()] = img;
    });
    
    // Process each row to map photo column values to actual images
    data.forEach((row, index) => {
      const rowIndex = index + 1;
      
      // Find photo column value
      const photoValue = this.findColumnValue(row, this.columnMappings.photo);
      
      if (photoValue && photoValue.trim() !== '') {
        const photoFileName = photoValue.trim().toLowerCase();
        
        // Look for matching image
        if (imageNameMap[photoFileName]) {
          imageMap[rowIndex] = imageNameMap[photoFileName].webPath;
          console.log(`🔗 Mapped "${photoValue}" to row ${rowIndex}`);
        } else {
          console.log(`⚠️ Photo "${photoValue}" not found in images folder for row ${rowIndex}`);
        }
      }
    });
    
    console.log(`📊 Successfully mapped ${Object.keys(imageMap).length} images from photo column`);
    return imageMap;
  }

  // Clean up temporary directory
  cleanupDirectory(dirPath) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`🧹 Cleaned up temporary directory: ${dirPath}`);
      }
    } catch (error) {
      console.error('⚠️ Error cleaning up directory:', error.message);
    }
  }

  // Get supported file types
  getSupportedTypes() {
    return {
      csv: {
        extensions: ['.csv'],
        mimeTypes: ['text/csv', 'application/csv'],
        description: 'Comma Separated Values'
      },
      excel: {
        extensions: ['.xlsx', '.xls'],
        mimeTypes: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel'
        ],
        description: 'Microsoft Excel'
      },
      pdf: {
        extensions: ['.pdf'],
        mimeTypes: ['application/pdf'],
        description: 'Portable Document Format'
      },
      zip: {
        extensions: ['.zip'],
        mimeTypes: ['application/zip', 'application/x-zip-compressed'],
        description: 'ZIP Archive with Excel and Images'
      }
    };
  }

  getFileType(filename, mimetype) {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    
    if (['.csv'].includes(ext) || mimetype?.includes('csv')) {
      return 'csv';
    } else if (['.xlsx', '.xls'].includes(ext) || mimetype?.includes('spreadsheet') || mimetype?.includes('excel')) {
      return 'xlsx';
    } else if (['.pdf'].includes(ext) || mimetype?.includes('pdf')) {
      return 'pdf';
    } else if (['.zip'].includes(ext) || mimetype?.includes('zip')) {
      return 'zip';
    }
    
    return null;
  }
}

module.exports = FileParser;
