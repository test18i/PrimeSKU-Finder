import React, { useState, useEffect, useRef } from 'react';
import {
  FaSearch,
  FaSignOutAlt,
  FaPlus,
  FaTrash,
  FaEdit,
  FaCheck,
  FaClock,
  FaImage,
  FaTimesCircle,
  FaExchangeAlt,
  FaExclamationCircle,
  FaDownload,
  FaUpload,
  FaFileExport,
  FaInfoCircle,
  FaUsers,
  FaGlobe,
  FaUtensils,
  FaShoppingCart
} from 'react-icons/fa';
import './managesku.css';
import { useNavigate } from 'react-router-dom';

const PLACEHOLDER_IMAGE = 'https://placehold.co/120x120?text=No+Image';

export default function ManageSKU() {
  const navigate = useNavigate();
  const [fadeIn, setFadeIn] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [skuData, setSkuData] = useState([]);
  const [displayedSkus, setDisplayedSkus] = useState([]);

  const [isEditing, setIsEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [fileError, setFileError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  // Info modal
  const [infoModal, setInfoModal] = useState('');
  const [infoTableData, setInfoTableData] = useState(null);

  const [showImageModal, setShowImageModal] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState('');
  const [imageZoomed, setImageZoomed] = useState(false);

  const [skuToDelete, setSkuToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [allSkusLoaded, setAllSkusLoaded] = useState(false);

  const [showImportConfirmationModal, setShowImportConfirmationModal] =
    useState(false);
  const [importPreviewDetails, setImportPreviewDetails] = useState(null);
  const [importFile, setImportFile] = useState(null);

  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressCount, setProgressCount] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');

  // Custom modal for "Delete All"
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  // For selection logic
  const [selectedSkus, setSelectedSkus] = useState([]);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });

  // NEW: multi-delete confirmation
  const [showDeleteMultipleModal, setShowDeleteMultipleModal] = useState(false);

  const editingRef = useRef(null);
  const fileInputRef = useRef(null);
  const importFileInputRef = useRef(null);

  // Track whether the user has manually changed FSD or Retail
  const [fsdDirty, setFsdDirty] = useState(false);
  const [retailDirty, setRetailDirty] = useState(false);

  useEffect(() => {
    setFadeIn(true);
  }, []);

  // Lock scroll if any modal is open
  useEffect(() => {
    const isModalOpen =
      showImportExportModal ||
      importLoading ||
      exportLoading ||
      infoModal !== '' ||
      showImageModal ||
      showDeleteModal ||
      showImportConfirmationModal ||
      serverError !== '' ||
      showProgressModal ||
      showDeleteAllModal ||
      showDeleteMultipleModal; // multi-delete modal too

    if (isModalOpen) {
      document.body.classList.add('ms-modal-open');
      document.documentElement.classList.add('ms-modal-open');
    } else {
      document.body.classList.remove('ms-modal-open');
      document.documentElement.classList.remove('ms-modal-open');
    }
  }, [
    showImportExportModal,
    importLoading,
    exportLoading,
    infoModal,
    showImageModal,
    showDeleteModal,
    showImportConfirmationModal,
    serverError,
    showProgressModal,
    showDeleteAllModal,
    showDeleteMultipleModal
  ]);

  // Cancel editing if click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        isEditing !== null &&
        editingRef.current &&
        !editingRef.current.contains(e.target)
      ) {
        handleCancel();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing]);

  // Clear selection if click outside .ms-search-item, or hide context menu
  useEffect(() => {
    function handleGlobalClick(e) {
      if (selectedSkus.length > 0) {
        const card = e.target.closest('.ms-search-item');
        if (!card) {
          // clicked outside
          clearSelection();
        }
      }
      if (contextMenu.visible) {
        setContextMenu({ ...contextMenu, visible: false });
      }
    }
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [selectedSkus, contextMenu]);

  // Position the context menu
  useEffect(() => {
    if (contextMenu.visible) {
      const menu = document.getElementById('ms-sku-context-menu');
      if (menu) {
        menu.style.top = contextMenu.y + 'px';
        menu.style.left = contextMenu.x + 'px';
      }
    }
  }, [contextMenu]);

  // Fetch SKUs from server
  const handleSearch = async (query, pressedEnter) => {
    if (isAdding) {
      // remove unsaved new SKU
      setSkuData((prev) => prev.filter((sku) => sku.id !== editData.id));
      setDisplayedSkus((prev) => prev.filter((sku) => sku.id !== editData.id));
      setIsAdding(false);
      setIsEditing(null);
      setEditData({});
      setErrors({});
    }
    try {
      let url = 'http://localhost:5000/skus';
      if (query.trim()) {
        url += `?search=${encodeURIComponent(query)}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      setSkuData(data);
      setDisplayedSkus(data);

      setIsEditing(null);
      setAllSkusLoaded(!query.trim() && data.length === 0);
    } catch (error) {
      setServerError('Error fetching SKUs from server.');
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    handleSearch(e.target.value, false);
  };
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch(searchQuery, true);
  };

  // Add new blank SKU
  const handleAddSKU = () => {
    const newSKUId = Date.now();
    const newSKU = {
      id: newSKUId,
      camsSkuCode: '',
      name: '',
      brand: '',
      packing: '',
      priceALL: '',
      priceFSD: '',
      priceRetail: '',
      vat: '5%',
      excisable: 'No',
      exciseAmount: '0',
      country: '',
      division: '',
      file: null,
      imageBase64: ''
    };
    setSkuData((prev) => [...prev, newSKU]);
    setDisplayedSkus((prev) => [...prev, newSKU]);

    setIsEditing(newSKUId);
    setEditData(newSKU);
    setIsAdding(true);
    setErrors({});

    setTimeout(() => {
      const el = document.getElementById(`ms-sku-card-${newSKUId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  };

  // Selection logic
  const toggleSelection = (uniqueId) => {
    if (isEditing) return; // ignore while editing
    if (selectedSkus.includes(uniqueId)) {
      setSelectedSkus(selectedSkus.filter((id) => id !== uniqueId));
    } else {
      setSelectedSkus([...selectedSkus, uniqueId]);
    }
  };
  const clearSelection = () => {
    setSelectedSkus([]);
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  // Right-click context menu
  const handleContextMenu = (e) => {
    if (selectedSkus.length > 0) {
      e.preventDefault();
      setContextMenu({ visible: true, x: e.pageX, y: e.pageY });
    }
  };

  // Ask confirmation for multi-delete
  const handleContextDeleteSelected = () => {
    setShowDeleteMultipleModal(true);
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  // Confirm multi-delete
  const confirmDeleteMultiple = async () => {
    setShowDeleteMultipleModal(false);
    try {
      setProgressLabel('Deleting selected SKUs...');
      setProgressCount(0);
      setProgressTotal(1);
      setShowProgressModal(true);

      // Attempt new route
      const ids = [];
      selectedSkus.forEach((id) => {
        // Find the actual item in skuData
        const found = skuData.find(
          (s) => (s._id && s._id.toString() === id) || s.id === parseInt(id, 10)
        );
        if (found && found._id) {
          ids.push(found._id.toString());
        }
      });
      if (ids.length === 0) {
        throw new Error('No valid IDs found for server delete.');
      }

      const response = await fetch('http://localhost:5000/delete-skus-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      setProgressCount(1);

      const result = await response.json();
      if (!result.success) {
        setServerError('Error deleting multiple SKUs: ' + (result.message || ''));
      } else {
        setInfoModal(result.message || 'Multiple SKUs deleted successfully.');
        setInfoTableData(null);
        handleSearch(searchQuery, false);
      }
    } catch (err) {
      setServerError('Error (bulk) deleting SKUs: ' + err.message);
    } finally {
      setShowProgressModal(false);
      clearSelection();
    }
  };

  const cancelDeleteMultiple = () => {
    setShowDeleteMultipleModal(false);
  };

  // Context menu - Export
  const handleContextExport = async () => {
    setProgressLabel('Exporting selected SKUs...');
    setProgressCount(0);
    setProgressTotal(1);
    setShowProgressModal(true);

    try {
      const ids = selectedSkus.join(',');
      const response = await fetch(
        `http://localhost:5000/export-skus?ids=${ids}`
      );
      if (!response.ok) throw new Error('Export failed');
      setProgressCount(1);
      const blob = await response.blob();
      const saved = await downloadWithSavePicker(blob, 'selected_skus.xlsx');
      if (saved) {
        setInfoModal(`${selectedSkus.length} record(s) exported successfully.`);
        setInfoTableData(null);
      } else {
        setInfoModal(
          `${selectedSkus.length} record(s) exported, but download canceled.`
        );
        setInfoTableData(null);
      }
    } catch (err) {
      setServerError('Error exporting selected SKUs: ' + err.message);
    } finally {
      setShowProgressModal(false);
      setContextMenu({ visible: false, x: 0, y: 0 });
      clearSelection();
    }
  };

  // Edit a single card
  const handleEdit = (uniqueId) => {
    if (isAdding && editData.id !== uniqueId) {
      setSkuData((prev) => prev.filter((sku) => sku.id !== editData.id));
      setDisplayedSkus((prev) => prev.filter((sku) => sku.id !== editData.id));
      setIsAdding(false);
      setIsEditing(null);
      setEditData({});
      setErrors({});
    }
    const itemToEdit = skuData.find((sku) =>
      sku._id ? sku._id.toString() === uniqueId : sku.id === uniqueId
    );
    if (!itemToEdit) return;
    setIsEditing(uniqueId);
    setEditData(itemToEdit);
    setErrors({});
  };

  // Input changes
  const handleInputChange = (e, field) => {
    let value = e.target.value;
    // Basic validations
    if (field === 'name') {
      if (value.length > 40) value = value.slice(0, 40);
    } else if (['camsSkuCode', 'brand', 'country'].includes(field)) {
      if (value.length > 20) value = value.slice(0, 20);
    }

    if (field === 'camsSkuCode') {
      value = value.toUpperCase();
    } else if (['brand', 'country', 'name'].includes(field)) {
      if (value.length > 0) {
        value = value.charAt(0).toUpperCase() + value.slice(1);
      }
      if (field === 'country') {
        // remove non-alpha except spaces
        value = value.replace(/[^a-zA-Z\s]/g, '');
        if (value.length > 0) {
          value = value.charAt(0).toUpperCase() + value.slice(1);
        }
      }
    } else if (
      field === 'priceALL' ||
      field === 'priceFSD' ||
      field === 'priceRetail' ||
      field === 'exciseAmount'
    ) {
      const regex = /^\d{0,8}(\.\d{0,3})?$/;
      if (!regex.test(value) && value !== '') return;
    } else if (field === 'packing') {
      value = value.toUpperCase();
      if (value.length > 15) value = value.slice(0, 15);
    }

    let newEditData = { ...editData, [field]: value };
    // Sync logic for FSD/Retail unless user changed them
    if (field === 'priceALL') {
      if (!fsdDirty || editData.priceFSD === editData.priceALL) {
        newEditData.priceFSD = value;
      }
      if (!retailDirty || editData.priceRetail === editData.priceALL) {
        newEditData.priceRetail = value;
      }
    }
    if (field === 'priceFSD') {
      setFsdDirty(true);
    }
    if (field === 'priceRetail') {
      setRetailDirty(true);
    }

    setEditData(newEditData);
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // File change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'image/png') {
        setFileError('Only PNG files are allowed.');
      } else if (file.size > 500 * 1024) {
        setFileError('File size must be less than 500 KB.');
      } else {
        setFileError('');
        const reader = new FileReader();
        reader.onload = () => {
          setEditData((prev) => ({
            ...prev,
            file,
            imageBase64: reader.result.replace(/^data:.+;base64,/, '')
          }));
        };
        reader.readAsDataURL(file);
      }
    } else {
      setEditData((prev) => ({ ...prev, file: null, imageBase64: '' }));
    }
  };

  // Remove image
  const handleRemoveImage = async () => {
    if (editData._id) {
      // PUT request with removeImage=true
      const formData = new FormData();
      formData.append('camsSkuCode', editData.camsSkuCode);
      formData.append('name', editData.name);
      formData.append('brand', editData.brand);
      formData.append('packing', editData.packing);
      formData.append('priceALL', editData.priceALL);
      formData.append('priceFSD', editData.priceFSD);
      formData.append('priceRetail', editData.priceRetail);
      formData.append('vat', editData.vat);
      formData.append('excisable', editData.excisable);
      formData.append('exciseAmount', editData.exciseAmount);
      formData.append('country', editData.country);
      formData.append('division', editData.division);
      formData.append('removeImage', 'true');
      formData.append('lastModifiedDate', new Date().toISOString());

      try {
        const response = await fetch(
          `http://localhost:5000/skus/${editData._id}`,
          {
            method: 'PUT',
            body: formData
          }
        );
        const result = await response.json();
        if (result.success) {
          setEditData((prev) => ({ ...prev, file: null, imageBase64: '' }));
        } else {
          setServerError('Failed to remove image: ' + (result.message || ''));
        }
      } catch (error) {
        setServerError('Error removing image: ' + error.message);
      }
    } else {
      setEditData((prev) => ({ ...prev, file: null, imageBase64: '' }));
    }
  };

  const handleCancel = () => {
    if (isAdding) {
      setSkuData((prev) => prev.filter((sku) => sku.id !== editData.id));
      setDisplayedSkus((prev) => prev.filter((sku) => sku.id !== editData.id));
    }
    setIsEditing(null);
    setEditData({});
    setIsAdding(false);
    setErrors({});
    setFsdDirty(false);
    setRetailDirty(false);
    setFileError('');
  };

  // Validate fields
  const validateFields = () => {
    const newErrors = {};
    if (!editData.camsSkuCode)
      newErrors.camsSkuCode = 'CAMS SKU CODE is required.';
    if (!editData.name) newErrors.name = 'Name is required.';
    else if (/^\d+$/.test(editData.name))
      newErrors.name = 'Name cannot be only a number.';
    if (!editData.brand) newErrors.brand = 'Brand is required.';
    if (!editData.packing) newErrors.packing = 'Packing is required.';
    else if (!editData.packing.includes('X'))
      newErrors.packing = "Packing must contain 'X'.";

    if (!editData.priceALL) newErrors.priceALL = 'Price List ALL is required.';
    if (!editData.priceFSD) newErrors.priceFSD = 'Price List FSD is required.';
    if (!editData.priceRetail)
      newErrors.priceRetail = 'Price List Retail is required.';

    if (!editData.excisable) newErrors.excisable = 'Please choose Yes or No.';
    if (editData.excisable === 'Yes') {
      if (!editData.exciseAmount || editData.exciseAmount === '0') {
        newErrors.exciseAmount = 'Enter valid Excise Amount.';
      }
    }
    if (!editData.country) newErrors.country = 'Country is required.';
    if (!editData.division) newErrors.division = 'Please select a division.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save new or updated SKU
  const handleSave = async () => {
    if (fileError) return;
    if (!validateFields()) return;

    const formData = new FormData();
    formData.append('camsSkuCode', editData.camsSkuCode);
    formData.append('name', editData.name);
    formData.append('brand', editData.brand);
    formData.append('packing', editData.packing);

    formData.append('priceALL', editData.priceALL);
    formData.append('priceFSD', editData.priceFSD);
    formData.append('priceRetail', editData.priceRetail);

    formData.append('vat', editData.vat);
    formData.append('excisable', editData.excisable);
    formData.append(
      'exciseAmount',
      editData.excisable === 'Yes' ? editData.exciseAmount : '0'
    );
    formData.append('country', editData.country);
    formData.append('division', editData.division);

    if (editData.file) {
      formData.append('file', editData.file);
    }
    formData.append('lastModifiedDate', new Date().toISOString());

    try {
      let verb = 'saved';
      if (editData._id) {
        // update
        const response = await fetch(
          `http://localhost:5000/skus/${editData._id}`,
          {
            method: 'PUT',
            body: formData
          }
        );
        const result = await response.json();
        if (!result.success) {
          setServerError('Failed to update SKU: ' + (result.message || ''));
          return;
        }
        verb = 'updated';
      } else {
        // new
        const response = await fetch('http://localhost:5000/add-sku', {
          method: 'POST',
          body: formData
        });
        const result = await response.json();
        if (!result.success) {
          setServerError('Failed to add SKU: ' + (result.message || ''));
          return;
        }
      }
      setInfoModal(`1 record ${verb} successfully.`);
      setInfoTableData(null);
      setIsEditing(null);
      setEditData({});
      setIsAdding(false);
      setErrors({});
      setFsdDirty(false);
      setRetailDirty(false);

      handleSearch(searchQuery, false);
    } catch (error) {
      setServerError('Error saving SKU: ' + error.message);
    }
  };

  const downloadWithSavePicker = async (blob, defaultFileName) => {
    if (window.showSaveFilePicker) {
      const opts = {
        suggestedName: defaultFileName,
        types: [
          {
            description: 'Excel File',
            accept: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
                '.xlsx'
              ]
            }
          }
        ]
      };
      try {
        const handle = await window.showSaveFilePicker(opts);
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      } catch (err) {
        if (err.name === 'AbortError') {
          return false;
        }
      }
    }
    // Fallback
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  };

  const handleExport = async () => {
    setProgressLabel('Exporting SKUs...');
    setProgressCount(0);
    setProgressTotal(1);
    setShowProgressModal(true);

    try {
      const response = await fetch('http://localhost:5000/export-skus');
      if (!response.ok) throw new Error('Export failed');
      setProgressCount(1);
      const blob = await response.blob();
      const saved = await downloadWithSavePicker(blob, 'skus.xlsx');
      if (saved) {
        setInfoModal('All SKUs exported successfully.');
      } else {
        setInfoModal('File download canceled by user.');
      }
      setInfoTableData(null);
    } catch (err) {
      setServerError('Error exporting SKUs: ' + err.message);
    } finally {
      setShowProgressModal(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('http://localhost:5000/template-skus');
      if (!response.ok) throw new Error('Template download failed');
      const blob = await response.blob();
      const saved = await downloadWithSavePicker(blob, 'sku_template.xlsx');
      if (saved) {
        setInfoModal('Template downloaded successfully.');
      } else {
        setInfoModal('Template download canceled by user.');
      }
      setInfoTableData(null);
    } catch (err) {
      setServerError('Error downloading template: ' + err.message);
    }
  };

  // Import file
  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportLoading(true);
    setImportFile(file);

    setProgressLabel('Uploading Excel file...');
    setProgressCount(0);
    setProgressTotal(1);
    setShowProgressModal(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('http://localhost:5000/import-skus', {
        method: 'POST',
        body: formData
      });
      setProgressCount(1);

      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        if (result.preview) {
          setImportPreviewDetails({
            errorCount: result.errorCount,
            approvedCount: result.approvedCount,
            total: result.total
          });
          setShowImportConfirmationModal(true);
        } else {
          if (!result.success) {
            setServerError('Import failed: ' + (result.message || ''));
          } else {
            if (result.message && /Imported\s0\sSKUs/.test(result.message)) {
              setInfoModal('No SKUs uploaded.');
            } else {
              setInfoModal(result.message);
            }
            setInfoTableData(null);
            handleSearch('', true);
          }
        }
      } else if (
        contentType &&
        contentType.includes(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
      ) {
        // The server returned an Excel error file
        const blob = await response.blob();
        const saved = await downloadWithSavePicker(blob, 'sku_import_errors.xlsx');
        if (!saved) {
          setInfoModal('Import partial errors, file download canceled by user.');
        } else {
          setInfoModal('Error file downloaded.');
        }
        setInfoTableData(null);
        handleSearch('', true);
      }
    } catch (err) {
      setServerError('Error importing SKUs: ' + err.message);
    } finally {
      setShowProgressModal(false);
      setImportLoading(false);
      if (importFileInputRef.current) {
        importFileInputRef.current.value = '';
      }
    }
  };

  const handleImportConfirm = async (confirmOption) => {
    if (!importFile) return;
    setImportLoading(true);

    setProgressLabel('Processing Excel import...');
    setProgressCount(0);
    setProgressTotal(1);
    setShowProgressModal(true);

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const response = await fetch(
        `http://localhost:5000/import-skus?confirm=${confirmOption}`,
        {
          method: 'POST',
          body: formData
        }
      );
      setProgressCount(1);
      const contentType = response.headers.get('Content-Type');
      if (
        contentType &&
        contentType.includes(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
      ) {
        // error file
        const blob = await response.blob();
        const saved = await downloadWithSavePicker(blob, 'sku_import_errors.xlsx');
        if (!saved) {
          if (confirmOption === 'true') {
            if (importPreviewDetails && importPreviewDetails.approvedCount > 0) {
              setInfoModal(
                `${importPreviewDetails.approvedCount} record(s) imported, error download canceled.`
              );
            } else {
              setInfoModal('Partial import done, error download canceled.');
            }
          } else {
            setInfoModal('Import canceled, error file download canceled.');
          }
        } else {
          if (confirmOption === 'true') {
            setInfoModal('Partial import done, error file downloaded.');
          } else {
            setInfoModal('No SKUs imported, error file downloaded.');
          }
        }
        setInfoTableData(null);
        handleSearch('', true);
      } else {
        const result = await response.json();
        if (result.success) {
          setInfoModal(result.message || 'Import completed.');
          setInfoTableData(null);
          handleSearch('', true);
        } else {
          setServerError('Import failed: ' + (result.message || ''));
        }
      }
    } catch (err) {
      setServerError('Error confirming import: ' + err.message);
    } finally {
      setShowProgressModal(false);
      setImportLoading(false);
      setShowImportConfirmationModal(false);
      setImportPreviewDetails(null);
      setImportFile(null);
      if (importFileInputRef.current) {
        importFileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAllModal = () => {
    setShowDeleteAllModal(true);
  };

  const handleDeleteAll = async () => {
    setShowDeleteAllModal(false);

    setProgressLabel('Deleting all SKUs...');
    setProgressCount(0);
    setProgressTotal(1);
    setShowProgressModal(true);

    try {
      const response = await fetch('http://localhost:5000/skus?deleteAll=true', {
        method: 'DELETE'
      });
      setProgressCount(1);
      const result = await response.json();
      if (!result.success) {
        setServerError('Error deleting all SKUs: ' + (result.message || ''));
      } else {
        setInfoModal('All SKUs deleted successfully.');
        setInfoTableData(null);
        handleSearch('', true);
      }
    } catch (err) {
      setServerError('Error deleting all SKUs: ' + err.message);
    } finally {
      setShowProgressModal(false);
    }
  };

  const handleCancelDeleteAll = () => {
    setShowDeleteAllModal(false);
  };

  // Single Delete
  const confirmDelete = async () => {
    if (!skuToDelete) return;
    setShowDeleteModal(false);

    setProgressLabel('Deleting selected SKU...');
    setProgressCount(0);
    setProgressTotal(1);
    setShowProgressModal(true);

    try {
      const skuId = skuToDelete._id
        ? skuToDelete._id.toString()
        : skuToDelete.id;
      const response = await fetch(`http://localhost:5000/skus/${skuId}`, {
        method: 'DELETE'
      });
      setProgressCount(1);
      const result = await response.json();
      if (!result.success) {
        setServerError('Error deleting SKU: ' + (result.message || ''));
      } else {
        setInfoModal('1 record deleted successfully.');
        setInfoTableData(null);
        handleSearch(searchQuery, false);
      }
    } catch (err) {
      setServerError('Error deleting SKU: ' + err.message);
    } finally {
      setShowProgressModal(false);
      setSkuToDelete(null);
    }
  };

  const handleImageClick = (e, sku) => {
    e.stopPropagation();
    if (sku.imageBase64) {
      setImageModalUrl(`data:image/png;base64,${sku.imageBase64}`);
      setShowImageModal(true);
      setImageZoomed(false);
    }
  };

  const toggleImageZoom = () => {
    setImageZoomed((prev) => !prev);
  };

  const renderNoSkusMessage = () => {
    if (skuData.length === 0) {
      if (allSkusLoaded) {
        return (
          <p className="ms-no-skus-message">
            No SKUs in database, please click on the add SKU button to add new
            SKUs.
          </p>
        );
      } else {
        return (
          <p className="ms-no-skus-message">
            Please enter search criteria to display SKUs.
          </p>
        );
      }
    }
    return null;
  };

  return (
    <div
      className="manage-sku-container"
      onContextMenu={handleContextMenu}
    >
      {/* Top Header */}
      <div className={`ms-top-header-div ${fadeIn ? 'ms-fade-in' : ''}`}>
        <h1 className="ms-mainmenu-heading">SKU Masters</h1>
        <nav className="ms-navbar">
          <ul className="ms-nav-list">
            <li className="ms-nav-item" onClick={() => navigate("/skuFinder")}>
              <FaSearch className="ms-nav-icon"  />
              <span>Search</span>
            </li>
            <li
              className="ms-nav-item"
              onClick={() => setShowImportExportModal(true)}
            >
              <FaExchangeAlt className="ms-nav-icon" />
              <span>Import/Export SKUs</span>
            </li>
            <li className="ms-nav-item" onClick={() => navigate('/users')}>
              <FaUsers className="ms-nav-icon" />
              <span>Users</span>
            </li>
            <li className="ms-nav-item" onClick={() => navigate('/')}>
              <FaSignOutAlt className="ms-nav-icon" />
              <span>Log Off</span>
            </li>
          </ul>
        </nav>
      </div>

      {/* Search Section */}
      <div className="ms-search-section">
        <div className="ms-search-bar-wrapper">
          <FaSearch className="ms-search-icon" />
          <input
            type="text"
            className="ms-search-bar"
            placeholder="Search SKU"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
          />
          <button
            className="ms-search-button"
            onClick={() => handleSearch(searchQuery, true)}
          >
            Search
          </button>
        </div>
        <div className="ms-items-found">{skuData.length} items found</div>
      </div>

      {/* Add New SKU Button */}
      {!isAdding && (
        <div className="ms-add-sku-button-container">
          <button className="ms-add-sku-button" onClick={handleAddSKU}>
            <FaPlus className="ms-add-icon" />
          </button>
        </div>
      )}

      {/* Grid of SKUs */}
      <div className="ms-search-results-grid">
        {displayedSkus.length > 0 ? (
          displayedSkus.map((sku, index) => {
            if (!sku || typeof sku !== 'object') return null;
            const uniqueId = sku._id
              ? sku._id.toString()
              : sku.id || String(index);
            const isCurrentlyEditing = isEditing === uniqueId;
            const isNewSKU = !sku._id;
            const isSelected = selectedSkus.includes(uniqueId);

            return (
              <div
                id={`ms-sku-card-${uniqueId}`}
                key={uniqueId}
                ref={isCurrentlyEditing ? editingRef : null}
                className={
                  'ms-search-item ms-loaded ' +
                  (isNewSKU ? 'ms-new-sku-card ' : '') +
                  (isSelected ? 'ms-selected-card ' : '')
                }
                onClick={() => toggleSelection(uniqueId)}
              >
                {/* Last Modified */}
                {sku.lastModifiedDate && (
                  <div className="ms-modified-time-row">
                    <FaClock className="ms-clock-icon" />
                    <span className="ms-mod-time-text">
                      {new Date(sku.lastModifiedDate).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Instead of a fully vertical table, we add a thead to match SkuFinder structure */}
                <table className="ms-sku-table">
                  <thead>
                    <tr>
                      <th>Attribute</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>CAMS SKU CODE</td>
                      <td>
                        {isCurrentlyEditing ? (
                          <>
                            <input
                              className={`ms-edit-input ${
                                errors.camsSkuCode ? 'ms-highlight' : ''
                              }`}
                              value={editData.camsSkuCode || ''}
                              onChange={(e) => handleInputChange(e, 'camsSkuCode')}
                            />
                            {errors.camsSkuCode && (
                              <FaExclamationCircle
                                className="ms-error-icon"
                                title={errors.camsSkuCode}
                              />
                            )}
                          </>
                        ) : (
                          sku.camsSkuCode
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Name</td>
                      <td>
                        {isCurrentlyEditing ? (
                          <>
                            <input
                              className={`ms-edit-input ${
                                errors.name ? 'ms-highlight' : ''
                              }`}
                              value={editData.name || ''}
                              onChange={(e) => handleInputChange(e, 'name')}
                            />
                            {errors.name && (
                              <FaExclamationCircle
                                className="ms-error-icon"
                                title={errors.name}
                              />
                            )}
                          </>
                        ) : (
                          sku.name
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Brand</td>
                      <td>
                        {isCurrentlyEditing ? (
                          <>
                            <input
                              className={`ms-edit-input ${
                                errors.brand ? 'ms-highlight' : ''
                              }`}
                              value={editData.brand || ''}
                              onChange={(e) => handleInputChange(e, 'brand')}
                            />
                            {errors.brand && (
                              <FaExclamationCircle
                                className="ms-error-icon"
                                title={errors.brand}
                              />
                            )}
                          </>
                        ) : (
                          sku.brand
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Packing</td>
                      <td>
                        {isCurrentlyEditing ? (
                          <>
                            <input
                              className={`ms-edit-input ${
                                errors.packing ? 'ms-highlight' : ''
                              }`}
                              value={editData.packing || ''}
                              onChange={(e) => handleInputChange(e, 'packing')}
                            />
                            {errors.packing && (
                              <FaExclamationCircle
                                className="ms-error-icon"
                                title={errors.packing}
                              />
                            )}
                          </>
                        ) : (
                          sku.packing
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Price Lists</strong>
                      </td>
                      <td>
                        {isCurrentlyEditing ? (
                          <div className="ms-price-lists-container">
                            <div className="ms-price-list-field ms-center-price">
                              <label className="ms-price-label">
                                <FaGlobe /> ALL
                              </label>
                              <input
                                className={`ms-edit-input ms-yellow-price ${
                                  errors.priceALL ? 'ms-highlight' : ''
                                }`}
                                type="text"
                                value={editData.priceALL || ''}
                                onChange={(e) => handleInputChange(e, 'priceALL')}
                              />
                              {errors.priceALL && (
                                <FaExclamationCircle
                                  className="ms-error-icon"
                                  title={errors.priceALL}
                                />
                              )}
                            </div>
                            <div className="ms-price-list-field ms-center-price">
                              <label className="ms-price-label">
                                <FaUtensils /> FSD
                              </label>
                              <input
                                className={`ms-edit-input ms-yellow-price ${
                                  errors.priceFSD ? 'ms-highlight' : ''
                                }`}
                                type="text"
                                value={editData.priceFSD || ''}
                                onChange={(e) => handleInputChange(e, 'priceFSD')}
                              />
                              {errors.priceFSD && (
                                <FaExclamationCircle
                                  className="ms-error-icon"
                                  title={errors.priceFSD}
                                />
                              )}
                            </div>
                            <div className="ms-price-list-field ms-center-price">
                              <label className="ms-price-label">
                                <FaShoppingCart /> Retail
                              </label>
                              <input
                                className={`ms-edit-input ms-yellow-price ${
                                  errors.priceRetail ? 'ms-highlight' : ''
                                }`}
                                type="text"
                                value={editData.priceRetail || ''}
                                onChange={(e) =>
                                  handleInputChange(e, 'priceRetail')
                                }
                              />
                              {errors.priceRetail && (
                                <FaExclamationCircle
                                  className="ms-error-icon"
                                  title={errors.priceRetail}
                                />
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="ms-price-lists-container ms-view-mode">
                            <div className="ms-price-list-field ms-center-price">
                              <FaGlobe /> {sku.priceALL}
                            </div>
                            <div className="ms-price-list-field ms-center-price">
                              <FaUtensils /> {sku.priceFSD}
                            </div>
                            <div className="ms-price-list-field ms-center-price">
                              <FaShoppingCart /> {sku.priceRetail}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>VAT</td>
                      <td>
                        {isCurrentlyEditing ? (
                          <select
                            className="ms-custom-select ms-edit-input"
                            value={editData.vat || ''}
                            onChange={(e) => handleInputChange(e, 'vat')}
                          >
                            <option value="5%">5%</option>
                            <option value="0%">0%</option>
                          </select>
                        ) : (
                          sku.vat
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Excisable</td>
                      <td>
                        {isCurrentlyEditing ? (
                          <>
                            <select
                              className={`ms-custom-select ms-edit-input ${
                                errors.excisable ? 'ms-highlight' : ''
                              }`}
                              value={editData.excisable || ''}
                              onChange={(e) => handleInputChange(e, 'excisable')}
                            >
                              <option value="No">No</option>
                              <option value="Yes">Yes</option>
                            </select>
                            {errors.excisable && (
                              <FaExclamationCircle
                                className="ms-error-icon"
                                title={errors.excisable}
                              />
                            )}
                          </>
                        ) : sku.excisable === 'Yes' && sku.exciseAmount ? (
                          `${sku.excisable} - ${sku.exciseAmount} OMR`
                        ) : (
                          sku.excisable
                        )}
                      </td>
                    </tr>
                    {isCurrentlyEditing && editData.excisable === 'Yes' && (
                      <tr>
                        <td>Excise Amount</td>
                        <td>
                          <input
                            className={`ms-edit-input ms-no-arrows ${
                              errors.exciseAmount ? 'ms-highlight' : ''
                            }`}
                            type="text"
                            value={editData.exciseAmount || ''}
                            onChange={(e) => handleInputChange(e, 'exciseAmount')}
                          />
                          {errors.exciseAmount && (
                            <FaExclamationCircle
                              className="ms-error-icon"
                              title={errors.exciseAmount}
                            />
                          )}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td>Country</td>
                      <td>
                        {isCurrentlyEditing ? (
                          <>
                            <input
                              className={`ms-edit-input ${
                                errors.country ? 'ms-highlight' : ''
                              }`}
                              value={editData.country || ''}
                              onChange={(e) => handleInputChange(e, 'country')}
                            />
                            {errors.country && (
                              <FaExclamationCircle
                                className="ms-error-icon"
                                title={errors.country}
                              />
                            )}
                          </>
                        ) : (
                          sku.country
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Division</td>
                      <td>
                        {isCurrentlyEditing ? (
                          <>
                            <select
                              className={`ms-custom-select ms-edit-input ${
                                errors.division ? 'ms-highlight' : ''
                              }`}
                              value={editData.division || ''}
                              onChange={(e) => handleInputChange(e, 'division')}
                            >
                              <option value="">Select Division</option>
                              <option value="Local">🏠 Local</option>
                              <option value="Packing">📦 Packing</option>
                              <option value="Frozen">❄️ Frozen</option>
                              <option value="Imports">🚢 Imports</option>
                            </select>
                            {errors.division && (
                              <FaExclamationCircle
                                className="ms-error-icon"
                                title={errors.division}
                              />
                            )}
                          </>
                        ) : sku.division === 'Local' ? (
                          '🏠 Local'
                        ) : sku.division === 'Packing' ? (
                          '📦 Packing'
                        ) : sku.division === 'Frozen' ? (
                          '❄️ Frozen'
                        ) : sku.division === 'Imports' ? (
                          '🚢 Imports'
                        ) : (
                          sku.division || 'N/A'
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>SKU Image</td>
                      <td>
                        {isCurrentlyEditing ? (
                          <>
                            <input
                              type="file"
                              accept="image/png"
                              onChange={handleFileChange}
                              ref={fileInputRef}
                              className="ms-hidden-file-input"
                            />
                            <div className="ms-sku-image-icons-container">
                              {editData.imageBase64 ? (
                                <>
                                  <span
                                    className="ms-icon-button ms-icon-selected"
                                    onClick={() =>
                                      fileInputRef.current &&
                                      fileInputRef.current.click()
                                    }
                                    title={
                                      editData.file
                                        ? editData.file.name
                                        : 'Change Image'
                                    }
                                  >
                                    <FaImage size={24} />
                                  </span>
                                  <span
                                    className="ms-icon-button ms-delete-x-button"
                                    onClick={handleRemoveImage}
                                    title="Remove Image"
                                  >
                                    <FaTimesCircle size={24} />
                                  </span>
                                </>
                              ) : (
                                <span
                                  className="ms-icon-button"
                                  onClick={() =>
                                    fileInputRef.current &&
                                    fileInputRef.current.click()
                                  }
                                  title="Choose Image"
                                >
                                  <FaImage size={24} />
                                </span>
                              )}
                            </div>
                            {fileError && (
                              <div className="ms-file-error-message">
                                {fileError}
                              </div>
                            )}
                          </>
                        ) : sku.imageBase64 ? (
                          <div
                            className="ms-sku-image-preview"
                            onClick={(e) => handleImageClick(e, sku)}
                          >
                            <img
                              src={`data:image/png;base64,${sku.imageBase64}`}
                              alt="SKU"
                              className="ms-sku-image"
                            />
                          </div>
                        ) : (
                          <div className="ms-sku-image-preview">
                            <img
                              src={PLACEHOLDER_IMAGE}
                              alt="No file"
                              className="ms-sku-image"
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {isCurrentlyEditing && (
                  <div className="ms-add-sku-save-row">
                    <button className="ms-new-sku-save-button" onClick={handleSave}>
                      Save SKU
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          renderNoSkusMessage()
        )}
      </div>

      {/* Context menu */}
      {contextMenu.visible && (
        <div id="ms-sku-context-menu" className="ms-custom-context-menu">
          {selectedSkus.length === 1 && (
            <button
              className="ms-context-menu-button"
              onClick={() => handleEdit(selectedSkus[0])}
            >
              <FaEdit /> Edit
            </button>
          )}
          <button className="ms-context-menu-button" onClick={handleContextExport}>
            <FaFileExport /> Export Selected
          </button>
          <button
            className="ms-context-menu-button"
            onClick={handleContextDeleteSelected}
          >
            <FaTrash /> Delete Selected
          </button>
        </div>
      )}

      {/* Delete single SKU Modal */}
      {showDeleteModal && skuToDelete && (
        <div className="ms-modal-overlay">
          <div className="ms-modal-content">
            <h2>Confirm Deletion</h2>
            <div className="ms-modal-content-body">
              <p>
                Are you sure you want to delete this SKU?
                <br />
                <strong>CAMS:</strong> {skuToDelete.camsSkuCode}
                <br />
                <strong>Name:</strong> {skuToDelete.name}
                <br />
                <strong>Brand:</strong> {skuToDelete.brand}
                <br />
                <strong>Packing:</strong> {skuToDelete.packing}
              </p>
            </div>
            <div className="ms-modal-buttons">
              <button className="ms-delete-confirm-button" onClick={confirmDelete}>
                <FaCheck className="ms-modal-button-icon" /> Yes, Delete
              </button>
              <button
                className="ms-delete-cancel-button"
                onClick={() => setShowDeleteModal(false)}
              >
                <FaTimesCircle className="ms-modal-button-icon" /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi Delete Confirmation Modal */}
      {showDeleteMultipleModal && (
        <div className="ms-modal-overlay">
          <div className="ms-modal-content">
            <h2>Confirm Delete</h2>
            <div className="ms-modal-content-body">
              <p>
                You have selected <strong>{selectedSkus.length}</strong> SKU(s).<br />
                Are you sure you want to delete them all?
              </p>
            </div>
            <div className="ms-modal-buttons">
              <button
                className="ms-delete-confirm-button"
                onClick={confirmDeleteMultiple}
              >
                <FaCheck className="ms-modal-button-icon" /> Yes, Delete
              </button>
              <button
                className="ms-delete-cancel-button"
                onClick={cancelDeleteMultiple}
              >
                <FaTimesCircle className="ms-modal-button-icon" /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import/Export Modal */}
      {showImportExportModal && (
        <div className="ms-modal-overlay">
          <div className="ms-modal-content">
            <h2>Import/Export SKUs</h2>
            <div className="ms-modal-content-body">
              <div className="ms-import-export-modal-buttons">
                <button className="ms-export-btn" onClick={handleExport}>
                  <FaFileExport className="ms-modal-button-icon" /> Export SKUs
                </button>
                <button className="ms-template-btn" onClick={handleDownloadTemplate}>
                  <FaDownload className="ms-modal-button-icon" /> Download Excel
                  Template
                </button>
                <button
                  className="ms-upload-btn"
                  onClick={() =>
                    importFileInputRef.current && importFileInputRef.current.click()
                  }
                >
                  <FaUpload className="ms-modal-button-icon" /> Upload Excel File
                </button>
                <button className="ms-delete-all-btn" onClick={handleDeleteAllModal}>
                  <FaTrash className="ms-modal-button-icon" /> Delete All SKUs
                </button>
              </div>
            </div>
            <div className="ms-modal-buttons">
              <button
                className="ms-close-modal-button"
                onClick={() => setShowImportExportModal(false)}
              >
                Close
              </button>
            </div>
            <input
              type="file"
              accept=".xlsx, .xls"
              ref={importFileInputRef}
              className="ms-hidden-file-input"
              onChange={handleImportFile}
            />
          </div>
        </div>
      )}

      {/* Delete All SKUs Modal */}
      {showDeleteAllModal && (
        <div className="ms-modal-overlay">
          <div className="ms-modal-content">
            <h2>Confirm Deletion</h2>
            <div className="ms-modal-content-body">
              <p>Are you sure you want to delete all SKUs from the database?</p>
            </div>
            <div className="ms-modal-buttons">
              <button className="ms-delete-confirm-button" onClick={handleDeleteAll}>
                <FaCheck className="ms-modal-button-icon" /> Yes, Delete All
              </button>
              <button
                className="ms-delete-cancel-button"
                onClick={handleCancelDeleteAll}
              >
                <FaTimesCircle className="ms-modal-button-icon" /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Confirmation Modal */}
      {showImportConfirmationModal && importPreviewDetails && (
        <div className="ms-modal-overlay">
          <div className="ms-modal-content">
            <h2>Import Confirmation</h2>
            <div className="ms-modal-content-body">
              <table className="ms-info-table">
                <tbody>
                  <tr>
                    <td>Total Records:</td>
                    <td>{importPreviewDetails.total}</td>
                  </tr>
                  <tr>
                    <td>Errors:</td>
                    <td>{importPreviewDetails.errorCount}</td>
                  </tr>
                  <tr>
                    <td>Approved:</td>
                    <td>{importPreviewDetails.approvedCount}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="ms-modal-buttons">
              <button
                className="ms-import-confirm-button"
                onClick={() => handleImportConfirm('true')}
                disabled={importPreviewDetails.approvedCount === 0}
              >
                Import Approved SKUs and Download Error File
              </button>
              <button
                className="ms-import-cancel-button"
                onClick={() => handleImportConfirm('false')}
              >
                Cancel Import and Download Error File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {infoModal && (
        <div className="ms-modal-overlay">
          <div className="ms-modal-content">
            <h2>
              <FaInfoCircle className="ms-modal-header-icon" /> Notification
            </h2>
            <div className="ms-modal-content-body">
              <p>{infoModal}</p>
              {infoTableData && (
                <table className="ms-notification-table">
                  <tbody>
                    {infoTableData.map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.label}</td>
                        <td>{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="ms-modal-buttons">
              <button
                className="ms-close-modal-button"
                onClick={() => {
                  setInfoModal('');
                  setInfoTableData(null);
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlays */}
      {exportLoading && (
        <div className="ms-loading-modal-overlay">
          <div className="ms-loading-modal-content">
            <p>Please wait while SKUs are being exported...</p>
          </div>
        </div>
      )}
      {importLoading && (
        <div className="ms-loading-modal-overlay">
          <div className="ms-loading-modal-content">
            <p>Please wait while SKUs are being imported...</p>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {showImageModal && (
        <div
          className="ms-modal-overlay"
          onClick={() => setShowImageModal(false)}
        >
          <div className="ms-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Preview</h2>
            <div className="ms-modal-content-body">
              <img
                src={imageModalUrl}
                alt="Preview"
                onDoubleClick={toggleImageZoom}
                className={
                  `ms-modal-image ${
                    imageZoomed ? 'ms-modal-image-zoomed' : 'ms-modal-image-normal'
                  }`
                }
              />
            </div>
            <div className="ms-modal-buttons">
              <button
                className="ms-close-modal-button"
                onClick={() => setShowImageModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && (
        <div className="ms-modal-overlay">
          <div className="ms-modal-content">
            <h2>{progressLabel}</h2>
            <div className="ms-modal-content-body">
              <div className="ms-progress-bar-container">
                <div
                  className="ms-progress-bar-fill"
                  style={{
                    width:
                      progressTotal === 0
                        ? '0%'
                        : `${Math.round((progressCount / progressTotal) * 100)}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="ms-mainmenu-bottom">
        <p className="ms-bottom-madeby">Made by - Ahmed Jafar Sadiq 2025</p>
      </div>

      {/* Server Error Modal */}
      {serverError && (
        <div className="ms-modal-overlay">
          <div className="ms-modal-content">
            <h2>Error</h2>
            <div className="ms-modal-content-body">
              <p>{serverError}</p>
            </div>
            <div className="ms-modal-buttons">
              <button
                className="ms-close-modal-button"
                onClick={() => setServerError('')}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
