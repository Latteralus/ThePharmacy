// improved-topBar.js

window.renderTopBar = function renderTopBar() {
  const topBar = document.createElement('header');
  topBar.className = 'top-bar';

  const topBarContent = document.createElement('div');
  topBarContent.className = 'top-bar-content';

  // -------- Left Section --------
  const leftSection = document.createElement('div');
  leftSection.className = 'top-bar-left';

  // Logo/Title with icon
  const titleContainer = document.createElement('div');
  titleContainer.className = 'title-container';
  
  // Pharmacy icon (pill/capsule icon using Unicode)
  const iconSpan = document.createElement('span');
  iconSpan.className = 'pharmacy-icon';
  iconSpan.innerHTML = '💊';
  titleContainer.appendChild(iconSpan);

  const titleElem = document.createElement('h1');
  titleElem.className = 'game-title';
  titleElem.textContent = 'PharmaSim';
  titleContainer.appendChild(titleElem);
  
  leftSection.appendChild(titleContainer);

  // Username display
  const usernameContainer = document.createElement('div');
  usernameContainer.className = 'username-container';
  
  const userIcon = document.createElement('span');
  userIcon.className = 'user-icon';
  userIcon.innerHTML = '👤';
  usernameContainer.appendChild(userIcon);
  
  const usernameDisplay = document.createElement('span');
  usernameDisplay.id = 'usernameDisplay';
  usernameDisplay.className = 'username-display';
  usernameDisplay.textContent = window.username || 'Manager';
  usernameContainer.appendChild(usernameDisplay);
  
  leftSection.appendChild(usernameContainer);

  // -------- Right Section --------
  const rightSection = document.createElement('div');
  rightSection.className = 'top-bar-right';

  // Financial Summary with icons
  const financialSummary = document.createElement('div');
  financialSummary.className = 'financial-summary';

  // Cash display
  const cashContainer = document.createElement('div');
  cashContainer.className = 'summary-item-container';
  
  const cashIcon = document.createElement('span');
  cashIcon.className = 'summary-icon';
  cashIcon.innerHTML = '💰';
  cashContainer.appendChild(cashIcon);
  
  const currentCash = document.createElement('span');
  currentCash.id = 'currentCash';
  currentCash.className = 'summary-item';
  currentCash.textContent = `$${window.financesData.cash.toFixed(2)}`;
  cashContainer.appendChild(currentCash);
  
  financialSummary.appendChild(cashContainer);

  // Daily income
  const incomeContainer = document.createElement('div');
  incomeContainer.className = 'summary-item-container';
  
  const incomeIcon = document.createElement('span');
  incomeIcon.className = 'summary-icon';
  incomeIcon.innerHTML = '📈';
  incomeContainer.appendChild(incomeIcon);
  
  const dailyIncome = document.createElement('span');
  dailyIncome.id = 'dailyIncome';
  dailyIncome.className = 'summary-item';
  dailyIncome.textContent = `$${window.financesData.dailyIncome.toFixed(2)}`;
  incomeContainer.appendChild(dailyIncome);
  
  financialSummary.appendChild(incomeContainer);

  // Pending insurance
  const insuranceContainer = document.createElement('div');
  insuranceContainer.className = 'summary-item-container';
  
  const insuranceIcon = document.createElement('span');
  insuranceIcon.className = 'summary-icon';
  insuranceIcon.innerHTML = '🏥';
  insuranceContainer.appendChild(insuranceIcon);
  
  const pendingInsurance = document.createElement('span');
  pendingInsurance.id = 'pendingInsurance';
  pendingInsurance.className = 'summary-item';
  pendingInsurance.textContent = `$${window.financesData.pendingInsuranceIncome.toFixed(2)}`;
  insuranceContainer.appendChild(pendingInsurance);
  
  financialSummary.appendChild(insuranceContainer);

  // Game time with calendar icon
  const timeContainer = document.createElement('div');
  timeContainer.className = 'time-container';
  
  const timeIcon = document.createElement('span');
  timeIcon.className = 'time-icon';
  timeIcon.innerHTML = '📅';
  timeContainer.appendChild(timeIcon);
  
  const gameTime = document.createElement('span');
  gameTime.id = 'gameTime';
  gameTime.className = 'game-time';
  gameTime.textContent = window.ui.formatDateTime(window.gameState.currentDate);
  timeContainer.appendChild(gameTime);
  
  rightSection.appendChild(financialSummary);
  rightSection.appendChild(timeContainer);

  // Notifications button (new feature)
  const notificationsButton = document.createElement('button');
  notificationsButton.className = 'notifications-button';
  notificationsButton.innerHTML = '🔔';
  notificationsButton.title = 'Notifications';
  
  // Add notification count badge
  const notificationCount = document.createElement('span');
  notificationCount.className = 'notification-count';
  notificationCount.id = 'notificationCount';
  notificationCount.textContent = '0';
  notificationCount.style.display = 'none'; // Hide initially
  notificationsButton.appendChild(notificationCount);
  
  // Notification click handler
  notificationsButton.addEventListener('click', () => {
    showNotificationsPanel();
  });
  
  rightSection.appendChild(notificationsButton);

  // Add sections to topbar
  topBarContent.appendChild(leftSection);
  topBarContent.appendChild(rightSection);
  topBar.appendChild(topBarContent);

  // Add notifications panel (hidden initially)
  const notificationsPanel = document.createElement('div');
  notificationsPanel.className = 'notifications-panel';
  notificationsPanel.id = 'notificationsPanel';
  notificationsPanel.style.display = 'none';
  
  const notificationsHeader = document.createElement('div');
  notificationsHeader.className = 'notifications-header';
  notificationsHeader.innerHTML = `
    <h3>Notifications</h3>
    <button id="closeNotifications">✕</button>
  `;
  notificationsPanel.appendChild(notificationsHeader);
  
  const notificationsList = document.createElement('div');
  notificationsList.className = 'notifications-list';
  notificationsList.id = 'notificationsList';
  notificationsList.innerHTML = '<p class="no-notifications">No new notifications</p>';
  notificationsPanel.appendChild(notificationsList);
  
  topBar.appendChild(notificationsPanel);

  // Initialize notifications system if it doesn't exist
  if (!window.notifications) {
    window.notifications = {
      items: [],
      unreadCount: 0,
      
      add: function(message, type = 'info') {
        const notification = {
          id: Date.now(),
          message,
          type,
          timestamp: new Date(),
          read: false
        };
        
        this.items.unshift(notification); // Add to beginning of array
        this.unreadCount++;
        
        // Update the UI
        this.updateUI();
        
        // Limit to most recent 50 notifications
        if (this.items.length > 50) {
          this.items.pop();
        }
        
        return notification.id;
      },
      
      markAsRead: function(id) {
        const notification = this.items.find(n => n.id === id);
        if (notification && !notification.read) {
          notification.read = true;
          this.unreadCount--;
          this.updateUI();
        }
      },
      
      markAllAsRead: function() {
        this.items.forEach(n => {
          n.read = true;
        });
        this.unreadCount = 0;
        this.updateUI();
      },
      
      updateUI: function() {
        const countElem = document.getElementById('notificationCount');
        if (countElem) {
          countElem.textContent = this.unreadCount;
          countElem.style.display = this.unreadCount > 0 ? 'block' : 'none';
        }
        
        const listElem = document.getElementById('notificationsList');
        if (listElem) {
          if (this.items.length === 0) {
            listElem.innerHTML = '<p class="no-notifications">No new notifications</p>';
          } else {
            listElem.innerHTML = '';
            
            this.items.forEach(notification => {
              const notificationItem = document.createElement('div');
              notificationItem.className = `notification-item ${notification.type} ${notification.read ? 'read' : 'unread'}`;
              
              // Format the timestamp
              const timeString = notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              notificationItem.innerHTML = `
                <div class="notification-content">
                  <span class="notification-message">${notification.message}</span>
                  <span class="notification-time">${timeString}</span>
                </div>
              `;
              
              // Mark as read when clicked
              notificationItem.addEventListener('click', () => {
                this.markAsRead(notification.id);
                notificationItem.classList.remove('unread');
                notificationItem.classList.add('read');
              });
              
              listElem.appendChild(notificationItem);
            });
          }
        }
      }
    };
    
    // Add some example notifications
    setTimeout(() => {
      window.notifications.add('Welcome to PharmaSim!', 'success');
      window.notifications.add('New customer has arrived', 'info');
    }, 2000);
  }

  // Function to show notifications panel
  function showNotificationsPanel() {
    const panel = document.getElementById('notificationsPanel');
    if (panel) {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      
      // Update notifications list
      window.notifications.updateUI();
      
      // Set up close button
      const closeBtn = document.getElementById('closeNotifications');
      if (closeBtn) {
        closeBtn.onclick = function() {
          panel.style.display = 'none';
        };
      }
    }
  }

  // Add CSS for top bar
  const style = document.createElement('style');
  style.textContent = `
    .top-bar {
      background-color: var(--primary);
      color: white;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .top-bar-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 20px;
      height: var(--top-bar-height);
    }
    
    .top-bar-left, .top-bar-right {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .title-container, .username-container, .summary-item-container, .time-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .game-title {
      font-size: 1.4rem;
      font-weight: 600;
      margin: 0;
      color: white;
    }
    
    .username-display {
      font-size: 0.9rem;
      font-weight: 500;
    }
    
    .financial-summary {
      display: flex;
      gap: 20px;
    }
    
    .summary-item {
      font-size: 0.9rem;
    }
    
    .summary-icon, .time-icon, .pharmacy-icon, .user-icon {
      font-size: 1.2rem;
    }
    
    .game-time {
      font-size: 0.9rem;
    }
    
    .notifications-button {
      background: none;
      border: none;
      color: white;
      font-size: 1.2rem;
      cursor: pointer;
      position: relative;
      margin-left: 10px;
      transition: transform 0.2s;
    }
    
    .notifications-button:hover {
      transform: scale(1.1);
    }
    
    .notification-count {
      position: absolute;
      top: -5px;
      right: -5px;
      background-color: #ff4b4b;
      color: white;
      font-size: 0.7rem;
      height: 18px;
      width: 18px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      font-weight: bold;
    }
    
    .notifications-panel {
      position: absolute;
      top: var(--top-bar-height);
      right: 10px;
      width: 300px;
      max-height: 400px;
      background-color: white;
      border-radius: 0 0 8px 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      z-index: 1001;
      overflow: hidden;
      display: none;
    }
    
    .notifications-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 15px;
      background-color: var(--primary);
      color: white;
    }
    
    .notifications-header h3 {
      margin: 0;
      font-size: 1rem;
    }
    
    .notifications-header button {
      background: none;
      border: none;
      color: white;
      font-size: 1rem;
      cursor: pointer;
    }
    
    .notifications-list {
      max-height: 350px;
      overflow-y: auto;
    }
    
    .notification-item {
      padding: 12px 15px;
      border-bottom: 1px solid #eee;
      cursor: pointer;
    }
    
    .notification-item:hover {
      background-color: #f9f9f9;
    }
    
    .notification-item.unread {
      border-left: 3px solid #4caf50;
      background-color: #f0f7ff;
    }
    
    .notification-item.read {
      opacity: 0.7;
    }
    
    .notification-content {
      display: flex;
      flex-direction: column;
    }
    
    .notification-message {
      font-size: 0.9rem;
      margin-bottom: 5px;
    }
    
    .notification-time {
      font-size: 0.8rem;
      color: #666;
    }
    
    .no-notifications {
      padding: 15px;
      text-align: center;
      color: #666;
      font-size: 0.9rem;
    }
    
    .notification-item.success {
      border-left-color: #4caf50;
    }
    
    .notification-item.info {
      border-left-color: #2196f3;
    }
    
    .notification-item.warning {
      border-left-color: #ff9800;
    }
    
    .notification-item.error {
      border-left-color: #f44336;
    }
  `;
  
  document.head.appendChild(style);

  return topBar;
};

// Update financial summary (to be called when finances change)
window.updateFinancialSummary = function(financesData) {
  const currentCash = document.getElementById('currentCash');
  if (currentCash) {
    currentCash.textContent = `$${financesData.cash.toFixed(2)}`;
  }
  
  const dailyIncome = document.getElementById('dailyIncome');
  if (dailyIncome) {
    dailyIncome.textContent = `$${financesData.dailyIncome.toFixed(2)}`;
  }
  
  const pendingInsurance = document.getElementById('pendingInsurance');
  if (pendingInsurance) {
    pendingInsurance.textContent = `$${financesData.pendingInsuranceIncome.toFixed(2)}`;
  }
};

// Update time display
window.updateTimeDisplay = function(date) {
  const gameTime = document.getElementById('gameTime');
  if (gameTime) {
    gameTime.textContent = window.ui.formatDateTime(date);
  }
};