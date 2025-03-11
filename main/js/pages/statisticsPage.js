window.renderStatisticsPage = function(mainContent) {
    mainContent.innerHTML = '';
  
    const header = document.createElement('h2');
    header.textContent = 'Statistics';
  
    const text = document.createElement('p');
    text.textContent = 'Graphs or summaries of daily/weekly performance, brand/reputation, etc.';
  
    mainContent.appendChild(header);
    mainContent.appendChild(text);
  };
  