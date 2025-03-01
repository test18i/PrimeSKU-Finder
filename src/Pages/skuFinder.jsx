import './skuFinder.css';
import { useNavigate } from 'react-router-dom';
import {
  FaSearch,
  FaCog,
  FaSignOutAlt,
  FaSortUp,
  FaSortDown
} from 'react-icons/fa';
import { useEffect, useRef, useState } from 'react';

export default function SkuFinder() {
  const navigate = useNavigate();

  // Basic fade-in
  const [fadeIn, setFadeIn] = useState(false);

  // Live search states
  const [searchQuery, setSearchQuery] = useState('');
  const [division, setDivision] = useState('all');

  // Replaced single checkbox with a dropdown for VAT
  const [vatFilter, setVatFilter] = useState('ALL');

  // "excise only" instead of "promo only"
  const [exciseOnly, setExciseOnly] = useState(false);

  // SKUs
  const [skus, setSkus] = useState([]);
  const [loading, setLoading] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState('Sku Name');
  const [sortDirection, setSortDirection] = useState('asc'); // "asc" or "desc"

  // Price-list access from localStorage
  const storedAccess = localStorage.getItem('priceListAccess') || 'ALL';
  const priceListAccess = storedAccess.toUpperCase(); // "FSD", "RETAIL", or "ALL"

  // Role from localStorage
  const userRole = localStorage.getItem('userRole') || 'user';
  const isAdmin = userRole.toLowerCase() === 'admin';

  // Multi-selection
  const [selectedSkus, setSelectedSkus] = useState([]);

  // Progress modal for export
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');
  const [progressCount, setProgressCount] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

  // Server error / info
  const [serverError, setServerError] = useState('');
  const [infoModal, setInfoModal] = useState('');

  // Debounce reference
  const searchTimeoutRef = useRef(null);

  // For image modal
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState('');
  const [imageZoomed, setImageZoomed] = useState(false);

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });

  useEffect(() => {
    setFadeIn(true);
  }, []);

  /**
   * Fetch SKUs from server
   */
  const fetchSkus = async () => {
    try {
      setLoading(true);

      let url = 'http://localhost:5000/skus';
      const params = new URLSearchParams();

      if (searchQuery.trim() !== '') {
        params.append('search', searchQuery);
      }
      if (division !== 'all') {
        params.append('division', division);
      }
      // We'll filter VAT & excisable locally

      if (params.toString() !== '') {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch SKUs');
      }
      const data = await response.json();
      setSkus(data);
    } catch (error) {
      console.error('Error fetching SKUs:', error);
      setServerError('Error fetching SKUs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * LIVE SEARCH: fetch after short debounce whenever searchQuery or division changes.
   */
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchSkus();
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line
  }, [searchQuery, division]);

  /**
   * Global left-click to unselect if user is NOT clicking inside the search items or context menu.
   */
  const handleGlobalClick = (e) => {
    // If the click target is outside .sf-search-item (the SKU cards) and also not inside the .sf-context-menu, unselect
    if (!e.target.closest('.sf-search-item') && !e.target.closest('.sf-context-menu')) {
      setSelectedSkus([]);
      closeContextMenu();
    }
  };

  /**
   * Right-click handler to open context menu if we have selection
   */
  const handleContextMenu = (e) => {
    e.preventDefault();
    // If no selected SKUs, do nothing
    if (selectedSkus.length === 0) {
      closeContextMenu();
      return;
    }
    setContextMenu({
      visible: true,
      x: e.pageX,
      y: e.pageY
    });
  };

  /**
   * Close the custom context menu
   */
  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  /**
   * Sorting logic
   */
  const sortKeyMap = {
    'Sku Name': 'name',
    'Brand Name': 'brand',
    'Price': 'computedPrice',
    'Packing': 'packing'
  };

  const getRelevantPrice = (sku) => {
    if (priceListAccess === 'FSD') {
      return sku.priceFSD || '';
    } else if (priceListAccess === 'RETAIL') {
      return sku.priceRetail || '';
    } else {
      // ALL
      return sku.priceALL || '';
    }
  };

  /**
   * Final displayed array: apply local filters (vatFilter, exciseOnly), then sort
   */
  const displayedSkus = [...skus]
    // Filter by VAT
    .filter((sku) => {
      if (vatFilter === 'ALL') return true;
      return sku.vat === vatFilter;
    })
    // Filter by excise
    .filter((sku) => {
      if (!exciseOnly) return true;
      return (sku.excisable || '').toLowerCase() === 'yes';
    })
    // Prepare a "computedPrice" for sorting
    .map((sku) => ({
      ...sku,
      computedPrice: getRelevantPrice(sku)
    }))
    // Sort
    .sort((a, b) => {
      const key = sortKeyMap[sortBy] || 'name';
      if (key === 'computedPrice') {
        const aVal = Number(a.computedPrice || 0);
        const bVal = Number(b.computedPrice || 0);
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      } else {
        const aVal = a[key] || '';
        const bVal = b[key] || '';
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
    });

  const handleSortChange = (newSort) => {
    if (newSort !== sortBy) {
      setSortBy(newSort);
      setSortDirection('asc');
    } else {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDivision('all');
    setVatFilter('ALL');
    setExciseOnly(false);
    setSortBy('Sku Name');
    setSortDirection('asc');
  };

  /**
   * Selection
   */
  const toggleSelection = (skuId) => {
    if (selectedSkus.includes(skuId)) {
      setSelectedSkus(selectedSkus.filter((id) => id !== skuId));
    } else {
      setSelectedSkus([...selectedSkus, skuId]);
    }
  };

  /**
   * Export selected SKUs in Excel using the new route
   */
  const handleExportSelected = async () => {
    closeContextMenu(); // close the menu
    if (selectedSkus.length === 0) return;

    try {
      setShowProgressModal(true);
      setProgressLabel('Exporting selected SKUs...');
      setProgressCount(0);
      setProgressTotal(1);

      const ids = selectedSkus.join(',');
      // Use the new route that excludes any irrelevant prices:
      const url = `http://localhost:5000/export-skus-limited?ids=${ids}&priceList=${priceListAccess}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Export failed');
      setProgressCount(1);

      const blob = await response.blob();
      const saved = await downloadWithSavePicker(blob, 'selected_skus.xlsx');
      if (saved) {
        setInfoModal(`${selectedSkus.length} record(s) exported successfully.`);
      } else {
        setInfoModal('File export was canceled by the user.');
      }
    } catch (err) {
      setServerError('Error exporting selected SKUs: ' + err.message);
    } finally {
      setShowProgressModal(false);
      setSelectedSkus([]); // clear selection
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
          return false; // user canceled
        }
        throw err;
      }
    }
    // fallback
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  };

  /**
   * Render price based on user access
   */
  const renderPriceCell = (sku) => {
    if (priceListAccess === 'FSD') {
      return (
        <div className="sf-price-lists-container">
          <div className="sf-price-list-field sf-view-mode">
            FSD: {sku.priceFSD || '0'}
          </div>
        </div>
      );
    } else if (priceListAccess === 'RETAIL') {
      return (
        <div className="sf-price-lists-container">
          <div className="sf-price-list-field sf-view-mode">
            Retail: {sku.priceRetail || '0'}
          </div>
        </div>
      );
    } else {
      // ALL
      return (
        <div className="sf-price-lists-container">
          <div className="sf-price-list-field sf-view-mode">
            ALL: {sku.priceALL || '0'}
          </div>
          <div className="sf-price-list-field sf-view-mode">
            FSD: {sku.priceFSD || '0'}
          </div>
          <div className="sf-price-list-field sf-view-mode">
            Retail: {sku.priceRetail || '0'}
          </div>
        </div>
      );
    }
  };

  /**
   * Image Modal
   */
  const handleImageClick = (sku, e) => {
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

  return (
    <div
      className="sku-finder-container"
      onClick={handleGlobalClick}
      onContextMenu={handleContextMenu}
    >
      {/* Top Header */}
      <div className={`sf-top-header-div ${fadeIn ? 'sf-fade-in' : ''}`}>
        <h1 className="sf-mainmenu-heading">PrimeSKU Finder</h1>
        <nav className="sf-navbar">
          <ul className="sf-nav-list">
            {isAdmin && (
              <li className="sf-nav-item" onClick={() => navigate('/ManageSKU')}>
                <FaCog className="sf-nav-icon" />
                <span>Prime Configurations</span>
              </li>
            )}
            <li className="sf-nav-item" onClick={() => navigate('/')}>
              <FaSignOutAlt className="sf-nav-icon" />
              <span>Log Off</span>
            </li>
          </ul>
        </nav>
      </div>

      {/* Search and Filter Section */}
      <div className="sf-search-section">
        <div className="sf-search-bar-wrapper">
          <FaSearch className="sf-search-icon" />
          <input
            type="text"
            className="sf-search-bar"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="sf-filter-section">
          {/* Sort By */}
          <div className="sf-filter-wrapper">
            <span className="sf-filter-label">Sort By</span>
            <div className="sf-sort-controls">
              <select
                className="sf-filter-combobox"
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
              >
                <option value="Sku Name">Sku Name</option>
                <option value="Brand Name">Brand Name</option>
                <option value="Price">Price</option>
                <option value="Packing">Packing</option>
              </select>
              <button
                className="sf-sort-toggle"
                onClick={() =>
                  setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                }
              >
                {sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />}
              </button>
            </div>
          </div>

          {/* Division */}
          <div className="sf-filter-wrapper">
            <span className="sf-filter-label">Division</span>
            <select
              className="sf-filter-combobox"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
            >
              <option value="all">All</option>
              <option value="Local">Local</option>
              <option value="Packing">Packing</option>
              <option value="Frozen">Frozen</option>
              <option value="Imports">Imports</option>
            </select>
          </div>

          {/* VAT Filter */}
          <div className="sf-filter-wrapper">
            <span className="sf-filter-label">VAT</span>
            <select
              className="sf-filter-combobox"
              value={vatFilter}
              onChange={(e) => setVatFilter(e.target.value)}
            >
              <option value="ALL">ALL</option>
              <option value="5%">5%</option>
              <option value="0%">0%</option>
            </select>
          </div>

          {/* Excise Only checkbox + Clear All */}
          <div className="sf-filter-checkboxes">
            <label className="sf-label-text">
              <input
                type="checkbox"
                checked={exciseOnly}
                onChange={(e) => setExciseOnly(e.target.checked)}
              />{' '}
              Excise Only
            </label>
            <span className="sf-clear-text" onClick={clearFilters}>
              Clear All
            </span>
          </div>

          {/* Items found */}
          <div className="sf-items-found">
            {displayedSkus.length} items found
          </div>
        </div>
      </div>

      {/* Loading Spinner */}
      {loading && <div className="sf-loading-spinner"></div>}

      {/* SKU Results */}
      <div className="sf-search-results-grid">
        {displayedSkus.map((sku) => {
          const uniqueId = sku._id ? sku._id.toString() : sku.id;
          const isSelected = selectedSkus.includes(uniqueId);

          return (
            <div
              key={uniqueId}
              className={`sf-search-item sf-loaded ${
                isSelected ? 'sf-selected-card' : ''
              }`}
              onClick={() => toggleSelection(uniqueId)}
            >
              {/* Last Modified */}
              {sku.lastModifiedDate && (
                <p className="sf-item-LastmodifiedDate">
                  {new Date(sku.lastModifiedDate).toLocaleString()}
                </p>
              )}

              <div className="sf-item-title">
                {sku.name}
                <p className="sf-item-pack">
                  {sku.packing} - {sku.brand}
                </p>
              </div>

              {/* Image */}
              <div
                className="sf-sku-image-preview"
                onClick={(e) => handleImageClick(sku, e)}
              >
                {sku.imageBase64 ? (
                  <img
                    className="sf-SKUimage"
                    src={`data:image/png;base64,${sku.imageBase64}`}
                    alt="sku"
                  />
                ) : (
                  <img
                    className="sf-SKUimage"
                    src="https://placehold.co/120x120?text=No+Image"
                    alt="no sku"
                  />
                )}
              </div>

              <table className="sf-sku-table">
                <thead>
                  <tr>
                    <th>Attribute</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>CAMS SKU Code</td>
                    <td>{sku.camsSkuCode}</td>
                  </tr>
                  <tr>
                    <td>Price</td>
                    <td>{renderPriceCell(sku)}</td>
                  </tr>
                  <tr>
                    <td>VAT</td>
                    <td>{sku.vat}</td>
                  </tr>
                  <tr>
                    <td>Excisable</td>
                    <td>{sku.excisable}</td>
                  </tr>
                  <tr>
                    <td>Excise Amount</td>
                    <td>{sku.exciseAmount}</td>
                  </tr>
                  <tr>
                    <td>Country</td>
                    <td>{sku.country}</td>
                  </tr>
                  <tr>
                    <td>Division</td>
                    <td>{sku.division}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}

        {!loading && displayedSkus.length === 0 && (
          <p className="sf-no-skus-message">
            No SKUs found. Try adjusting search or filters.
          </p>
        )}
      </div>

      {/* Bottom Fixed Div */}
      <div className="sf-mainmenu-bottom">
        <p className="sf-bottom-madeby">Made by - Ahmed Jafar Sadiq 2025</p>
      </div>

      {/* Custom Right-Click Context Menu */}
      {contextMenu.visible && (
        <div
          className="sf-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="sf-context-menu-item" onClick={handleExportSelected}>
            Export Selected
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {showImageModal && (
        <div
          className="sf-image-modal-overlay"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="sf-image-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageModalUrl}
              alt="Preview"
              onDoubleClick={toggleImageZoom}
              className={`sf-modal-image ${
                imageZoomed ? 'sf-modal-image-zoomed' : 'sf-modal-image-normal'
              }`}
            />
            <button
              className="sf-close-modal-button"
              onClick={() => setShowImageModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && (
        <div className="sf-progress-modal-overlay">
          <div className="sf-progress-modal-content">
            <h2>{progressLabel}</h2>
            <div className="sf-progress-bar-container">
              <div
                className="sf-progress-bar-fill"
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
      )}

      {/* Info Modal */}
      {infoModal && (
        <div className="sf-info-modal-overlay">
          <div className="sf-info-modal-content">
            <h2>Notification</h2>
            <p>{infoModal}</p>
            <button
              className="sf-close-modal-button"
              onClick={() => setInfoModal('')}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Server Error Modal */}
      {serverError && (
        <div className="sf-error-modal-overlay">
          <div className="sf-error-modal-content">
            <h2>Error</h2>
            <p>{serverError}</p>
            <button
              className="sf-close-modal-button"
              onClick={() => setServerError('')}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
