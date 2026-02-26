document.addEventListener('DOMContentLoaded', () => {
    let counter = 0;

    // Get references to DOM elements
    const counterDisplay = document.getElementById('counter-display');
    const incrementBtn = document.getElementById('increment-btn');
    const decrementBtn = document.getElementById('decrement-btn');

    // Function to update the display
    function updateCounterDisplay() {
        counterDisplay.textContent = counter;
    }

    // Event listener for increment button
    incrementBtn.addEventListener('click', () => {
        counter++;
        updateCounterDisplay();
    });

    // Event listener for decrement button
    decrementBtn.addEventListener('click', () => {
        counter--;
        updateCounterDisplay();
    });

    // Initialize display on load
    updateCounterDisplay();
});