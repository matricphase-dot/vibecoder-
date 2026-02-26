document.addEventListener('DOMContentLoaded', () => {
    let counter = 0;
    const counterDisplay = document.getElementById('counter-display');
    const minusBtn = document.getElementById('minus-btn');
    const plusBtn = document.getElementById('plus-btn');

    // Function to update the display with the current counter value
    const updateDisplay = () => {
        counterDisplay.textContent = counter;
    };

    // Initialize display on load
    updateDisplay();

    // Event listener for the 'minus' button
    minusBtn.addEventListener('click', () => {
        counter--;
        updateDisplay();
    });

    // Event listener for the 'plus' button
    plusBtn.addEventListener('click', () => {
        counter++;
        updateDisplay();
    });
});