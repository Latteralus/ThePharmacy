window.renderMarketingPage = function(mainContent) {
    mainContent.innerHTML = '';
  
    const header = document.createElement('h2');
    header.textContent = 'Marketing';
  
    const text = document.createElement('p');
    text.textContent = 'Set budgets, campaigns, or ad strategies affecting brandScore.';
  
    mainContent.appendChild(header);
    mainContent.appendChild(text);
  };
  