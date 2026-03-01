import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';
import { SortableItem } from './SortableItem';
import { AgentPalette } from './AgentPalette';

const defaultAgents = [
  { id: 'planner', name: 'Planner', enabled: true },
  { id: 'coder', name: 'Coder', enabled: true },
  { id: 'debugger', name: 'Debugger', enabled: true },
  { id: 'reviewer', name: 'Reviewer', enabled: true },
  { id: 'deployer', name: 'Deployer', enabled: true },
];

export function WorkflowBuilder({ onSave, initialWorkflow }) {
  const [items, setItems] = useState(initialWorkflow?.agents || defaultAgents);
  const [activeId, setActiveId] = useState(null);
  const [workflowName, setWorkflowName] = useState(initialWorkflow?.name || 'My Workflow');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event) {
    const { active } = event;
    setActiveId(active.id);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);

    if (active.id !== over?.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      setItems(arrayMove(items, oldIndex, newIndex));
    }
  }

  function toggleAgent(id) {
    setItems(items.map(agent =>
      agent.id === id ? { ...agent, enabled: !agent.enabled } : agent
    ));
  }

  function handleSave() {
    onSave({
      name: workflowName,
      agents: items.filter(a => a.enabled).map(({ id, name }) => ({ id, name })),
    });
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Workflow Builder</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Workflow Name</label>
        <input
          type="text"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Agents</h3>
          <AgentPalette agents={items} onToggle={toggleAgent} />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Execution Order</h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext
              items={items.filter(a => a.enabled).map(a => a.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {items.filter(a => a.enabled).map((agent) => (
                  <SortableItem key={agent.id} id={agent.id} agent={agent} />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeId ? (
                <div className="bg-blue-600 p-3 rounded shadow-lg">
                  {items.find(a => a.id === activeId)?.name}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
        >
          Save Workflow
        </button>
      </div>
    </div>
  );
}
