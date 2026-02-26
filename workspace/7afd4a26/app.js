let counter = 0; 
const counterDisplay = document.getElementById('counter-display'); 
const minusButton = document.getElementById('minus-button'); 
const plusButton = document.getElementById('plus-button'); 

function updateCounterDisplay() { 
  counterDisplay.textContent = counter; 
} 

minusButton.addEventListener('click', () => { 
  try { 
    counter--; 
    updateCounterDisplay(); 
  } catch (error) { 
    console.error('Error decrementing counter:', error); 
  } 
}); 

plusButton.addEventListener('click', () => { 
  try { 
    counter++; 
    updateCounterDisplay(); 
  } catch (error) { 
    console.error('Error incrementing counter:', error); 
  } 
}); 

updateCounterDisplay();