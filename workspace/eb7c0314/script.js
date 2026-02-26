document.addEventListener('DOMContentLoaded', () => {
    // Initialize counter value
    let count = 0;

    // Get references to DOM elements
    const counterDisplay = document.getElementById('counter-display');
    const incrementBtn = document.getElementById('increment-btn');
    const decrementBtn = document.getElementById('decrement-btn');

    // Function to update the counter display
    const updateCounterDisplay = () => {
        counterDisplay.textContent = count;
    };

    // Event listener for the increment button
    incrementBtn.addEventListener('click', () => {
        count++;
        updateCounterDisplay();
    });

    // Event listener for the decrement button
    decrementBtn.addEventListener('click', () => {
        count--;
        updateCounterDisplay();
    });

    // Initial update of the display when the page loads
    updateCounterDisplay();
});
