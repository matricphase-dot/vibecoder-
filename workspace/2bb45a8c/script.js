let count = 0;

// Get references to HTML elements
const counterDisplay = document.getElementById('counter-display');
const minusBtn = document.getElementById('minus-btn');
const plusBtn = document.getElementById('plus-btn');

// Function to update the HTML display with the current count value
function updateDisplay() {
    counterDisplay.textContent = count;
}

// Call updateDisplay initially to show '0'
updateDisplay();

// Add event listener to the 'plus' button
plusBtn.addEventListener('click', () => {
    count++;
    updateDisplay();
});

// Add event listener to the 'minus' button
minusBtn.addEventListener('click', () => {
    count--;
    updateDisplay();
});