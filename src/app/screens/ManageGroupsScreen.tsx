import { useNavigate } from 'react-router';
import { ArrowLeft, Plus, GripVertical, Pencil, Trash2, Check, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useHabitGroups, type HabitGroup } from '@/hooks/useHabitGroups';
import { useHabits } from '@/hooks/useHabits';

const ITEM_TYPE = 'GROUP_ROW';

function GroupRow({ group, index, moveRow, habitCount, onRename, onDelete }: {
  group: HabitGroup;
  index: number;
  moveRow: (from: number, to: number) => void;
  habitCount: number;
  onRename: (name: string) => Promise<void>;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { index },
    collect: (m) => ({ isDragging: m.isDragging() }),
  });
  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover(item: { index: number }) {
      if (item.index === index) return;
      moveRow(item.index, index);
      item.index = index;
    },
  });
  drag(drop(ref));

  const save = async () => {
    if (name.trim() && name.trim() !== group.name) await onRename(name.trim());
    setEditing(false);
  };

  return (
    <div ref={ref} style={{ opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-3 bg-card border border-border rounded-2xl p-4">
      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
      {editing ? (
        <input value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          autoFocus
          className="flex-1 bg-transparent text-white border-b border-white focus:outline-none" />
      ) : (
        <div className="flex-1 min-w-0">
          <p className="text-white truncate">{group.name}</p>
          <p className="text-xs text-muted-foreground">{habitCount} {habitCount === 1 ? 'habit' : 'habits'}</p>
        </div>
      )}
      {editing ? (
        <>
          <button onClick={save} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-accent">
            <Check className="w-4 h-4 text-white" />
          </button>
          <button onClick={() => { setEditing(false); setName(group.name); }} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-accent">
            <X className="w-4 h-4 text-white" />
          </button>
        </>
      ) : (
        <>
          <button onClick={() => setEditing(true)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-accent">
            <Pencil className="w-3.5 h-3.5 text-white" />
          </button>
          <button onClick={onDelete} className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20">
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </button>
        </>
      )}
    </div>
  );
}

export function ManageGroupsScreen() {
  const navigate = useNavigate();
  const { groups, loading, createGroup, renameGroup, reorderGroups, deleteGroup } = useHabitGroups();
  const { habits, refetch: refetchHabits } = useHabits();
  const [newName, setNewName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<HabitGroup | null>(null);

  const habitCounts = new Map<string, number>();
  for (const h of habits) {
    if (h.group_id) habitCounts.set(h.group_id, (habitCounts.get(h.group_id) ?? 0) + 1);
  }

  const moveRow = (from: number, to: number) => {
    const next = [...groups];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorderGroups(next);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await createGroup(newName.trim());
    setNewName('');
  };

  const confirmDelete = async (mode: 'reassign' | 'cascade') => {
    if (!pendingDelete) return;
    await deleteGroup(pendingDelete.id, mode);
    setPendingDelete(null);
    await refetchHabits();
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-background max-w-md mx-auto pb-12">
        <div className="px-6 pt-12 pb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors mb-6">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-2xl font-medium text-white">Habit Groups</h1>
          <p className="text-sm text-muted-foreground mt-1">Bundle related habits and check them off together.</p>
        </div>

        <div className="px-6 mb-6">
          <form onSubmit={handleCreate} className="flex gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New group name"
              className="flex-1 px-4 py-3 bg-input rounded-xl text-white placeholder:text-muted-foreground border border-border focus:outline-none focus:border-white transition-colors" />
            <button type="submit" disabled={!newName.trim()}
              className="px-4 py-3 bg-white text-black rounded-xl font-medium disabled:opacity-40 hover:bg-gray-100 transition-colors flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </button>
          </form>
        </div>

        <div className="px-6 space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : groups.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">No groups yet. Create one above.</p>
          ) : (
            groups.map((g, i) => (
              <GroupRow key={g.id} group={g} index={i} moveRow={moveRow}
                habitCount={habitCounts.get(g.id) ?? 0}
                onRename={(name) => renameGroup(g.id, name)}
                onDelete={() => setPendingDelete(g)} />
            ))
          )}
        </div>

        {pendingDelete && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50" onClick={() => setPendingDelete(null)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-white font-medium mb-2">Delete "{pendingDelete.name}"?</h3>
              <p className="text-sm text-muted-foreground mb-5">
                {(habitCounts.get(pendingDelete.id) ?? 0) === 0
                  ? "This group has no habits. It'll be removed."
                  : 'Choose what happens to the habits inside.'}
              </p>
              <div className="space-y-2">
                <button onClick={() => confirmDelete('reassign')}
                  className="w-full py-3 bg-secondary text-white rounded-xl hover:bg-accent transition-colors">
                  Move habits to Ungrouped
                </button>
                {(habitCounts.get(pendingDelete.id) ?? 0) > 0 && (
                  <button onClick={() => confirmDelete('cascade')}
                    className="w-full py-3 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors">
                    Delete habits too
                  </button>
                )}
                <button onClick={() => setPendingDelete(null)}
                  className="w-full py-3 text-muted-foreground hover:text-white transition-colors text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}
