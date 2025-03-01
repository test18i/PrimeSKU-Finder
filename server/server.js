const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const ExcelJS = require('exceljs');

const app = express();
app.use(express.json());
app.use(cors());

// Instead of diskStorage, use memoryStorage
const upload = multer({ storage: multer.memoryStorage() });

/**
 * ===============
 * MODELS
 * ===============
 */

// Updated User model with priceListAccess
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  priceListAccess: { type: String } // "FSD", "Retail", or "ALL"
});
const User = mongoose.model('User', UserSchema);

// Updated SKU model: store image in MongoDB as a Buffer
const SKUSchema = new mongoose.Schema({
  camsSkuCode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  brand: { type: String, required: true },
  packing: { type: String, required: true },
  priceFSD: { type: String, default: "" },
  priceRetail: { type: String, default: "" },
  priceALL: { type: String, default: "" },
  vat: { type: String, required: true },
  excisable: { type: String, required: true },
  exciseAmount: { type: String, required: true },
  country: { type: String, required: true },
  division: { type: String, required: true },
  image: { type: Buffer }, // <--- storing PNG image here
  lastModifiedDate: { type: Date, default: Date.now }
});
const SKU = mongoose.model('SKU', SKUSchema);

// Connect to MongoDB Atlas
const mongoURI = 'mongodb+srv://admin:sJXSykF7IRBuyCe3@primetradingskufinder.5igum.mongodb.net/PrimeSKU?retryWrites=true&w=majority&appName=PrimetradingSkuFinder';
mongoose.connect(mongoURI)
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas');

    // Ensure at least one admin user
    const existingAdmin = await User.findOne({ username: 'Jafar' });
    if (!existingAdmin) {
      const newAdmin = new User({
        username: 'Jafar',
        password: 'Prime',
        role: 'admin',
        priceListAccess: 'ALL'
      });
      try {
        await newAdmin.save();
        console.log('✅ Default admin user created');
      } catch (err) {
        console.error('❌ Error creating default admin user:', err);
      }
    }

    // Ensure default normal user "Sales"
    const existingSales = await User.findOne({ username: 'Sales' });
    if (!existingSales) {
      const newUser = new User({
        username: 'Sales',
        password: 'Sales123',
        role: 'user',
        priceListAccess: 'FSD'
      });
      try {
        await newUser.save();
        console.log('✅ Default normal user created');
      } catch (err) {
        console.error('❌ Error creating default normal user:', err);
      }
    }
  })
  .catch(err => console.error('❌ MongoDB Connection Failed:', err.message));

/**
 * ===============
 * SKU ROUTES
 * ===============
 */

app.post('/add-sku', upload.single('file'), async (req, res) => {
  try {
    const {
      camsSkuCode, name, brand, packing,
      priceFSD, priceRetail, priceALL,
      vat, excisable, exciseAmount,
      country, division
    } = req.body;

    let imageBuffer = null;
    if (req.file) {
      imageBuffer = req.file.buffer; // store directly from memory
    }

    const newSku = new SKU({
      camsSkuCode,
      name,
      brand,
      packing,
      priceFSD,
      priceRetail,
      priceALL,
      vat,
      excisable,
      exciseAmount,
      country,
      division,
      image: imageBuffer,
      lastModifiedDate: Date.now()
    });
    await newSku.save();
    res.status(201).json({ success: true, message: 'SKU added successfully' });
  } catch (err) {
    console.error('Error adding SKU:', err.message);
    res.status(500).json({ success: false, message: 'Error adding SKU', error: err.message });
  }
});

