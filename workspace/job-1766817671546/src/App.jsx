import { useMemo, useState } from "react";

export default function App() {
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);

  const remaining = useMemo(() => items.filter((x) => !x.done).length, [items]);

  const add = () => {
    const t = text.trim();
    if (!t) return;
    setItems((prev) => [{ id: Date.now(), text: t, done: false }, ...prev]);
    setText("");
  };

  const toggle = (id) =>
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));

  const remove = (id) => setItems((prev) => prev.filter((x) => x.id !== id));
  const clearDone = () => setItems((prev) => prev.filter((x) => !x.done));

  return (
    <div style={{ fontFamily: "system-ui, Arial", padding: 24, maxWidth: 700 }}>
      <h1>Todo</h1>
      <p style={{ color: "#555" }}>
        Generated from prompt: {"Build a todo app "}
      </p>

      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => (e.key === "Enter" ? add() : null)}
          placeholder="Add a task..."
          style={{ flex: 1, padding: 10 }}
        />
        <button onClick={add} style={{ padding: "10px 14px" }}>
          Add
        </button>
      </div>

      <div style={{ marginTop: 12, color: "#666" }}>
        Remaining: {remaining}
        <button onClick={clearDone} style={{ marginLeft: 12, padding: "6px 10px" }}>
          Clear done
        </button>
      </div>

      <ul style={{ marginTop: 14, paddingLeft: 18 }}>
        {items.map((x) => (
          <li key={x.id} style={{ marginBottom: 10 }}>
            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="checkbox" checked={x.done} onChange={() => toggle(x.id)} />
              <span style={{ textDecoration: x.done ? "line-through" : "none" }}>{x.text}</span>
              <button onClick={() => remove(x.id)} style={{ marginLeft: "auto", padding: "4px 8px" }}>
                Delete
              </button>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
