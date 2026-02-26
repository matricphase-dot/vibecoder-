document.addEventListener('DOMContentLoaded', () => {
    // 1. Get references to DOM elements
    const newTaskInput = document.getElementById('new-task');
    const addTaskBtn = document.getElementById('add-task-btn');
    const todoList = document.getElementById('todo-list');

    // Initialize an empty array to hold task objects
    let todos = [];

    // Helper function to generate a unique ID for tasks
    const generateUniqueId = () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    // 2. Load todos from localStorage
    const loadTodos = () => {
        const storedTodos = localStorage.getItem('todos');
        if (storedTodos) {
            todos = JSON.parse(storedTodos);
        }
    };

    // 3. Save todos to localStorage
    const saveTodos = () => {
        localStorage.setItem('todos', JSON.stringify(todos));
    };

    // 4. Render todos to the DOM
    const renderTodos = () => {
        todoList.innerHTML = ''; // Clear current list

        if (todos.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.textContent = 'No tasks yet! Add a new one above.';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.fontStyle = 'italic';
            emptyMessage.style.color = '#777';
            emptyMessage.style.backgroundColor = '#f0f0f0';
            emptyMessage.style.cursor = 'default';
            emptyMessage.style.boxShadow = 'none';
            todoList.appendChild(emptyMessage);
            return;
        }

        todos.forEach(todo => {
            const listItem = document.createElement('li');
            listItem.setAttribute('data-id', todo.id);
            if (todo.completed) {
                listItem.classList.add('completed');
            }

            const todoTextSpan = document.createElement('span');
            todoTextSpan.classList.add('todo-text');
            todoTextSpan.textContent = todo.text;

            const buttonsGroup = document.createElement('div');
            buttonsGroup.classList.add('buttons-group');

            const completeBtn = document.createElement('button');
            completeBtn.classList.add('complete-btn');
            completeBtn.setAttribute('data-id', todo.id);
            completeBtn.textContent = todo.completed ? 'Undo' : 'Complete';

            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('delete-btn');
            deleteBtn.setAttribute('data-id', todo.id);
            deleteBtn.textContent = 'Delete';

            buttonsGroup.appendChild(completeBtn);
            buttonsGroup.appendChild(deleteBtn);

            listItem.appendChild(todoTextSpan);
            listItem.appendChild(buttonsGroup);
            todoList.appendChild(listItem);
        });
    };

    // 5. Add a new todo item
    const addTodo = () => {
        const taskText = newTaskInput.value.trim();
        if (taskText) {
            const newTodo = {
                id: generateUniqueId(),
                text: taskText,
                completed: false
            };
            todos.push(newTodo);
            saveTodos();
            renderTodos();
            newTaskInput.value = ''; // Clear input field
        } else {
            alert('Task cannot be empty!');
        }
    };

    // Event listeners for Add button and Enter key
    addTaskBtn.addEventListener('click', addTodo);
    newTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodo();
        }
    });

    // 6. Toggle complete status and 7. Delete todo item (using event delegation)
    todoList.addEventListener('click', (e) => {
        const target = e.target;
        const todoId = target.dataset.id;

        if (target.classList.contains('complete-btn')) {
            const todoIndex = todos.findIndex(todo => todo.id === todoId);
            if (todoIndex > -1) {
                todos[todoIndex].completed = !todos[todoIndex].completed;
                saveTodos();
                renderTodos();
            }
        } else if (target.classList.contains('delete-btn')) {
            todos = todos.filter(todo => todo.id !== todoId);
            saveTodos();
            renderTodos();
        }
    });

    // Initial load of todos when the script first loads
    loadTodos();
    renderTodos();
});