app.put('/skus/:id', upload.single('file'), async (req, res) => {
  try {
    const skuId = req.params.id;
    const existingSku = await SKU.findById(skuId);
    if (!existingSku) {
      return res.status(404).json({ success: false, message: 'SKU not found' });
    }

    const removeImage = req.body.removeImage === "true";

    existingSku.camsSkuCode = req.body.camsSkuCode;
    existingSku.name = req.body.name;
    existingSku.brand = req.body.brand;
    existingSku.packing = req.body.packing;
    existingSku.priceFSD = req.body.priceFSD;
    existingSku.priceRetail = req.body.priceRetail;
    existingSku.priceALL = req.body.priceALL;
    existingSku.vat = req.body.vat;
    existingSku.excisable = req.body.excisable;
    existingSku.exciseAmount = req.body.exciseAmount;
    existingSku.country = req.body.country;
    existingSku.division = req.body.division;
    existingSku.lastModifiedDate = Date.now();

    if (removeImage) {
      existingSku.image = undefined;
    } else if (req.file) {
      existingSku.image = req.file.buffer;
    }

    await existingSku.save();
    res.json({ success: true, message: 'SKU updated successfully' });
  } catch (err) {
    console.error('Error updating SKU:', err.message);
    res.status(500).json({ success: false, message: 'Error updating SKU', error: err.message });
  }
});

app.delete('/skus/:id', async (req, res) => {
  try {
    const skuId = req.params.id;
    const existingSku = await SKU.findByIdAndDelete(skuId);
    if (!existingSku) {
      return res.status(404).json({ success: false, message: 'SKU not found' });
    }
    res.json({ success: true, message: 'SKU deleted successfully' });
  } catch (err) {
    console.error('Error deleting SKU:', err.message);
    res.status(500).json({ success: false, message: 'Error deleting SKU', error: err.message });
  }
});

app.delete('/skus', async (req, res) => {
  if (req.query.deleteAll === "true") {
    try {
      await SKU.deleteMany({});
      res.json({ success: true, message: 'All SKUs deleted successfully' });
    } catch (err) {
      console.error('Error deleting all SKUs:', err.message);
      res.status(500).json({ success: false, message: 'Error deleting all SKUs', error: err.message });
    }
  } else {
    res.status(400).json({ success: false, message: 'deleteAll flag not set' });
  }
});

/**
 * ===============
 * USER ROUTES
 * ===============
 */

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (user) {
      res.json({
        success: true,
        message: 'Login successful',
        role: user.role,
        priceListAccess: user.priceListAccess || 'ALL'
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/users', async (req, res) => {
  try {
    const { search } = req.query;
    let filter = {};
    if (search && search.trim() !== '') {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
        { priceListAccess: { $regex: search, $options: 'i' } }
      ];
    }
    const users = await User.find(filter).select('-password');
    res.json({ success: true, users });
  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.status(500).json({ success: false, message: 'Error fetching users', error: err.message });
  }
});

app.post('/users', async (req, res) => {
  try {
    const { username, password, role, priceListAccess } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ success: false, message: 'Please provide username, password, and role.' });
    }
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User already exists.' });
    }
    let finalAccess = priceListAccess;
    if (!finalAccess) {
      finalAccess = (role === 'admin') ? 'ALL' : 'FSD';
    }
    const newUser = new User({
      username,
      password,
      role,
      priceListAccess: finalAccess
    });
    await newUser.save();
    res.json({ success: true, message: 'User created successfully.' });
  } catch (err) {
    console.error('Error creating user:', err.message);
    res.status(500).json({ success: false, message: 'Error creating user', error: err.message });
  }
});

app.put('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, password, role, priceListAccess } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (username) user.username = username;
    if (typeof password === 'string' && password.trim() !== '') {
      user.password = password;
    }
    if (role) user.role = role;
    if (priceListAccess) user.priceListAccess = priceListAccess;
    await user.save();
    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    console.error('Error updating user:', err.message);
    res.status(500).json({ success: false, message: 'Error updating user', error: err.message });
  }
});

app.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err.message);
    res.status(500).json({ success: false, message: 'Error deleting user', error: err.message });
  }
});

/**
 * ===============
 * SKU SEARCH & EXPORT
 * ===============
 */

