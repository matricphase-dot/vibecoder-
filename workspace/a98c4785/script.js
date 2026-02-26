document.addEventListener('DOMContentLoaded', () => {
    let count = 0;
    const countDisplay = document.getElementById('countDisplay');
    const decrementBtn = document.getElementById('decrementBtn');
    const incrementBtn = document.getElementById('incrementBtn');

    // Function to update the display
    function updateDisplay() {
        countDisplay.textContent = count;
    }

    // Event listener for the increment button
    incrementBtn.addEventListener('click', () => {
        count++;
        updateDisplay();
    });

    // Event listener for the decrement button
    decrementBtn.addEventListener('click', () => {
        count--;
        updateDisplay();
    });

    // Initialize display with the starting count
    updateDisplay();
});
