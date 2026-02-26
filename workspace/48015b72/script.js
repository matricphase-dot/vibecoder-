document.addEventListener('DOMContentLoaded', () => {
    let count = 0;

    // Get references to DOM elements
    const counterDisplay = document.getElementById('counter-display');
    const incrementBtn = document.getElementById('increment-btn');
    const decrementBtn = document.getElementById('decrement-btn');

    /**
     * Updates the text content of the counter display with the current count.
     */
    function updateDisplay() {
        counterDisplay.textContent = count;
    }

    // Initialize display with the starting count
    updateDisplay();

    // Add event listener for the increment button
    incrementBtn.addEventListener('click', () => {
        count++;
        updateDisplay();
    });

    // Add event listener for the decrement button
    decrementBtn.addEventListener('click', () => {
        count--;
        updateDisplay();
    });
});