// GET route to retrieve SKUs with filtering
// We'll send the image as base64 for easy usage on frontend
app.get('/skus', async (req, res) => {
  try {
    const { search, division, vat } = req.query;
    let filter = {};

    if (search && search.trim() !== '') {
      filter.$or = [
        { camsSkuCode: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { packing: { $regex: search, $options: 'i' } },
        { priceFSD: { $regex: search, $options: 'i' } },
        { priceRetail: { $regex: search, $options: 'i' } },
        { priceALL: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
        { division: { $regex: '^' + search + '$', $options: 'i' } }
      ];
    }
    if (division && division !== 'all') filter.division = division;
    if (vat && vat === "true") filter.vat = "5%";

    // Return all fields, including image
    const skus = await SKU.find(filter);

    // Convert image buffer to base64
    const response = skus.map(sku => {
      const obj = sku.toObject();
      if (obj.image) {
        obj.imageBase64 = obj.image.toString('base64');
      } else {
        obj.imageBase64 = "";
      }
      delete obj.image; // we won't send raw Buffer
      return obj;
    });

    res.json(response);
  } catch (err) {
    console.error('Error retrieving SKUs:', err.message);
    res.status(500).json({ success: false, message: 'Error retrieving SKUs', error: err.message });
  }
});

/**
 * ===============
 * EXPORT SKUs (Images from DB Buffers)
 * ===============
 */
app.get('/export-skus', async (req, res) => {
  try {
    let filter = {};
    if (req.query.ids) {
      const ids = req.query.ids.split(",");
      filter = { _id: { $in: ids } };
    }
    const skus = await SKU.find(filter);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('SKUs');

    worksheet.columns = [
      { header: 'CAMS SKU CODE', key: 'camsSkuCode', width: 20 },
      { header: 'Name', key: 'name', width: 40 },
      { header: 'Brand', key: 'brand', width: 20 },
      { header: 'Packing', key: 'packing', width: 15 },

      { header: 'PRICE ALL', key: 'priceALL', width: 12 },
      { header: 'PRICE FSD', key: 'priceFSD', width: 12 },
      { header: 'PRICE RETAIL', key: 'priceRetail', width: 12 },

      { header: 'VAT', key: 'vat', width: 10 },
      { header: 'Excisable', key: 'excisable', width: 10 },
      { header: 'Excise Amount', key: 'exciseAmount', width: 15 },
      { header: 'Country', key: 'country', width: 20 },
      { header: 'Division', key: 'division', width: 15 },
      { header: 'Last Modified', key: 'lastModifiedDate', width: 20 },

      // Column to indicate "Has Image" or embed in cell area
      { header: 'Image', key: 'imageColumn', width: 20 }
    ];

    // Fill rows
    skus.forEach((sku, idx) => {
      const rowIndex = idx + 2;
      worksheet.addRow({
        camsSkuCode: sku.camsSkuCode,
        name: sku.name,
        brand: sku.brand,
        packing: sku.packing,
        priceALL: sku.priceALL,
        priceFSD: sku.priceFSD,
        priceRetail: sku.priceRetail,
        vat: sku.vat,
        excisable: sku.excisable,
        exciseAmount: sku.exciseAmount,
        country: sku.country,
        division: sku.division,
        lastModifiedDate: sku.lastModifiedDate,
        imageColumn: sku.image && sku.image.length > 0 ? 'Yes' : 'No'
      });

      if (sku.image && sku.image.length > 0) {
        // Add image to workbook
        const imageId = workbook.addImage({
          buffer: sku.image, // direct from DB
          extension: 'png'
        });
        // Place the image near the last column
        worksheet.addImage(imageId, {
          tl: { col: 13.2, row: rowIndex - 0.8 },
          ext: { width: 80, height: 80 }
        });
        // Increase row height
        worksheet.getRow(rowIndex).height = 80;
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=skus.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error exporting SKUs:', err.message);
    res.status(500).json({ success: false, message: 'Error exporting SKUs', error: err.message });
  }
});

/**
 * ===============
 * TEMPLATE (Include Image File Name if needed)
 * ===============
 */
app.get('/template-skus', async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('SKUs');

    // New order includes "Price ALL, Price FSD, Price Retail"
    // Potential "Image File Name" for reference (optional usage)
    worksheet.columns = [
      { header: 'CAMS SKU CODE', key: 'camsSkuCode', width: 20 },
      { header: 'Name', key: 'name', width: 40 },
      { header: 'Brand', key: 'brand', width: 20 },
      { header: 'Packing', key: 'packing', width: 15 },

      { header: 'Price ALL', key: 'priceALL', width: 12 },
      { header: 'Price FSD', key: 'priceFSD', width: 12 },
      { header: 'Price Retail', key: 'priceRetail', width: 12 },

      { header: 'VAT', key: 'vat', width: 10 },
      { header: 'Excisable', key: 'excisable', width: 10 },
      { header: 'Excise Amount', key: 'exciseAmount', width: 15 },
      { header: 'Country', key: 'country', width: 20 },
      { header: 'Division', key: 'division', width: 15 },

      // Optional image file name column for reference
      { header: 'Image File Name', key: 'imageFileName', width: 25 }
    ];

    // Example row
    worksheet.addRow({
      camsSkuCode: 'ABC123',
      name: 'Sample SKU',
      brand: 'BrandX',
      packing: '1X10',
      priceALL: '12',
      priceFSD: '10',
      priceRetail: '11',
      vat: '5%',
      excisable: 'No',
      exciseAmount: '0',
      country: 'CountryX',
      division: 'Local',
      imageFileName: 'sample.png'
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sku_template.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error generating template:', err.message);
    res.status(500).json({ success: false, message: 'Error generating template', error: err.message });
  }
});

/**
 * ===============
 * IMPORT SKUs
 * ===============
 * Note: This is for Excel file containing SKU data only, not images.
 */
app.post('/import-skus', upload.single('file'), async (req, res) => {
  try {
    const ext = (req.file && req.file.originalname) ? req.file.originalname.split('.').pop().toLowerCase() : '';
    if (!req.file || (ext !== 'xlsx' && ext !== 'xls')) {
      return res.status(400).json({ success: false, message: 'Invalid file format. Only .xlsx or .xls allowed.' });
    }

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    // Must read from sheet named "SKUs"
    const worksheet = workbook.getWorksheet('SKUs');
    if (!worksheet) {
      return res.status(400).json({ success: false, message: 'Sheet "SKUs" is missing.' });
    }

    const headerRow = worksheet.getRow(1);
    let headerMap = {};
    headerRow.eachCell((cell, colNumber) => {
      if (cell.value) {
        let header = String(cell.value).trim().toLowerCase();
        headerMap[header] = colNumber;
      }
    });

    // Reordered mandatory columns for import
    const mandatoryColumns = [
      "cams sku code",
      "name",
      "brand",
      "packing",
      "price all",
      "price fsd",
      "price retail",
      "vat",
      "excisable",
      "excise amount",
      "country",
      "division"
    ];

    for (let col of mandatoryColumns) {
      if (!headerMap[col]) {
        return res.status(400).json({ success: false, message: `Mandatory column "${col}" is missing.` });
      }
    }

    // We'll keep "image file name" optional if present
    const imageColumn = headerMap["image file name"];
    let results = [];
    let skuCodesSet = new Set();

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      let isEmpty = true;
      for (let col of mandatoryColumns) {
        if (row.getCell(headerMap[col]).value && String(row.getCell(headerMap[col]).value).trim() !== "") {
          isEmpty = false;
          break;
        }
      }
      if (isEmpty) return;

      let rowData = {};
      let errors = [];

      // CAMS SKU CODE
      let camsSkuCode = row.getCell(headerMap["cams sku code"]).value;
      camsSkuCode = camsSkuCode ? String(camsSkuCode).trim() : "";
      if (!camsSkuCode) {
        errors.push("CAMS SKU Code is required");
      } else {
        camsSkuCode = camsSkuCode.toUpperCase();
        if (camsSkuCode.length > 20) errors.push("CAMS SKU Code exceeds 20 characters");
        if (!/^[A-Z0-9]+$/.test(camsSkuCode)) errors.push("CAMS SKU Code must be alphanumeric with no spaces");
        if (skuCodesSet.has(camsSkuCode)) {
          errors.push("Duplicate CAMS SKU Code in file");
        } else {
          skuCodesSet.add(camsSkuCode);
        }
      }
      rowData.camsSkuCode = camsSkuCode;

      // NAME
      let name = row.getCell(headerMap["name"]).value;
      name = name ? String(name).trim() : "";
      if (!name) {
        errors.push("Name is required");
      } else {
        if (/^\d+$/.test(name)) errors.push("Name cannot be only numbers");
        if (name.length > 40) errors.push("Name exceeds 40 characters");
        name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      }
      rowData.name = name;

      // BRAND
      let brand = row.getCell(headerMap["brand"]).value;
      brand = brand ? String(brand).trim() : "";
      if (!brand) {
        errors.push("Brand is required");
      } else {
        if (brand.length > 20) errors.push("Brand exceeds 20 characters");
        brand = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
      }
      rowData.brand = brand;

      // PACKING
      let packing = row.getCell(headerMap["packing"]).value;
      packing = packing ? String(packing).trim() : "";
      if (!packing) {
        errors.push("Packing is required");
      } else {
        if (packing.length > 15) errors.push("Packing exceeds 15 characters");
        packing = packing.toUpperCase();
        if (!packing.includes("X")) errors.push("Packing must contain 'X'");
      }
      rowData.packing = packing;

      // Price validator
      function validatePrice(val, label) {
        let v = val ? String(val).trim() : "";
        if (!v) {
          errors.push(`${label} is required`);
        } else {
          if (!/^\d{1,8}(\.\d{1,3})?$/.test(v)) {
            errors.push(`${label} must be a valid number with up to 8 digits and 3 decimals`);
          }
        }
        return v;
      }
      rowData.priceALL = validatePrice(row.getCell(headerMap["price all"]).value, "Price ALL");
      rowData.priceFSD = validatePrice(row.getCell(headerMap["price fsd"]).value, "Price FSD");
      rowData.priceRetail = validatePrice(row.getCell(headerMap["price retail"]).value, "Price Retail");

      // VAT
      let vat = row.getCell(headerMap["vat"]).value;
      vat = vat ? String(vat).trim() : "";
      if (!vat) {
        errors.push("VAT is required");
      } else {
        let vatLower = vat.toLowerCase();
        if (vatLower !== "5%" && vatLower !== "0%") {
          errors.push("VAT must be either '5%' or '0%'");
        } else {
          vat = vatLower === "5%" ? "5%" : "0%";
        }
      }
      rowData.vat = vat;

      // EXCISABLE
      let excisable = row.getCell(headerMap["excisable"]).value;
      excisable = excisable ? String(excisable).trim() : "";
      if (!excisable) {
        errors.push("Excisable is required");
      } else {
        let excisableLower = excisable.toLowerCase();
        if (excisableLower !== "yes" && excisableLower !== "no") {
          errors.push("Excisable must be 'Yes' or 'No'");
        } else {
          excisable = excisableLower === "yes" ? "Yes" : "No";
        }
      }
      rowData.excisable = excisable;

      // EXCISE AMOUNT
      let exciseAmount = row.getCell(headerMap["excise amount"]).value;
      exciseAmount = exciseAmount ? String(exciseAmount).trim() : "";
      if (excisable === "Yes") {
        if (!exciseAmount) {
          errors.push("Excise Amount is required when Excisable is 'Yes'");
        } else {
          if (!/^\d+(\.\d{1,3})?$/.test(exciseAmount) || parseFloat(exciseAmount) === 0) {
            errors.push("Excise Amount must be a valid number greater than 0");
          }
        }
      }
      rowData.exciseAmount = exciseAmount;

      // COUNTRY
      let country = row.getCell(headerMap["country"]).value;
      country = country ? String(country).trim() : "";
      if (!country) {
        errors.push("Country is required");
      } else {
        if (!/^[A-Za-z\s]+$/.test(country)) errors.push("Country must contain only alphabetic characters and spaces");
        country = country.charAt(0).toUpperCase() + country.slice(1).toLowerCase();
        if (country.length > 20) errors.push("Country exceeds 20 characters");
      }
      rowData.country = country;

      // DIVISION
      let division = row.getCell(headerMap["division"]).value;
      division = division ? String(division).trim() : "";
      if (!division) {
        errors.push("Division is required");
      } else {
        let divLower = division.toLowerCase();
        if (!["local","packing","frozen","imports"].includes(divLower)) {
          errors.push("Division must be one of: Local, Packing, Frozen, Imports");
        } else {
          division = division.charAt(0).toUpperCase() + division.slice(1).toLowerCase();
        }
      }
      rowData.division = division;

      // IMAGE FILE NAME (optional)
      let imageFileName = "";
      if (imageColumn) {
        imageFileName = row.getCell(imageColumn).value;
        imageFileName = imageFileName ? String(imageFileName).trim() : "";
        if (imageFileName) {
          // Basic .png check
          if (!/^[A-Za-z0-9._-]+\.(png|PNG)$/.test(imageFileName)) {
            errors.push("Image File Name must end with .png and contain valid characters");
          }
        }
      }
      rowData.file = imageFileName;

      const status = errors.length > 0 ? errors.join(" | ") : "Approved";
      results.push({ rowNumber, rowData, errors, status });
    });

    // Check for duplicates in DB
    let approvedRows = results.filter(r => r.errors.length === 0);
    if (approvedRows.length > 0) {
      const codes = approvedRows.map(item => item.rowData.camsSkuCode);
      const existingSkus = await SKU.find({ camsSkuCode: { $in: codes } });
      if (existingSkus.length > 0) {
        results.forEach(item => {
          if (
            item.errors.length === 0 &&
            existingSkus.some(e => e.camsSkuCode === item.rowData.camsSkuCode)
          ) {
            item.errors.push("Duplicate SKU Code exists in database");
            item.status = item.errors.join(" | ");
          }
        });
      }
    }

    const total = results.length;
    const approvedCount = results.filter(r => r.errors.length === 0).length;
    const errorCount = total - approvedCount;
    const anyError = errorCount > 0;

    // 1) If confirm is undefined => Just return a preview
    if (req.query.confirm === undefined) {
      return res.json({
        success: true,
        preview: true,
        message: 'Import preview generated',
        errorCount,
        approvedCount,
        total
      });
    }

    // 2) If confirm is 'true' => import the approved ones, generate error file if any errors
    if (req.query.confirm === "true") {
      let importedCount = 0;
      for (let result of results) {
        if (result.errors.length === 0) {
          const data = result.rowData;
          const newSku = new SKU({
            camsSkuCode: data.camsSkuCode,
            name: data.name,
            brand: data.brand,
            packing: data.packing,
            priceALL: data.priceALL,
            priceFSD: data.priceFSD,
            priceRetail: data.priceRetail,
            vat: data.vat,
            excisable: data.excisable,
            exciseAmount: data.exciseAmount,
            country: data.country,
            division: data.division,
            // image is not uploaded in this flow
            image: undefined,
            lastModifiedDate: Date.now()
          });
          await newSku.save();
          importedCount++;
        }
      }

      if (anyError) {
        // produce error file
        const errorWorkbook = new ExcelJS.Workbook();
        const errorWorksheet = errorWorkbook.addWorksheet('SKUs');

        const headers = [...mandatoryColumns.map(x => x.toUpperCase())];
        if (imageColumn) {
          headers.push("IMAGE FILE NAME");
        }
        headers.push("STATUS");
        errorWorksheet.addRow(headers);

        results.forEach(result => {
          const rowValues = [];
          const keyMap = {
            "cams sku code": "camsSkuCode",
            "name": "name",
            "brand": "brand",
            "packing": "packing",
            "price all": "priceALL",
            "price fsd": "priceFSD",
            "price retail": "priceRetail",
            "vat": "vat",
            "excisable": "excisable",
            "excise amount": "exciseAmount",
            "country": "country",
            "division": "division"
          };
          for (let col of mandatoryColumns) {
            rowValues.push(result.rowData[keyMap[col]] || "");
          }
          if (imageColumn) {
            rowValues.push(result.rowData.file || "");
          }
          rowValues.push(result.status);

          const newRow = errorWorksheet.addRow(rowValues);
          if (result.errors.length > 0) {
            newRow.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFCCCC' }
              };
            });
          }
        });

        // Return as excel file
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sku_import_errors.xlsx');
        await errorWorkbook.xlsx.write(res);
        return res.end();
      } else {
        return res.json({
          success: true,
          message: `Imported ${importedCount} SKUs successfully.`,
          errorCount: 0,
          approvedCount: importedCount,
          total
        });
      }
    }

    // 3) If confirm is 'false' => do not import any, but generate error file if needed
    if (req.query.confirm === "false") {
      if (anyError) {
        // Generate error workbook
        const errorWorkbook = new ExcelJS.Workbook();
        const errorWorksheet = errorWorkbook.addWorksheet('SKUs');

        const headers = [...mandatoryColumns.map(x => x.toUpperCase())];
        if (imageColumn) {
          headers.push("IMAGE FILE NAME");
        }
        headers.push("STATUS");
        errorWorksheet.addRow(headers);

        results.forEach(result => {
          const rowValues = [];
          const keyMap = {
            "cams sku code": "camsSkuCode",
            "name": "name",
            "brand": "brand",
            "packing": "packing",
            "price all": "priceALL",
            "price fsd": "priceFSD",
            "price retail": "priceRetail",
            "vat": "vat",
            "excisable": "excisable",
            "excise amount": "exciseAmount",
            "country": "country",
            "division": "division"
          };
          for (let col of mandatoryColumns) {
            rowValues.push(result.rowData[keyMap[col]] || "");
          }
          if (imageColumn) {
            rowValues.push(result.rowData.file || "");
          }
          rowValues.push(result.status);

          const newRow = errorWorksheet.addRow(rowValues);
          if (result.errors.length > 0) {
            newRow.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFCCCC' }
              };
            });
          }
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sku_import_errors.xlsx');
        await errorWorkbook.xlsx.write(res);
        return res.end();
      } else {
        // No errors => user canceled
        return res.json({
          success: true,
          message: 'Import canceled. No SKUs imported.',
          errorCount: 0,
          approvedCount: 0,
          total
        });
      }
    }

  } catch (err) {
    console.error('Error importing SKUs:', err.message);
    return res.status(500).json({ success: false, message: 'Import failed due to system error', error: err.message });
  }
});

