document.addEventListener('DOMContentLoaded', () => {
    // Initialize counter variable
    let count = 0;

    // Get references to elements
    const counterDisplay = document.getElementById('counter-display');
    const decrementBtn = document.getElementById('decrement-btn');
    const incrementBtn = document.getElementById('increment-btn');

    // Function to update the display
    const updateDisplay = () => {
        counterDisplay.textContent = count;
    };

    // Add event listener for decrement button
    decrementBtn.addEventListener('click', () => {
        count--;
        updateDisplay();
    });

    // Add event listener for increment button
    incrementBtn.addEventListener('click', () => {
        count++;
        updateDisplay();
    });

    // Initial display update
    updateDisplay();
});