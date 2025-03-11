// Add this to the beginning of main.html before any other scripts

(function() {
    console.log("Debug script running in main.html");
    
    // Create a debug overlay to show loading progress
    const debugOverlay = document.createElement('div');
    debugOverlay.id = 'debug-overlay';
    debugOverlay.style.position = 'fixed';
    debugOverlay.style.top = '0';
    debugOverlay.style.left = '0';
    debugOverlay.style.width = '100%';
    debugOverlay.style.height = '100%';
    debugOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    debugOverlay.style.color = 'white';
    debugOverlay.style.fontFamily = 'monospace';
    debugOverlay.style.fontSize = '14px';
    debugOverlay.style.padding = '20px';
    debugOverlay.style.overflow = 'auto';
    debugOverlay.style.zIndex = '99999';
    
    // Add header
    const header = document.createElement('h2');
    header.textContent = 'Debug Information';
    header.style.color = 'white';
    debugOverlay.appendChild(header);
    
    // Add log container
    const logContainer = document.createElement('div');
    logContainer.id = 'debug-log';
    debugOverlay.appendChild(logContainer);
    
    // Add control buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.position = 'fixed';
    buttonContainer.style.top = '10px';
    buttonContainer.style.right = '10px';
    
    const hideButton = document.createElement('button');
    hideButton.textContent = 'Hide Debug';
    hideButton.style.padding = '5px 10px';
    hideButton.style.marginRight = '10px';
    hideButton.addEventListener('click', function() {
      debugOverlay.style.display = 'none';
    });
    buttonContainer.appendChild(hideButton);
    
    const mainMenuButton = document.createElement('button');
    mainMenuButton.textContent = 'Return to Main Menu';
    mainMenuButton.style.padding = '5px 10px';
    mainMenuButton.addEventListener('click', function() {
      window.location.href = 'index.html';
    });
    buttonContainer.appendChild(mainMenuButton);
    
    debugOverlay.appendChild(buttonContainer);
    
    // Add to document when DOM is ready
    function addDebugOverlay() {
      if (document.body) {
        document.body.appendChild(debugOverlay);
        interceptConsoleLog();
      } else {
        setTimeout(addDebugOverlay, 10);
      }
    }
    
    // Intercept console.log and other console methods
    function interceptConsoleLog() {
      const log = console.log;
      const error = console.error;
      const warn = console.warn;
      const info = console.info;
      
      function appendToLog(message, type = 'log') {
        const logElement = document.getElementById('debug-log');
        if (logElement) {
          const entry = document.createElement('div');
          
          // Format timestamp
          const now = new Date();
          const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
          
          // Set color based on type
          let color = 'white';
          if (type === 'error') color = '#ff5252';
          if (type === 'warn') color = '#ffab40';
          if (type === 'info') color = '#40c4ff';
          
          entry.innerHTML = `<span style="color: #8bc34a">[${timestamp}]</span> <span style="color: ${color}">${formatMessage(message)}</span>`;
          logElement.appendChild(entry);
          
          // Auto-scroll to bottom
          logElement.scrollTop = logElement.scrollHeight;
        }
      }
      
      // Format message for display
      function formatMessage(message) {
        if (typeof message === 'string') {
          return message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        } else if (typeof message === 'object') {
          try {
            return JSON.stringify(message, null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;');
          } catch (e) {
            return String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;');
          }
        } else {
          return String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
      }
      
      // Override console methods
      console.log = function() {
        log.apply(console, arguments);
        Array.from(arguments).forEach(arg => appendToLog(arg, 'log'));
      };
      
      console.error = function() {
        error.apply(console, arguments);
        Array.from(arguments).forEach(arg => appendToLog(arg, 'error'));
      };
      
      console.warn = function() {
        warn.apply(console, arguments);
        Array.from(arguments).forEach(arg => appendToLog(arg, 'warn'));
      };
      
      console.info = function() {
        info.apply(console, arguments);
        Array.from(arguments).forEach(arg => appendToLog(arg, 'info'));
      };
    }
    
    // Start debug overlay
    addDebugOverlay();
    
    // Log system info
    console.log("URL:", window.location.href);
    console.log("URL Parameters:", new URLSearchParams(window.location.search).toString());
    console.log("User Agent:", navigator.userAgent);
    
    // Check for GameAPI
    if (window.gameAPI) {
      console.log("GameAPI is available");
      
      // Get new game options
      if (window.gameAPI.getNewGameOptions) {
        window.gameAPI.getNewGameOptions()
          .then(options => {
            console.log("New Game Options:", options);
          })
          .catch(err => {
            console.error("Error getting new game options:", err);
          });
      } else {
        console.error("getNewGameOptions function is missing from gameAPI");
      }
    } else {
      console.error("GameAPI is not available in window");
    }
    
    // Check for essential game objects
    setTimeout(() => {
      console.log("Document Ready State:", document.readyState);
      console.log("Game Object Checks:");
      console.log("- window.gameState:", typeof window.gameState !== 'undefined');
      console.log("- window.financesData:", typeof window.financesData !== 'undefined');
      console.log("- window.employeesData:", typeof window.employeesData !== 'undefined');
      console.log("- window.ui:", typeof window.ui !== 'undefined');
      console.log("- window.taskManager:", typeof window.taskManager !== 'undefined');
      console.log("- window.showPage:", typeof window.showPage !== 'undefined');
      console.log("- window.renderTopBar:", typeof window.renderTopBar !== 'undefined');
      console.log("- window.renderSidebar:", typeof window.renderSidebar !== 'undefined');
      
      // Check script loading
      console.log("Script loading status:");
      document.querySelectorAll('script').forEach(script => {
        if (script.src) {
          console.log(`- ${script.src.split('/').pop()}: ${script.readyState || 'loaded'}`);
        }
      });
      
      // Check root element
      const root = document.getElementById('root');
      console.log("Root element exists:", !!root);
      if (root) {
        console.log("Root element children:", root.children.length);
      }
    }, 1000);
  })();