let counter = 0;
const counterDisplay = document.querySelector('.counter-display');
const plusBtn = document.querySelector('.plus-btn');
const minusBtn = document.querySelector('.minus-btn');

plusBtn.addEventListener('click', () => {
  counter++;
  counterDisplay.textContent = counter;
});

minusBtn.addEventListener('click', () => {
  counter--;
  counterDisplay.textContent = counter;
});
