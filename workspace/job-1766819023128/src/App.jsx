import React, { useState, useEffect, useMemo } from 'react';

export default function App() {
  const [todos, setTodos] = useState(() => {
    try {
      const saved = localStorage.getItem('todos');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [filter, setFilter] = useState('all'); // all, active, completed, overdue
  const [newText, setNewText] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    if (!newText.trim()) return;
    const due = newDueDate ? newDueDate : null;
    setTodos([
      ...todos,
      {
        id: Date.now(),
        text: newText.trim(),
        completed: false,
        dueDate: due,
      },
    ]);
    setNewText('');
    setNewDueDate('');
  };

  const toggleComplete = (id) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? {...todo, completed: !todo.completed} : todo
      )
    );
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const updateText = (id, text) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? {...todo, text} : todo
      )
    );
  };

  const updateDueDate = (id, dueDate) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? {...todo, dueDate} : todo
      )
    );
  };

  const filteredTodos = useMemo(() => {
    const now = new Date();
    return todos.filter((todo) => {
      if (filter === 'all') return true;
      if (filter === 'active') return !todo.completed;
      if (filter === 'completed') return todo.completed;
      if (filter === 'overdue') {
        if (!todo.dueDate) return false;
        const due = new Date(todo.dueDate + 'T23:59:59');
        return !todo.completed && due < now;
      }
      return true;
    });
  }, [todos, filter]);

  const containerStyle = {
    maxWidth: 600,
    margin: '20px auto',
    fontFamily: 'Arial, sans-serif',
    padding: 10,
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: 20,
  };

  const inputGroupStyle = {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
  };

  const inputStyle = {
    flex: 1,
    padding: 8,
    fontSize: 16,
  };

  const dateInputStyle = {
    width: 140,
    padding: 8,
    fontSize: 16,
  };

  const buttonStyle = {
    padding: '8px 16px',
    fontSize: 16,
    cursor: 'pointer',
  };

  const filtersStyle = {
    display: 'flex',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  };

  const filterButtonStyle = (active) => ({
    padding: '6px 12px',
    cursor: 'pointer',
    border: '1px solid #ccc',
    borderRadius: 4,
    backgroundColor: active ? '#007bff' : 'white',
    color: active ? 'white' : '#333',
  });

  const todoListStyle = {
    listStyle: 'none',
    padding: 0,
  };

  const todoItemStyle = (completed, overdue) => ({
    display: 'flex',
    alignItems: 'center',
    padding: '8px 4px',
    borderBottom: '1px solid #eee',
    backgroundColor: overdue ? '#ffe6e6' : 'white',
  });

  const checkboxStyle = {
    marginRight: 12,
    width: 18,
    height: 18,
    cursor: 'pointer',
  };

  const textInputStyle = (completed) => ({
    flex: 1,
    fontSize: 16,
    border: 'none',
    backgroundColor: 'transparent',
    textDecoration: completed ? 'line-through' : 'none',
    color: completed ? '#888' : '#000',
    outline: 'none',
  });

  const dueDateStyle = (completed, overdue) => ({
    marginLeft: 12,
    fontSize: 14,
    color: completed ? '#888' : overdue ? '#d00' : '#555',
    fontWeight: overdue ? 'bold' : 'normal',
    minWidth: 90,
  });

  const deleteButtonStyle = {
    marginLeft: 12,
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#d00',
    fontSize: 18,
    lineHeight: 1,
  };

  return (
    <div style={containerStyle}>
      <h1 style={headerStyle}>Todo App</h1>
      <div style={inputGroupStyle}>
        <input
          style={inputStyle}
          type="text"
          placeholder="Add new todo..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addTodo();
          }}
          aria-label="New todo text"
        />
        <input
          style={dateInputStyle}
          type="date"
          value={newDueDate}
          onChange={(e) => setNewDueDate(e.target.value)}
          aria-label="New todo due date"
        />
        <button style={buttonStyle} onClick={addTodo} aria-label="Add todo">
          Add
        </button>
      </div>
      <div style={filtersStyle} role="group" aria-label="Filter todos">
        {['all', 'active', 'completed', 'overdue'].map((f) => (
          <button
            key={f}
            style={filterButtonStyle(filter === f)}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <ul style={todoListStyle}>
        {filteredTodos.length === 0 && (
          <li style={{ textAlign: 'center', color: '#666', padding: 20 }}>
            No todos to display.
          </li>
        )}
        {filteredTodos.map(({ id, text, completed, dueDate }) => {
          const now = new Date();
          const overdue =
            dueDate && !completed && new Date(dueDate + 'T23:59:59') < now;
          return (
            <li key={id} style={todoItemStyle(completed, overdue)}>
              <input
                type="checkbox"
                checked={completed}
                onChange={() => toggleComplete(id)}
                style={checkboxStyle}
                aria-label={`Mark todo "${text}" as ${completed ? 'incomplete' : 'complete'}`}
              />
              <input
                type="text"
                value={text}
                onChange={(e) => updateText(id, e.target.value)}
                style={textInputStyle(completed)}
                aria-label={`Edit todo text for "${text}"`}
              />
              <input
                type="date"
                value={dueDate || ''}
                onChange={(e) => updateDueDate(id, e.target.value || null)}
                style={{ marginLeft: 12, fontSize: 14 }}
                aria-label={`Edit due date for "${text}"`}
              />
              {dueDate && (
                <span style={dueDateStyle(completed, overdue)} title={`Due date: ${dueDate}`}>
                  {dueDate}
                </span>
              )}
              <button
                onClick={() => deleteTodo(id)}
                style={deleteButtonStyle}
                aria-label={`Delete todo "${text}"`}
                title="Delete todo"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}