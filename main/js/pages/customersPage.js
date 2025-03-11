window.renderCustomersPage = function(mainContent) {
    mainContent.innerHTML = '';
  
    const header = document.createElement('h2');
    header.textContent = 'Customers';
  
    const list = document.createElement('div');
    list.innerHTML = '<p>Show a list of past/current customers. Possibly a search or filter.</p>';
  
    mainContent.appendChild(header);
    mainContent.appendChild(list);
  };
  