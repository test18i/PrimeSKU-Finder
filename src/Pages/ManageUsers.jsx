import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaSignOutAlt,
  FaUserPlus,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimesCircle,
  FaExclamationCircle,
  FaInfoCircle,
  FaUserShield,  // for admin
  FaUser         // for regular user
} from "react-icons/fa";
import "./manageUsers.css";

export default function ManageUsers() {
  const navigate = useNavigate();
  const [fadeIn, setFadeIn] = useState(false);

  // For demonstration: the logged-in user
  const loggedInUsername = "Jafar"; // Replace with actual auth logic if needed

  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);

  // Single edit
  const [isEditing, setIsEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [errors, setErrors] = useState({});

  // Selection for multi-delete
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Context menu
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });

  // Delete modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // “Cannot delete” modal
  const [showCannotDeleteModal, setShowCannotDeleteModal] = useState(false);
  const [cannotDeleteReason, setCannotDeleteReason] = useState("");

  // Info / server error / progress
  const [infoModal, setInfoModal] = useState("");
  const [infoTableData, setInfoTableData] = useState(null);
  const [serverError, setServerError] = useState("");
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [progressCount, setProgressCount] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);

  // Track whether all users are loaded but none exist
  const [allUsersLoaded, setAllUsersLoaded] = useState(false);

  // To close editing if clicked outside
  const editingRef = useRef(null);

  useEffect(() => {
    setFadeIn(true);
    handleSearch("");
  }, []);

  // Lock scroll if a modal is open
  useEffect(() => {
    const isModalOpen =
      infoModal ||
      showDeleteModal ||
      showCannotDeleteModal ||
      showProgressModal ||
      serverError;

    if (isModalOpen) {
      document.body.classList.add("mu-modal-open");
      document.documentElement.classList.add("mu-modal-open");
    } else {
      document.body.classList.remove("mu-modal-open");
      document.documentElement.classList.remove("mu-modal-open");
    }
  }, [
    infoModal,
    showDeleteModal,
    showCannotDeleteModal,
    showProgressModal,
    serverError
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing]);

  // Clear selection if click anywhere outside user cards
  useEffect(() => {
    function handleGlobalClick(e) {
      if (selectedUsers.length > 0) {
        const card = e.target.closest(".mu-user-card");
        if (!card) {
          // clicked outside user cards
          clearSelection();
        }
      }
      if (contextMenu.visible) {
        setContextMenu({ ...contextMenu, visible: false });
      }
    }
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [selectedUsers, contextMenu]);

  // Position the context menu
  useEffect(() => {
    if (contextMenu.visible) {
      const menu = document.getElementById("mu-user-context-menu");
      if (menu) {
        menu.style.top = contextMenu.y + "px";
        menu.style.left = contextMenu.x + "px";
      }
    }
  }, [contextMenu]);

  const handleSearch = async (query) => {
    try {
      let url = "http://localhost:5000/users";
      if (query.trim() !== "") {
        url += `?search=${encodeURIComponent(query)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.users) {
        setUsers(data.users);
        setAllUsersLoaded(!query.trim() && data.users.length === 0);
      } else {
        setServerError(data.message || "Error fetching users");
      }
    } catch (err) {
      setServerError("Error fetching users: " + err.message);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    handleSearch(e.target.value);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch(searchQuery);
    }
  };

  // Selection logic
  const toggleSelection = (userId) => {
    if (isEditing) return; // ignore while editing
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };
  const clearSelection = () => {
    setSelectedUsers([]);
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  const handleContextMenu = (e) => {
    if (selectedUsers.length > 0) {
      e.preventDefault();
      setContextMenu({ visible: true, x: e.pageX, y: e.pageY });
    }
  };

  // Add user
  const handleAddUser = () => {
    if (isEditing && !editData._id) {
      // remove unsaved user
      setUsers((prev) => prev.filter((u) => u._id));
      setIsEditing(null);
      setEditData({});
      setErrors({});
    }
    const newUserId = Date.now().toString();
    const newUser = {
      _id: null, // not in DB
      tempId: newUserId,
      username: "",
      password: "",
      role: "user",
      priceListAccess: "FSD"
    };
    setUsers((prev) => [...prev, newUser]);
    setIsEditing(newUserId);
    setEditData(newUser);
    setErrors({});

    setTimeout(() => {
      const el = document.getElementById(`mu-user-card-${newUserId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 300);
  };

  // Edit
  const handleEdit = (uniqueId) => {
    if (isEditing && !editData._id && editData.tempId !== uniqueId) {
      // remove unsaved new user
      setUsers((prev) => prev.filter((u) => u.tempId !== editData.tempId));
      setIsEditing(null);
      setEditData({});
      setErrors({});
    }
    const userToEdit = users.find((u) =>
      u._id ? u._id.toString() === uniqueId : u.tempId === uniqueId
    );
    if (!userToEdit) return;
    setIsEditing(uniqueId);
    setEditData({ ...userToEdit });
    setErrors({});
  };

  const handleCancel = () => {
    // If we're adding a new user, remove it if not saved
    if (!editData._id && editData.tempId) {
      setUsers((prev) => prev.filter((u) => u.tempId !== editData.tempId));
    }
    setIsEditing(null);
    setEditData({});
    setErrors({});
  };

  const handleInputChange = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  /**
   * Validate username, password rules, etc.
   * - Username: 2–15 chars
   * - Password: max 10 chars
   *   if new user => required, >=8 chars, 1 uppercase, 1 special
   *   if existing => only check if not blank
   */
  const validateFields = () => {
    const newErrors = {};

    // Username check
    const un = editData.username.trim();
    if (un.length < 2) {
      newErrors.username = "Username must be at least 2 characters.";
    } else if (un.length > 15) {
      newErrors.username = "Username cannot exceed 15 characters.";
    }

    // Password check
    const pw = editData.password.trim();
    // limit to 10
    if (pw.length > 10) {
      newErrors.password = "Password cannot exceed 10 characters.";
    } else {
      const passwordRegex = /^(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?=.*[a-zA-Z0-9]).{8,}$/;
      if (!editData._id) {
        // new user => must have valid password
        if (!pw) {
          newErrors.password = "Password is required for new users.";
        } else if (!passwordRegex.test(pw)) {
          newErrors.password =
            "Password must have >=8 chars, <=10 chars, 1 uppercase, 1 special.";
        }
      } else {
        // existing user => only check if they typed something
        if (pw && !passwordRegex.test(pw)) {
          newErrors.password =
            "Password must have >=8 chars, <=10 chars, 1 uppercase, 1 special.";
        }
      }
    }

    // Role
    if (!editData.role) {
      newErrors.role = "Role is required.";
    }
    // PriceListAccess
    if (!editData.priceListAccess) {
      newErrors.priceListAccess = "Price List Access is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateFields()) return;
    try {
      if (!editData._id) {
        // Create new
        const res = await fetch("http://localhost:5000/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: editData.username,
            password: editData.password,
            role: editData.role,
            priceListAccess: editData.priceListAccess
          })
        });
        const data = await res.json();
        if (!data.success) {
          setServerError(data.message || "Failed to create user.");
          return;
        }
        setInfoModal("New user created successfully.");
      } else {
        // Update existing
        const res = await fetch(`http://localhost:5000/users/${editData._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: editData.username,
            password: editData.password,
            role: editData.role,
            priceListAccess: editData.priceListAccess
          })
        });
        const data = await res.json();
        if (!data.success) {
          setServerError(data.message || "Failed to update user.");
          return;
        }
        setInfoModal("User updated successfully.");
      }
      setIsEditing(null);
      setEditData({});
      setErrors({});
      handleSearch(searchQuery);
    } catch (err) {
      setServerError("Error saving user: " + err.message);
    }
  };

  // Context menu for single/multiple selection
  const handleContextEdit = () => {
    if (selectedUsers.length === 1) {
      handleEdit(selectedUsers[0]);
    }
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  const handleContextDelete = () => {
    if (selectedUsers.length > 0) {
      confirmDeleteMultiple();
    }
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  // Bulk delete
  const confirmDeleteMultiple = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedUsers.length} user(s)?`
      )
    ) {
      return;
    }
    setShowProgressModal(true);
    setProgressLabel("Deleting selected users...");
    setProgressCount(0);
    setProgressTotal(selectedUsers.length);

    let deletedCount = 0;
    for (let i = 0; i < selectedUsers.length; i++) {
      const userId = selectedUsers[i];
      const userObj = users.find((u) =>
        u._id ? u._id.toString() === userId : u.tempId === userId
      );
      if (!userObj) {
        setProgressCount(i + 1);
        continue;
      }
      // Don’t delete self
      if (userObj.username === loggedInUsername) {
        setCannotDeleteReason("You cannot delete your own account.");
        setShowCannotDeleteModal(true);
        setShowProgressModal(false);
        clearSelection();
        return;
      }
      // Don’t delete only admin
      if (userObj.role === "admin") {
        const adminsCount = users.filter((u) => u.role === "admin").length;
        if (adminsCount <= 1) {
          setCannotDeleteReason("Cannot delete the only remaining admin.");
          setShowCannotDeleteModal(true);
          setShowProgressModal(false);
          clearSelection();
          return;
        }
      }
      // Proceed
      if (userObj._id) {
        try {
          const res = await fetch(`http://localhost:5000/users/${userObj._id}`, {
            method: "DELETE"
          });
          const data = await res.json();
          if (data.success) {
            deletedCount++;
          }
        } catch (err) {
          console.error("Error deleting user:", userObj.username, err);
        }
      }
      setProgressCount(i + 1);
    }

    setShowProgressModal(false);
    setInfoModal(`${deletedCount} user(s) deleted successfully.`);
    clearSelection();
    handleSearch(searchQuery);
  };

  // Single delete
  const handleShowDeleteModal = (userObj) => {
    // Check if self
    if (userObj.username === loggedInUsername) {
      setCannotDeleteReason("You cannot delete your own account.");
      setShowCannotDeleteModal(true);
      return;
    }
    // Only admin check
    if (userObj.role === "admin") {
      const adminsCount = users.filter((u) => u.role === "admin").length;
      if (adminsCount <= 1) {
        setCannotDeleteReason("Cannot delete the only remaining admin.");
        setShowCannotDeleteModal(true);
        return;
      }
    }
    setUserToDelete(userObj);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setShowProgressModal(true);
    setProgressLabel("Deleting user...");
    setProgressCount(0);
    setProgressTotal(1);

    try {
      if (userToDelete._id) {
        const res = await fetch(`http://localhost:5000/users/${userToDelete._id}`, {
          method: "DELETE"
        });
        const data = await res.json();
        setProgressCount(1);
        if (!data.success) {
          setServerError(data.message || "Failed to delete user.");
        } else {
          setInfoModal(`User "${userToDelete.username}" deleted successfully.`);
          handleSearch(searchQuery);
        }
      }
    } catch (err) {
      setServerError("Error deleting user: " + err.message);
    } finally {
      setShowDeleteModal(false);
      setUserToDelete(null);
      setShowProgressModal(false);
    }
  };

  // Return an icon for the role, with color styling
  const renderRoleIcon = (role) => {
    if (role === "admin") {
      return <FaUserShield style={{ color: "#ff4444", fontSize: "24px" }} />;
    } else {
      return <FaUser style={{ color: "#44aaff", fontSize: "24px" }} />;
    }
  };

  const renderNoUsersMessage = () => {
    if (users.length === 0) {
      if (allUsersLoaded) {
        return (
          <p className="mu-no-users-message">
            No users in the database. Click “Add User” to add one.
          </p>
        );
      } else {
        return <p className="mu-no-users-message">No matching users found.</p>;
      }
    }
    return null;
  };

  return (
    <div className="mu-container" onContextMenu={handleContextMenu}>
      {/* Top Header */}
      <div className={`mu-top-header ${fadeIn ? "mu-fade-in" : ""}`}>
        <h1 className="mu-heading">User Access</h1>
        <nav className="mu-navbar">
          <ul className="mu-nav-list">
            <li className="mu-nav-item" onClick={() => navigate("/skuFinder")}>
              <FaSearch className="mu-nav-icon" />
              <span>Search</span>
            </li>
            <li className="mu-nav-item" onClick={() => navigate("/manageSku")}>
              <FaEdit className="mu-nav-icon" />
              <span>SKU Masters</span>
            </li>
            <li className="mu-nav-item" onClick={() => navigate("/")}>
              <FaSignOutAlt className="mu-nav-icon" />
              <span>Log Off</span>
            </li>
          </ul>
        </nav>
      </div>

      {/* Search Section */}
      <div className="mu-search-section">
        <div className="mu-search-bar-wrapper">
          <FaSearch className="mu-search-icon" />
          <input
            type="text"
            className="mu-search-bar"
            placeholder="Search user by name, role, or price list..."
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
          />
          <button className="mu-search-button" onClick={() => handleSearch(searchQuery)}>
            Search
          </button>
        </div>
        <div className="mu-items-found">{users.length} items found</div>
      </div>

      {/* Add User Floating Button */}
      {(!isEditing || editData._id) && (
        <div className="mu-add-button-container">
          <button className="mu-add-button" onClick={handleAddUser}>
            <FaUserPlus className="mu-add-icon" />
          </button>
        </div>
      )}

      {/* Users Grid */}
      <div className="mu-results-grid">
        {users.length > 0
          ? users.map((user) => {
              const uniqueId = user._id ? user._id.toString() : user.tempId;
              const isCurrentlyEditing = isEditing === uniqueId;
              const isSelected = selectedUsers.includes(uniqueId);
              const isNewUser = !user._id; // highlight unsaved user

              return (
                <div
                  key={uniqueId}
                  id={`mu-user-card-${uniqueId}`}
                  ref={isCurrentlyEditing ? editingRef : null}
                  className={
                    "mu-user-card " +
                    (isSelected ? "mu-selected-card " : "") +
                    (isNewUser ? "mu-new-user-card" : "")
                  }
                  onClick={() => toggleSelection(uniqueId)}
                >
                  {/* Instead of a big colored box or image, show an icon for role */}
                  <div className="mu-role-icon-container">
                    {renderRoleIcon(user.role)}
                  </div>

                  <table className="mu-inner-table">
                    <thead>
                      <tr>
                        <th>Attribute</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Username</td>
                        <td>
                          {isCurrentlyEditing ? (
                            <>
                              <input
                                className={`mu-edit-input ${
                                  errors.username ? "mu-highlight" : ""
                                }`}
                                value={editData.username || ""}
                                onChange={(e) =>
                                  handleInputChange("username", e.target.value)
                                }
                              />
                              {errors.username && (
                                <FaExclamationCircle
                                  className="mu-error-icon"
                                  title={errors.username}
                                />
                              )}
                            </>
                          ) : (
                            user.username
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td>Password</td>
                        <td>
                          {isCurrentlyEditing ? (
                            <>
                              <input
                                className={`mu-edit-input ${
                                  errors.password ? "mu-highlight" : ""
                                }`}
                                type="text"
                                maxLength={10} // enforce no more than 10
                                value={editData.password || ""}
                                onChange={(e) =>
                                  handleInputChange("password", e.target.value)
                                }
                              />
                              {errors.password && (
                                <FaExclamationCircle
                                  className="mu-error-icon"
                                  title={errors.password}
                                />
                              )}
                              {/* If existing user, show "Current: ***" if empty password */}
                              {editData._id && editData.password === "" && (
                                <div className="mu-current-password-info">
                                  Current Password: *** (unchanged)
                                </div>
                              )}
                            </>
                          ) : (
                            "***"
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td>Role</td>
                        <td>
                          {isCurrentlyEditing ? (
                            <>
                              <select
                                className={`mu-edit-select ${
                                  errors.role ? "mu-highlight" : ""
                                }`}
                                value={editData.role || "user"}
                                onChange={(e) =>
                                  handleInputChange("role", e.target.value)
                                }
                              >
                                <option value="admin">Admin</option>
                                <option value="user">User</option>
                              </select>
                              {errors.role && (
                                <FaExclamationCircle
                                  className="mu-error-icon"
                                  title={errors.role}
                                />
                              )}
                            </>
                          ) : (
                            user.role
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td>Price List</td>
                        <td>
                          {isCurrentlyEditing ? (
                            <>
                              <select
                                className={`mu-edit-select ${
                                  errors.priceListAccess ? "mu-highlight" : ""
                                }`}
                                value={editData.priceListAccess || "FSD"}
                                onChange={(e) =>
                                  handleInputChange(
                                    "priceListAccess",
                                    e.target.value
                                  )
                                }
                              >
                                <option value="FSD">FSD 🍽</option>
                                <option value="Retail">Retail 🛒</option>
                                <option value="ALL">All 🌐</option>
                              </select>
                              {errors.priceListAccess && (
                                <FaExclamationCircle
                                  className="mu-error-icon"
                                  title={errors.priceListAccess}
                                />
                              )}
                            </>
                          ) : (
                            user.priceListAccess
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="mu-save-row">
                    {isCurrentlyEditing && (
                      <button className="mu-save-button" onClick={handleSave}>
                        Save User
                      </button>
                    )}
                    {/* Single delete icon if not editing */}
                    {!isCurrentlyEditing && user._id && (
                      <button
                        className="mu-save-button mu-delete-user-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowDeleteModal(user);
                        }}
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          : renderNoUsersMessage()}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div id="mu-user-context-menu" className="mu-context-menu">
          {selectedUsers.length === 1 && (
            <button className="mu-context-menu-button" onClick={handleContextEdit}>
              <FaEdit /> Edit
            </button>
          )}
          <button className="mu-context-menu-button" onClick={handleContextDelete}>
            <FaTrash /> Delete Selected
          </button>
        </div>
      )}

      {/* Delete Single Modal */}
      {showDeleteModal && userToDelete && (
        <div className="mu-modal-overlay">
          <div className="mu-modal-content">
            <h2>Confirm Deletion</h2>
            <div className="mu-modal-content-body">
              <p>
                Are you sure you want to delete this user?
                <br />
                <strong>Username:</strong> {userToDelete.username}
              </p>
            </div>
            <div className="mu-modal-buttons">
              <button className="mu-delete-confirm-button" onClick={handleDeleteConfirm}>
                <FaCheck className="mu-modal-button-icon" />
                Yes, Delete
              </button>
              <button
                className="mu-delete-cancel-button"
                onClick={() => setShowDeleteModal(false)}
              >
                <FaTimesCircle className="mu-modal-button-icon" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cannot Delete Modal */}
      {showCannotDeleteModal && (
        <div className="mu-modal-overlay">
          <div className="mu-modal-content">
            <h2>Cannot Delete User</h2>
            <div className="mu-modal-content-body">
              <p>{cannotDeleteReason}</p>
            </div>
            <div className="mu-modal-buttons">
              <button
                className="mu-delete-cancel-button"
                onClick={() => {
                  setShowCannotDeleteModal(false);
                  setCannotDeleteReason("");
                }}
              >
                <FaTimesCircle className="mu-modal-button-icon" />
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {infoModal && (
        <div className="mu-modal-overlay">
          <div className="mu-modal-content">
            <h2>
              <FaInfoCircle className="mu-modal-header-icon" /> Notification
            </h2>
            <div className="mu-modal-content-body">
              <p>{infoModal}</p>
              {infoTableData && (
                <table className="mu-notification-table">
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
            <div className="mu-modal-buttons">
              <button
                className="mu-delete-cancel-button"
                onClick={() => {
                  setInfoModal("");
                  setInfoTableData(null);
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && (
        <div className="mu-modal-overlay">
          <div className="mu-modal-content">
            <h2>{progressLabel}</h2>
            <div className="mu-modal-content-body">
              <div className="mu-progress-bar-container">
                <div
                  className="mu-progress-bar-fill"
                  style={{
                    width:
                      progressTotal === 0
                        ? "0%"
                        : `${Math.round((progressCount / progressTotal) * 100)}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {serverError && (
        <div className="mu-modal-overlay">
          <div className="mu-modal-content">
            <h2>Error</h2>
            <div className="mu-modal-content-body">
              <p>{serverError}</p>
            </div>
            <div className="mu-modal-buttons">
              <button
                className="mu-delete-cancel-button"
                onClick={() => setServerError("")}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <div className="mu-bottom-bar">
        <p className="mu-bottom-madeby">Made by - Ahmed Jafar Sadiq 2025</p>
      </div>
    </div>
  );
}
