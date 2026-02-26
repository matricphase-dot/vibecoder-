document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize a counter variable
    let count = 0;

    // 2. Get references to the counter display element and the plus/minus buttons
    const counterDisplay = document.getElementById('counter-display');
    const incrementBtn = document.getElementById('increment-btn');
    const decrementBtn = document.getElementById('decrement-btn');

    // 3. Create a function to update the display with the current counter value.
    const updateDisplay = () => {
        counterDisplay.textContent = count;
    };

    // Initialize the display with the starting value
    updateDisplay();

    // 4. Attach event listeners to the plus button to increment the counter and update the display.
    incrementBtn.addEventListener('click', () => {
        count++;
        updateDisplay();
    });

    // 5. Attach event listeners to the minus button to decrement the counter and update the display.
    decrementBtn.addEventListener('click', () => {
        count--;
        updateDisplay();
    });
});