/*******************************************************
 * NEW ROUTE: /export-skus-limited
 * Exports only the relevant price columns
 *   - If ?priceList=FSD => includes only priceFSD
 *   - If ?priceList=RETAIL => includes only priceRetail
 *   - If ?priceList=ALL => includes all three columns
 *******************************************************/

app.get('/export-skus-limited', async (req, res) => {
  try {
    const ExcelJS = require('exceljs');

    // Gather IDs
    let filter = {};
    if (req.query.ids) {
      const ids = req.query.ids.split(",");
      filter = { _id: { $in: ids } };
    }

    // Price List parameter
    const priceList = (req.query.priceList || 'ALL').toUpperCase();

    // Find matching SKUs
    const skus = await SKU.find(filter);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('SKUs_Limited');

    // Common columns
    let baseColumns = [
      { header: 'CAMS SKU CODE', key: 'camsSkuCode', width: 20 },
      { header: 'Name',          key: 'name',        width: 40 },
      { header: 'Brand',         key: 'brand',       width: 20 },
      { header: 'Packing',       key: 'packing',     width: 15 },
    ];

    // Dynamically add price columns
    let priceColumns = [];
    if (priceList === 'FSD') {
      priceColumns.push({ header: 'PRICE FSD', key: 'priceFSD', width: 12 });
    } else if (priceList === 'RETAIL') {
      priceColumns.push({ header: 'PRICE RETAIL', key: 'priceRetail', width: 12 });
    } else {
      // ALL
      priceColumns.push({ header: 'PRICE ALL',    key: 'priceALL',    width: 12 });
      priceColumns.push({ header: 'PRICE FSD',    key: 'priceFSD',    width: 12 });
      priceColumns.push({ header: 'PRICE RETAIL', key: 'priceRetail', width: 12 });
    }

    // Other columns
    let otherColumns = [
      { header: 'VAT',           key: 'vat',            width: 10 },
      { header: 'Excisable',     key: 'excisable',      width: 10 },
      { header: 'Excise Amount', key: 'exciseAmount',   width: 15 },
      { header: 'Country',       key: 'country',        width: 20 },
      { header: 'Division',      key: 'division',       width: 15 },
      { header: 'Last Modified', key: 'lastModifiedDate', width: 20 },
      { header: 'Image',         key: 'imageColumn',    width: 20 },
    ];

    worksheet.columns = [...baseColumns, ...priceColumns, ...otherColumns];

    // Fill rows
    skus.forEach((sku, idx) => {
      const rowIndex = idx + 2; // 1-based row indexing, row 1 is header
      let rowData = {
        camsSkuCode:      sku.camsSkuCode,
        name:             sku.name,
        brand:            sku.brand,
        packing:          sku.packing,
        vat:              sku.vat,
        excisable:        sku.excisable,
        exciseAmount:     sku.exciseAmount,
        country:          sku.country,
        division:         sku.division,
        lastModifiedDate: sku.lastModifiedDate,
        imageColumn:      sku.image && sku.image.length > 0 ? 'Yes' : 'No',
      };

      // Insert only relevant price(s)
      if (priceList === 'FSD') {
        rowData.priceFSD = sku.priceFSD || '';
      } else if (priceList === 'RETAIL') {
        rowData.priceRetail = sku.priceRetail || '';
      } else {
        // ALL
        rowData.priceALL    = sku.priceALL || '';
        rowData.priceFSD    = sku.priceFSD || '';
        rowData.priceRetail = sku.priceRetail || '';
      }

      worksheet.addRow(rowData);

      // If there's an image, embed it
      if (sku.image && sku.image.length > 0) {
        const imageId = workbook.addImage({
          buffer: sku.image,
          extension: 'png'
        });
        // Place the image
        worksheet.addImage(imageId, {
          tl: { col: worksheet.columns.length - 1 + 0.2, row: rowIndex - 0.8 },
          ext: { width: 80, height: 80 },
        });
        // Increase row height to fit
        worksheet.getRow(rowIndex).height = 80;
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=skus_limited.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error exporting SKUs (limited):', err.message);
    res.status(500).json({
      success: false,
      message: 'Error exporting SKUs with limited prices',
      error: err.message,
    });
  }
});

/**
 * NEW ROUTE: /delete-skus-bulk
 * This deletes multiple SKUs based on an array of IDs.
 * We do not alter existing DELETE routes.
 */
app.post('/delete-skus-bulk', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of SKU IDs to delete.'
      });
    }
    // Perform bulk delete
    const result = await SKU.deleteMany({ _id: { $in: ids } });
    return res.json({
      success: true,
      message: `${result.deletedCount} SKU(s) deleted successfully.`
    });
  } catch (err) {
    console.error('Error deleting multiple SKUs:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Error deleting multiple SKUs',
      error: err.message
    });
  }
});


// Test endpoint
app.get('/', (req, res) => {
  res.send('Server is up and running');
});

app.listen(5000, () => console.log('Server running on http://localhost:5000'));
