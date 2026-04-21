document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const activitiesList = document.getElementById("activities-list");
  const messageDiv = document.getElementById("message");
  const registrationModal = document.getElementById("registration-modal");
  const modalActivityName = document.getElementById("modal-activity-name");
  const signupForm = document.getElementById("signup-form");
  const activityInput = document.getElementById("activity");
  const closeRegistrationModal = document.querySelector(".close-modal");

  // Search and filter elements
  const searchInput = document.getElementById("activity-search");
  const searchButton = document.getElementById("search-button");
  const categoryFilters = document.querySelectorAll(".category-filter");
  const dayFilters = document.querySelectorAll(".day-filter");
  const timeFilters = document.querySelectorAll(".time-filter");

  // Authentication elements
  const loginButton = document.getElementById("login-button");
  const userInfo = document.getElementById("user-info");
  const displayName = document.getElementById("display-name");
  const logoutButton = document.getElementById("logout-button");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeLoginModal = document.querySelector(".close-login-modal");
  const loginMessage = document.getElementById("login-message");

  // Announcement elements
  const announcementStrip = document.getElementById("announcement-strip");
  const manageAnnouncementsButton = document.getElementById(
    "manage-announcements-button"
  );
  const announcementsModal = document.getElementById("announcements-modal");
  const closeAnnouncementsModal = document.querySelector(
    ".close-announcements-modal"
  );
  const announcementsList = document.getElementById("announcements-list");
  const announcementForm = document.getElementById("announcement-form");
  const announcementFormTitle = document.getElementById(
    "announcement-form-title"
  );
  const announcementIdInput = document.getElementById("announcement-id");
  const announcementMessageInput = document.getElementById(
    "announcement-message"
  );
  const announcementStartDateInput = document.getElementById(
    "announcement-start-date"
  );
  const announcementExpiryDateInput = document.getElementById(
    "announcement-expiry-date"
  );
  const announcementFormMessage = document.getElementById(
    "announcement-form-message"
  );
  const cancelAnnouncementEditButton = document.getElementById(
    "cancel-announcement-edit"
  );

  // Activity categories with corresponding colors
  const activityTypes = {
    sports: { label: "Sports", color: "#e8f5e9", textColor: "#2e7d32" },
    arts: { label: "Arts", color: "#fff4e6", textColor: "#c05621" },
    academic: { label: "Academic", color: "#e3f2fd", textColor: "#1565c0" },
    community: { label: "Community", color: "#fff3e0", textColor: "#e65100" },
    technology: {
      label: "Technology",
      color: "#ebf4ff",
      textColor: "#1a56db",
    },
  };

  // State
  let allActivities = {};
  let currentFilter = "all";
  let searchQuery = "";
  let currentDay = "";
  let currentTimeRange = "";
  let currentUser = null;
  let allAnnouncements = [];

  // Time range mappings for the dropdown
  const timeRanges = {
    morning: { start: "06:00", end: "08:00" },
    afternoon: { start: "15:00", end: "18:00" },
    weekend: { days: ["Saturday", "Sunday"] },
  };

  function formatDateTime(dateValue) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(dateValue));
  }

  function toLocalDateTimeInputValue(isoValue) {
    if (!isoValue) {
      return "";
    }

    const date = new Date(isoValue);
    const offsetMs = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offsetMs);
    return localDate.toISOString().slice(0, 16);
  }

  function fromLocalDateTimeInputValue(inputValue) {
    if (!inputValue) {
      return null;
    }

    return new Date(inputValue).toISOString();
  }

  function initializeFilters() {
    const activeDayFilter = document.querySelector(".day-filter.active");
    if (activeDayFilter) {
      currentDay = activeDayFilter.dataset.day;
    }

    const activeTimeFilter = document.querySelector(".time-filter.active");
    if (activeTimeFilter) {
      currentTimeRange = activeTimeFilter.dataset.time;
    }
  }

  function setDayFilter(day) {
    currentDay = day;

    dayFilters.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.day === day);
    });

    fetchActivities();
  }

  function setTimeRangeFilter(timeRange) {
    currentTimeRange = timeRange;

    timeFilters.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.time === timeRange);
    });

    fetchActivities();
  }

  function checkAuthentication() {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
        updateAuthUI();
        validateUserSession(currentUser.username);
      } catch (error) {
        console.error("Error parsing saved user", error);
        logout();
      }
    }

    updateAuthBodyClass();
  }

  async function validateUserSession(username) {
    try {
      const response = await fetch(
        `/auth/check-session?username=${encodeURIComponent(username)}`
      );

      if (!response.ok) {
        logout();
        return;
      }

      const userData = await response.json();
      currentUser = userData;
      localStorage.setItem("currentUser", JSON.stringify(userData));
      updateAuthUI();
    } catch (error) {
      console.error("Error validating session:", error);
    }
  }

  function updateAuthUI() {
    if (currentUser) {
      loginButton.classList.add("hidden");
      userInfo.classList.remove("hidden");
      displayName.textContent = currentUser.display_name;
      manageAnnouncementsButton.classList.remove("hidden");
    } else {
      loginButton.classList.remove("hidden");
      userInfo.classList.add("hidden");
      displayName.textContent = "";
      manageAnnouncementsButton.classList.add("hidden");
      closeAnnouncementsModalHandler();
      resetAnnouncementForm();
    }

    updateAuthBodyClass();
    fetchActivities();
    fetchActiveAnnouncements();
  }

  function updateAuthBodyClass() {
    if (currentUser) {
      document.body.classList.remove("not-authenticated");
    } else {
      document.body.classList.add("not-authenticated");
    }
  }

  async function login(username, password) {
    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(
          username
        )}&password=${encodeURIComponent(password)}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showLoginMessage(data.detail || "Invalid username or password", "error");
        return false;
      }

      currentUser = data;
      localStorage.setItem("currentUser", JSON.stringify(data));
      updateAuthUI();
      closeLoginModalHandler();
      showMessage(`Welcome, ${currentUser.display_name}!`, "success");
      return true;
    } catch (error) {
      console.error("Error during login:", error);
      showLoginMessage("Login failed. Please try again.", "error");
      return false;
    }
  }

  function logout() {
    currentUser = null;
    localStorage.removeItem("currentUser");
    updateAuthUI();
    showMessage("You have been logged out.", "info");
  }

  function showLoginMessage(text, type) {
    loginMessage.textContent = text;
    loginMessage.className = `message ${type}`;
    loginMessage.classList.remove("hidden");
  }

  function openLoginModal() {
    loginModal.classList.remove("hidden");
    loginModal.classList.add("show");
    loginMessage.classList.add("hidden");
    loginForm.reset();
  }

  function closeLoginModalHandler() {
    loginModal.classList.remove("show");
    setTimeout(() => {
      loginModal.classList.add("hidden");
      loginForm.reset();
    }, 300);
  }

  async function fetchActiveAnnouncements() {
    try {
      const response = await fetch("/announcements/active");
      if (!response.ok) {
        throw new Error("Failed to load announcements");
      }

      const announcements = await response.json();
      renderAnnouncementStrip(announcements);
    } catch (error) {
      console.error("Error fetching active announcements:", error);
      announcementStrip.classList.add("hidden");
    }
  }

  function renderAnnouncementStrip(announcements) {
    if (!announcements || announcements.length === 0) {
      announcementStrip.classList.add("hidden");
      announcementStrip.innerHTML = "";
      return;
    }

    const itemsMarkup = announcements
      .map(
        (announcement) => `
          <div class="announcement-item">
            <span class="announcement-icon" aria-hidden="true">📣</span>
            <div class="announcement-content">
              <p>${announcement.message}</p>
              <small>Expires ${formatDateTime(announcement.expires_at)}</small>
            </div>
          </div>
        `
      )
      .join("");

    announcementStrip.innerHTML = `<div class="announcement-track">${itemsMarkup}</div>`;
    announcementStrip.classList.remove("hidden");
  }

  async function fetchAllAnnouncements() {
    if (!currentUser) {
      return;
    }

    try {
      const response = await fetch(
        `/announcements?teacher_username=${encodeURIComponent(currentUser.username)}`
      );
      const payload = await response.json();

      if (!response.ok) {
        showAnnouncementFormMessage(
          payload.detail || "Failed to load announcements",
          "error"
        );
        return;
      }

      allAnnouncements = payload;
      renderAnnouncementsList();
    } catch (error) {
      console.error("Error fetching announcements:", error);
      showAnnouncementFormMessage("Failed to load announcements.", "error");
    }
  }

  function announcementStatus(announcement) {
    const now = new Date();
    const startsAt = announcement.starts_at ? new Date(announcement.starts_at) : null;
    const expiresAt = new Date(announcement.expires_at);

    if (expiresAt < now) {
      return { label: "Expired", className: "expired" };
    }

    if (startsAt && startsAt > now) {
      return { label: "Scheduled", className: "scheduled" };
    }

    return { label: "Active", className: "active" };
  }

  function renderAnnouncementsList() {
    if (!allAnnouncements.length) {
      announcementsList.innerHTML = `
        <div class="empty-announcements">
          <p>No announcements yet. Create one from the form.</p>
        </div>
      `;
      return;
    }

    announcementsList.innerHTML = allAnnouncements
      .map((announcement) => {
        const status = announcementStatus(announcement);

        return `
          <article class="announcement-card">
            <div class="announcement-card-header">
              <span class="announcement-status ${status.className}">${status.label}</span>
              <span class="announcement-meta">Updated ${formatDateTime(
                announcement.updated_at
              )}</span>
            </div>
            <p class="announcement-message">${announcement.message}</p>
            <div class="announcement-dates">
              <span>Start: ${
                announcement.starts_at ? formatDateTime(announcement.starts_at) : "Immediate"
              }</span>
              <span>Expires: ${formatDateTime(announcement.expires_at)}</span>
            </div>
            <div class="announcement-card-actions">
              <button class="edit-announcement-btn" data-announcement-id="${announcement.id}">Edit</button>
              <button class="delete-announcement-btn" data-announcement-id="${announcement.id}">Delete</button>
            </div>
          </article>
        `;
      })
      .join("");

    announcementsList
      .querySelectorAll(".edit-announcement-btn")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.dataset.announcementId;
          const announcement = allAnnouncements.find((item) => item.id === id);
          if (announcement) {
            fillAnnouncementFormForEdit(announcement);
          }
        });
      });

    announcementsList
      .querySelectorAll(".delete-announcement-btn")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.dataset.announcementId;
          const announcement = allAnnouncements.find((item) => item.id === id);
          if (!announcement) {
            return;
          }

          showConfirmationDialog(
            `Delete this announcement?\n\n"${announcement.message}"`,
            async () => {
              await deleteAnnouncement(id);
            }
          );
        });
      });
  }

  function openAnnouncementsModal() {
    if (!currentUser) {
      showMessage("Sign in to manage announcements.", "error");
      return;
    }

    announcementsModal.classList.remove("hidden");
    announcementsModal.classList.add("show");
    announcementsModal.setAttribute("aria-hidden", "false");
    fetchAllAnnouncements();
  }

  function closeAnnouncementsModalHandler() {
    announcementsModal.classList.remove("show");
    announcementsModal.setAttribute("aria-hidden", "true");
    setTimeout(() => {
      announcementsModal.classList.add("hidden");
    }, 300);
  }

  function showAnnouncementFormMessage(text, type) {
    announcementFormMessage.textContent = text;
    announcementFormMessage.className = `message ${type}`;
    announcementFormMessage.classList.remove("hidden");
  }

  function clearAnnouncementFormMessage() {
    announcementFormMessage.classList.add("hidden");
  }

  function resetAnnouncementForm() {
    announcementForm.reset();
    announcementIdInput.value = "";
    announcementFormTitle.textContent = "Add Announcement";
    cancelAnnouncementEditButton.classList.add("hidden");
    clearAnnouncementFormMessage();
  }

  function fillAnnouncementFormForEdit(announcement) {
    announcementIdInput.value = announcement.id;
    announcementMessageInput.value = announcement.message;
    announcementStartDateInput.value = toLocalDateTimeInputValue(
      announcement.starts_at
    );
    announcementExpiryDateInput.value = toLocalDateTimeInputValue(
      announcement.expires_at
    );
    announcementFormTitle.textContent = "Edit Announcement";
    cancelAnnouncementEditButton.classList.remove("hidden");
  }

  async function createAnnouncement(payload) {
    const response = await fetch(
      `/announcements?teacher_username=${encodeURIComponent(currentUser.username)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Failed to create announcement");
    }

    return data;
  }

  async function updateAnnouncement(announcementId, payload) {
    const response = await fetch(
      `/announcements/${encodeURIComponent(
        announcementId
      )}?teacher_username=${encodeURIComponent(currentUser.username)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Failed to update announcement");
    }

    return data;
  }

  async function deleteAnnouncement(announcementId) {
    try {
      const response = await fetch(
        `/announcements/${encodeURIComponent(
          announcementId
        )}?teacher_username=${encodeURIComponent(currentUser.username)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to delete announcement");
      }

      showAnnouncementFormMessage("Announcement deleted.", "success");
      resetAnnouncementForm();
      await fetchAllAnnouncements();
      await fetchActiveAnnouncements();
    } catch (error) {
      showAnnouncementFormMessage(error.message, "error");
    }
  }

  announcementForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      showAnnouncementFormMessage("Sign in to manage announcements.", "error");
      return;
    }

    const message = announcementMessageInput.value.trim();
    const startsAt = fromLocalDateTimeInputValue(announcementStartDateInput.value);
    const expiresAt = fromLocalDateTimeInputValue(
      announcementExpiryDateInput.value
    );

    if (!expiresAt) {
      showAnnouncementFormMessage("Expiration date is required.", "error");
      return;
    }

    if (startsAt && new Date(expiresAt) <= new Date(startsAt)) {
      showAnnouncementFormMessage(
        "Expiration date must be after the start date.",
        "error"
      );
      return;
    }

    const payload = {
      message,
      starts_at: startsAt,
      expires_at: expiresAt,
    };

    try {
      if (announcementIdInput.value) {
        await updateAnnouncement(announcementIdInput.value, payload);
        showAnnouncementFormMessage("Announcement updated.", "success");
      } else {
        await createAnnouncement(payload);
        showAnnouncementFormMessage("Announcement created.", "success");
      }

      resetAnnouncementForm();
      await fetchAllAnnouncements();
      await fetchActiveAnnouncements();
    } catch (error) {
      showAnnouncementFormMessage(error.message, "error");
    }
  });

  cancelAnnouncementEditButton.addEventListener("click", resetAnnouncementForm);

  // Event listeners for authentication
  loginButton.addEventListener("click", openLoginModal);
  logoutButton.addEventListener("click", logout);
  closeLoginModal.addEventListener("click", closeLoginModalHandler);
  manageAnnouncementsButton.addEventListener("click", openAnnouncementsModal);
  closeAnnouncementsModal.addEventListener("click", closeAnnouncementsModalHandler);

  // Close modals when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      closeLoginModalHandler();
    }

    if (event.target === registrationModal) {
      closeRegistrationModalHandler();
    }

    if (event.target === announcementsModal) {
      closeAnnouncementsModalHandler();
    }
  });

  // Handle login form submission
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    await login(username, password);
  });

  // Show loading skeletons
  function showLoadingSkeletons() {
    activitiesList.innerHTML = "";

    for (let i = 0; i < 9; i += 1) {
      const skeletonCard = document.createElement("div");
      skeletonCard.className = "skeleton-card";
      skeletonCard.innerHTML = `
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-text short"></div>
        <div style="margin-top: 8px;">
          <div class="skeleton-line" style="height: 6px;"></div>
          <div class="skeleton-line skeleton-text short" style="height: 8px; margin-top: 3px;"></div>
        </div>
        <div style="margin-top: auto;">
          <div class="skeleton-line" style="height: 24px; margin-top: 8px;"></div>
        </div>
      `;
      activitiesList.appendChild(skeletonCard);
    }
  }

  function formatSchedule(details) {
    if (details.schedule_details) {
      const days = details.schedule_details.days.join(", ");

      const formatTime = (time24) => {
        const [hours, minutes] = time24.split(":").map((num) => parseInt(num, 10));
        const period = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
      };

      const startTime = formatTime(details.schedule_details.start_time);
      const endTime = formatTime(details.schedule_details.end_time);
      return `${days}, ${startTime} - ${endTime}`;
    }

    return details.schedule;
  }

  function getActivityType(activityName, description) {
    const name = activityName.toLowerCase();
    const desc = description.toLowerCase();

    if (
      name.includes("soccer") ||
      name.includes("basketball") ||
      name.includes("sport") ||
      name.includes("fitness") ||
      desc.includes("team") ||
      desc.includes("game") ||
      desc.includes("athletic")
    ) {
      return "sports";
    }

    if (
      name.includes("art") ||
      name.includes("music") ||
      name.includes("theater") ||
      name.includes("drama") ||
      desc.includes("creative") ||
      desc.includes("paint")
    ) {
      return "arts";
    }

    if (
      name.includes("science") ||
      name.includes("math") ||
      name.includes("academic") ||
      name.includes("study") ||
      name.includes("olympiad") ||
      desc.includes("learning") ||
      desc.includes("education") ||
      desc.includes("competition")
    ) {
      return "academic";
    }

    if (
      name.includes("volunteer") ||
      name.includes("community") ||
      desc.includes("service") ||
      desc.includes("volunteer")
    ) {
      return "community";
    }

    if (
      name.includes("computer") ||
      name.includes("coding") ||
      name.includes("tech") ||
      name.includes("robotics") ||
      desc.includes("programming") ||
      desc.includes("technology") ||
      desc.includes("digital") ||
      desc.includes("robot")
    ) {
      return "technology";
    }

    return "academic";
  }

  async function fetchActivities() {
    showLoadingSkeletons();

    try {
      const queryParams = [];

      if (currentDay) {
        queryParams.push(`day=${encodeURIComponent(currentDay)}`);
      }

      if (currentTimeRange) {
        const range = timeRanges[currentTimeRange];
        if (currentTimeRange !== "weekend" && range) {
          queryParams.push(`start_time=${encodeURIComponent(range.start)}`);
          queryParams.push(`end_time=${encodeURIComponent(range.end)}`);
        }
      }

      const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
      const response = await fetch(`/activities${queryString}`);
      const activities = await response.json();
      allActivities = activities;
      displayFilteredActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function displayFilteredActivities() {
    activitiesList.innerHTML = "";

    const filteredActivities = {};

    Object.entries(allActivities).forEach(([name, details]) => {
      const activityType = getActivityType(name, details.description);

      if (currentFilter !== "all" && activityType !== currentFilter) {
        return;
      }

      if (currentTimeRange === "weekend" && details.schedule_details) {
        const activityDays = details.schedule_details.days;
        const isWeekendActivity = activityDays.some((day) =>
          timeRanges.weekend.days.includes(day)
        );

        if (!isWeekendActivity) {
          return;
        }
      }

      const searchableContent = [
        name.toLowerCase(),
        details.description.toLowerCase(),
        formatSchedule(details).toLowerCase(),
      ].join(" ");

      if (searchQuery && !searchableContent.includes(searchQuery.toLowerCase())) {
        return;
      }

      filteredActivities[name] = details;
    });

    if (Object.keys(filteredActivities).length === 0) {
      activitiesList.innerHTML = `
        <div class="no-results">
          <h4>No activities found</h4>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      `;
      return;
    }

    Object.entries(filteredActivities).forEach(([name, details]) => {
      renderActivityCard(name, details);
    });
  }

  function renderActivityCard(name, details) {
    const activityCard = document.createElement("div");
    activityCard.className = "activity-card";

    const totalSpots = details.max_participants;
    const takenSpots = details.participants.length;
    const spotsLeft = totalSpots - takenSpots;
    const capacityPercentage = (takenSpots / totalSpots) * 100;
    const isFull = spotsLeft <= 0;

    let capacityStatusClass = "capacity-available";
    if (isFull) {
      capacityStatusClass = "capacity-full";
    } else if (capacityPercentage >= 75) {
      capacityStatusClass = "capacity-near-full";
    }

    const activityType = getActivityType(name, details.description);
    const typeInfo = activityTypes[activityType];
    const formattedSchedule = formatSchedule(details);

    const tagHtml = `
      <span class="activity-tag" style="background-color: ${typeInfo.color}; color: ${typeInfo.textColor}">
        ${typeInfo.label}
      </span>
    `;

    const capacityIndicator = `
      <div class="capacity-container ${capacityStatusClass}">
        <div class="capacity-bar-bg">
          <div class="capacity-bar-fill" style="width: ${capacityPercentage}%"></div>
        </div>
        <div class="capacity-text">
          <span>${takenSpots} enrolled</span>
          <span>${spotsLeft} spots left</span>
        </div>
      </div>
    `;

    activityCard.innerHTML = `
      ${tagHtml}
      <h4>${name}</h4>
      <p>${details.description}</p>
      <p class="tooltip">
        <strong>Schedule:</strong> ${formattedSchedule}
        <span class="tooltip-text">Regular meetings at this time throughout the semester</span>
      </p>
      ${capacityIndicator}
      <div class="participants-list">
        <h5>Current Participants:</h5>
        <ul>
          ${details.participants
            .map(
              (email) => `
            <li>
              ${email}
              ${
                currentUser
                  ? `
                <span class="delete-participant tooltip" data-activity="${name}" data-email="${email}" role="button" aria-label="Unregister ${email}">
                  ✖
                  <span class="tooltip-text">Unregister this student</span>
                </span>
              `
                  : ""
              }
            </li>
          `
            )
            .join("")}
        </ul>
      </div>
      <div class="activity-card-actions">
        ${
          currentUser
            ? `
          <button class="register-button" data-activity="${name}" ${isFull ? "disabled" : ""}>
            ${isFull ? "Activity Full" : "Register Student"}
          </button>
        `
            : `
          <div class="auth-notice">
            Teachers can register students.
          </div>
        `
        }
      </div>
    `;

    const deleteButtons = activityCard.querySelectorAll(".delete-participant");
    deleteButtons.forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });

    if (currentUser) {
      const registerButton = activityCard.querySelector(".register-button");
      if (!isFull) {
        registerButton.addEventListener("click", () => {
          openRegistrationModal(name);
        });
      }
    }

    activitiesList.appendChild(activityCard);
  }

  searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value;
    displayFilteredActivities();
  });

  searchButton.addEventListener("click", (event) => {
    event.preventDefault();
    searchQuery = searchInput.value;
    displayFilteredActivities();
  });

  categoryFilters.forEach((button) => {
    button.addEventListener("click", () => {
      categoryFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentFilter = button.dataset.category;
      displayFilteredActivities();
    });
  });

  dayFilters.forEach((button) => {
    button.addEventListener("click", () => {
      dayFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentDay = button.dataset.day;
      fetchActivities();
    });
  });

  timeFilters.forEach((button) => {
    button.addEventListener("click", () => {
      timeFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentTimeRange = button.dataset.time;
      fetchActivities();
    });
  });

  function openRegistrationModal(activityName) {
    modalActivityName.textContent = activityName;
    activityInput.value = activityName;
    registrationModal.classList.remove("hidden");
    setTimeout(() => {
      registrationModal.classList.add("show");
    }, 10);
  }

  function closeRegistrationModalHandler() {
    registrationModal.classList.remove("show");
    setTimeout(() => {
      registrationModal.classList.add("hidden");
      signupForm.reset();
    }, 300);
  }

  closeRegistrationModal.addEventListener("click", closeRegistrationModalHandler);

  function showConfirmationDialog(message, confirmCallback) {
    let confirmDialog = document.getElementById("confirm-dialog");
    if (!confirmDialog) {
      confirmDialog = document.createElement("div");
      confirmDialog.id = "confirm-dialog";
      confirmDialog.className = "modal hidden";
      confirmDialog.innerHTML = `
        <div class="modal-content">
          <h3>Confirm Action</h3>
          <p id="confirm-message"></p>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
            <button id="cancel-button" class="cancel-btn">Cancel</button>
            <button id="confirm-button" class="confirm-btn">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmDialog);

      const cancelBtn = confirmDialog.querySelector("#cancel-button");
      const confirmBtn = confirmDialog.querySelector("#confirm-button");
      cancelBtn.style.backgroundColor = "#f1f1f1";
      cancelBtn.style.color = "#333";
      confirmBtn.style.backgroundColor = "#b42318";
      confirmBtn.style.color = "white";
    }

    const confirmMessage = document.getElementById("confirm-message");
    confirmMessage.textContent = message;

    confirmDialog.classList.remove("hidden");
    setTimeout(() => {
      confirmDialog.classList.add("show");
    }, 10);

    const cancelButton = document.getElementById("cancel-button");
    const confirmButton = document.getElementById("confirm-button");

    const newCancelButton = cancelButton.cloneNode(true);
    const newConfirmButton = confirmButton.cloneNode(true);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

    newCancelButton.addEventListener("click", () => {
      confirmDialog.classList.remove("show");
      setTimeout(() => {
        confirmDialog.classList.add("hidden");
      }, 300);
    });

    newConfirmButton.addEventListener("click", () => {
      confirmCallback();
      confirmDialog.classList.remove("show");
      setTimeout(() => {
        confirmDialog.classList.add("hidden");
      }, 300);
    });

    confirmDialog.addEventListener("click", (event) => {
      if (event.target === confirmDialog) {
        confirmDialog.classList.remove("show");
        setTimeout(() => {
          confirmDialog.classList.add("hidden");
        }, 300);
      }
    });
  }

  async function handleUnregister(event) {
    if (!currentUser) {
      showMessage(
        "You must be logged in as a teacher to unregister students.",
        "error"
      );
      return;
    }

    const activity = event.target.dataset.activity;
    const email = event.target.dataset.email;

    showConfirmationDialog(
      `Are you sure you want to unregister ${email} from ${activity}?`,
      async () => {
        try {
          const response = await fetch(
            `/activities/${encodeURIComponent(
              activity
            )}/unregister?email=${encodeURIComponent(
              email
            )}&teacher_username=${encodeURIComponent(currentUser.username)}`,
            {
              method: "POST",
            }
          );

          const result = await response.json();

          if (response.ok) {
            showMessage(result.message, "success");
            fetchActivities();
          } else {
            showMessage(result.detail || "An error occurred", "error");
          }
        } catch (error) {
          showMessage("Failed to unregister. Please try again.", "error");
          console.error("Error unregistering:", error);
        }
      }
    );
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      showMessage(
        "You must be logged in as a teacher to register students.",
        "error"
      );
      return;
    }

    const email = document.getElementById("email").value;
    const activity = activityInput.value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(
          email
        )}&teacher_username=${encodeURIComponent(currentUser.username)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        closeRegistrationModalHandler();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  window.activityFilters = {
    setDayFilter,
    setTimeRangeFilter,
  };

  checkAuthentication();
  initializeFilters();
  fetchActiveAnnouncements();
  fetchActivities();
});
