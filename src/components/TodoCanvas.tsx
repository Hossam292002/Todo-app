'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import { DndContext, useSensor, useSensors, PointerSensor, TouchSensor, pointerWithin, DragOverlay, MeasuringStrategy, MeasuringFrequency, type CollisionDetection, type DragEndEvent, type DragStartEvent, type DragOverEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useTodoStore } from '@/store/useTodoStore';
import { CategoryColumn } from './CategoryColumn';
import { TaskCard, getTaskColor, getTaskColorByKey } from './TaskCard';
import { Toolbar } from './Toolbar';
import { DropIndicatorContext, type DropDirection } from '@/context/DropIndicatorContext';

const MEASURING_CONFIG = {
  droppable: { strategy: MeasuringStrategy.BeforeDragging, frequency: MeasuringFrequency.Optimized },
};

/** Distance from point to rect (0 if inside). */
function distancePointToRect(
  px: number,
  py: number,
  rect: { left: number; top: number; right: number; bottom: number },
  expandPx: number = 0
): number {
  const right = rect.right ?? rect.left + rect.width;
  const bottom = rect.bottom ?? rect.top + rect.height;
  const left = rect.left - expandPx;
  const r = right + expandPx;
  const top = rect.top - expandPx;
  const b = bottom + expandPx;
  const cx = Math.max(left, Math.min(r, px));
  const cy = Math.max(top, Math.min(b, py));
  return Math.hypot(px - cx, py - cy);
}

/** True if point is strictly inside rect (no expansion). */
function pointInRect(
  px: number,
  py: number,
  rect: { left: number; top: number; right?: number; bottom?: number; width?: number; height?: number }
): boolean {
  const right = rect.right ?? rect.left + (rect.width ?? 0);
  const bottom = rect.bottom ?? rect.top + (rect.height ?? 0);
  return px >= rect.left && px <= right && py >= rect.top && py <= bottom;
}

function createClosestToPointerWithDirection(
  directionRef: React.MutableRefObject<DropDirection | null>
): CollisionDetection {
  return (args) => {
    const { pointerCoordinates, droppableRects, droppableContainers } = args;
    directionRef.current = null;
    if (!pointerCoordinates) return pointerWithin(args);
    const px = pointerCoordinates.x;
    const py = pointerCoordinates.y;

    // 1) Prefer the task that strictly contains the pointer (exact drop target)
    for (const container of droppableContainers) {
      const id = container.id;
      if (!String(id).startsWith('task-')) continue;
      const rect = droppableRects.get(id);
      if (!rect) continue;
      if (pointInRect(px, py, rect)) {
        const r = rect as { left: number; top: number; right?: number; bottom?: number; width: number; height: number };
        const top = r.top;
        const bottom = r.bottom ?? r.top + r.height;
        const height = bottom - top;
        const cx = r.left + r.width / 2;
        const dx = px - cx;
        const inTopZone = height > 0 && py < top + height * 0.45;
        const inBottomZone = height > 0 && py > top + height * 0.55;
        if (inTopZone) directionRef.current = 'vertical-above';
        else if (inBottomZone) directionRef.current = 'vertical-below';
        else directionRef.current = dx < 0 ? 'horizontal-left' : 'horizontal-right';
        return [{ id }];
      }
    }

    // 2) Otherwise closest to pointer (e.g. in gap below a task). Only consider tasks and newcol
    //    so we don't match the big category-drop zone when the user meant "drop below this task".
    let bestId: string | number | null = null;
    let bestDistance = Infinity;
    for (const container of droppableContainers) {
      const id = container.id;
      const idStr = String(id);
      if (!idStr.startsWith('task-') && !idStr.startsWith('category-newcol-')) continue;
      const rect = droppableRects.get(id);
      if (!rect) continue;
      const d = distancePointToRect(px, py, rect, 20);
      if (d < bestDistance) {
        bestDistance = d;
        bestId = id;
      }
    }
    if (bestId == null) return pointerWithin(args);
    const rect = droppableRects.get(bestId);
    if (rect && String(bestId).startsWith('task-')) {
      const px = pointerCoordinates.x;
      const py = pointerCoordinates.y;
      const top = rect.top;
      const bottom = rect.bottom ?? rect.top + rect.height;
      const height = bottom - top;
      const cx = rect.left + rect.width / 2;
      const dx = px - cx;
      // Prefer vertical (above/below) when cursor is in top or bottom 45% of task — makes "put under" easy
      const inTopZone = height > 0 && py < top + height * 0.45;
      const inBottomZone = height > 0 && py > top + height * 0.55;
      if (inTopZone) {
        directionRef.current = 'vertical-above';
      } else if (inBottomZone) {
        directionRef.current = 'vertical-below';
      } else {
        directionRef.current = dx < 0 ? 'horizontal-left' : 'horizontal-right';
      }
    }
    return [{ id: bestId }];
  };
}

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-md dark:border-slate-700 dark:bg-slate-900/95">
      <button
        onClick={() => zoomIn()}
        className="flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Zoom in"
      >
        <span className="text-lg font-medium">+</span>
      </button>
      <button
        onClick={() => zoomOut()}
        className="flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Zoom out"
      >
        <span className="text-lg font-medium">−</span>
      </button>
      <button
        onClick={() => resetTransform()}
        className="flex h-8 w-8 items-center justify-center rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Reset view"
      >
        ⊡
      </button>
    </div>
  );
}

export function TodoCanvas() {
  const [activeTask, setActiveTask] = useState<{ task: import('@/lib/supabase').Task; categoryId: string } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ overId: string | null; direction: DropDirection | null }>({
    overId: null,
    direction: null,
  });
  const pointerDirectionRef = useRef<DropDirection | null>(null);
  const collisionDetection = useMemo(
    () => createClosestToPointerWithDirection(pointerDirectionRef),
    []
  );
  const fetchCategories = useTodoStore((s) => s.fetchCategories);
  const fetchProjects = useTodoStore((s) => s.fetchProjects);
  const fetchTasks = useTodoStore((s) => s.fetchTasks);
  const tasks = useTodoStore((s) => s.tasks);
  const categories = useTodoStore((s) => s.categories);

  useEffect(() => {
    fetchCategories();
    fetchProjects();
    fetchTasks();
  }, [fetchCategories, fetchProjects, fetchTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const str = String(active.id);
    if (!str.startsWith('task-')) return;
    const taskId = parseInt(str.replace('task-', ''), 10);
    const task = tasks.find((t) => t.task_id === taskId);
    if (task) setActiveTask({ task, categoryId: task.category_id });
  }, [tasks]);

  const reorderTasksInCategory = useTodoStore((s) => s.reorderTasksInCategory);
  const reorderTaskWithDirection = useTodoStore((s) => s.reorderTaskWithDirection);
  const updateTaskPosition = useTodoStore((s) => s.updateTaskPosition);
  const updateCategoryWidth = useTodoStore((s) => s.updateCategoryWidth);

  const getDropDirection = useCallback(
    (active: DragEndEvent['active'], over: NonNullable<DragEndEvent['over']>): DropDirection => {
      const activeRect = active.rect.current?.translated ?? active.rect.current?.initial;
      if (!activeRect) return 'vertical-below';
      const activeCenterX = (activeRect.left + (activeRect.right ?? activeRect.left)) / 2;
      const activeCenterY = (activeRect.top + (activeRect.bottom ?? activeRect.top)) / 2;
      const overCenterX = (over.rect.left + (over.rect.right ?? over.rect.left)) / 2;
      const overCenterY = (over.rect.top + (over.rect.bottom ?? over.rect.top)) / 2;
      const dx = activeCenterX - overCenterX;
      const dy = activeCenterY - overCenterY;
      if (Math.abs(dy) > Math.abs(dx)) {
        return dy < 0 ? 'vertical-above' : 'vertical-below';
      }
      return dx < 0 ? 'horizontal-left' : 'horizontal-right';
    },
    []
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      const activeStr = String(active.id);
      if (!activeStr.startsWith('task-') || !over) {
        setDropIndicator({ overId: null, direction: null });
        return;
      }
      const overStr = String(over.id);
      if (overStr.startsWith('task-')) {
        const direction = pointerDirectionRef.current ?? getDropDirection(active, over);
        setDropIndicator({ overId: overStr, direction });
      } else {
        setDropIndicator({ overId: null, direction: null });
      }
    },
    [getDropDirection]
  );

  const clearDropIndicator = useCallback(() => {
    setDropIndicator({ overId: null, direction: null });
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const directionToUse = dropIndicator.direction;
      setActiveTask(null);
      clearDropIndicator();
      const { active, over } = event;
      const activeStr = String(active.id);
      if (!activeStr.startsWith('task-')) return;
      const activeTaskId = parseInt(activeStr.replace('task-', ''), 10);
      const activeTask = tasks.find((t) => t.task_id === activeTaskId);
      if (!activeTask) return;

      const categoryTasks = tasks
        .filter((t) => t.category_id === activeTask.category_id)
        .sort((a, b) => a.position_x - b.position_x || a.position_y - b.position_y);
      const colSize = 196;
      const byCol = new Map<number, typeof categoryTasks>();
      for (const t of categoryTasks) {
        const col = Math.round(t.position_x / colSize);
        if (!byCol.has(col)) byCol.set(col, []);
        byCol.get(col)!.push(t);
      }
      for (const col of byCol.values()) col.sort((a, b) => a.position_y - b.position_y);
      const columnOrder = [...byCol.entries()].sort((a, b) => a[0] - b[0]).flatMap(([, c]) => c);
      const itemIds = columnOrder.map((t) => `task-${t.task_id}`);
      const oldIndex = itemIds.indexOf(activeStr);
      if (oldIndex === -1) return;

      if (!over || active.id === over.id) return;
      const overStr = String(over.id);
      if (overStr === `category-newcol-${activeTask.category_id}`) {
        const PADDING = 24;
        const NEW_COLUMN_ZONE_WIDTH = 80;
        const maxCol = categoryTasks.length > 0
          ? Math.max(...categoryTasks.map((t) => Math.round(t.position_x / colSize)))
          : -1;
        const newX = (maxCol + 1) * colSize;
        const newY = 0;
        updateTaskPosition(activeTaskId, activeTask.category_id, newX, newY);
        const neededWidth = (maxCol + 2) * colSize + PADDING + NEW_COLUMN_ZONE_WIDTH;
        updateCategoryWidth(activeTask.category_id, Math.ceil(neededWidth));
        return;
      }
      if (overStr.startsWith('category-drop-') && overStr === `category-drop-${activeTask.category_id}`) {
        const newOrder = arrayMove(itemIds, oldIndex, itemIds.length - 1);
        const taskIds = newOrder.map((id) => parseInt(String(id).replace('task-', ''), 10));
        reorderTasksInCategory(activeTask.category_id, taskIds);
        return;
      }
      if (overStr.startsWith('task-')) {
        const overTaskId = parseInt(overStr.replace('task-', ''), 10);
        const overTask = tasks.find((t) => t.task_id === overTaskId);
        if (!overTask || activeTask.category_id !== overTask.category_id) return;
        const direction = directionToUse ?? getDropDirection(active, over);
        reorderTaskWithDirection(activeTask.category_id, activeTaskId, overTaskId, direction);
      }
    },
    [tasks, dropIndicator.direction, reorderTasksInCategory, reorderTaskWithDirection, updateTaskPosition, updateCategoryWidth, getDropDirection, clearDropIndicator]
  );

  const handleDragCancel = useCallback(() => {
    setActiveTask(null);
    clearDropIndicator();
  }, [clearDropIndicator]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.position_x - b.position_x),
    [categories]
  );

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute left-4 top-4 z-10">
        <Toolbar />
      </div>
      <DropIndicatorContext.Provider value={{ state: dropIndicator, setState: setDropIndicator }}>
        <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      autoScroll={false}
      measuring={MEASURING_CONFIG}
    >
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={2}
          limitToBounds={false}
          smooth={true}
          disabled={!!activeTask}
          panning={{
            allowLeftClickPan: true,
            allowMiddleClickPan: true,
            allowRightClickPan: true,
            excluded: ['task-card', 'add-task-btn'],
          }}
          doubleClick={{ disabled: true }}
        >
          <ZoomControls />
          <TransformComponent
            wrapperClass="!w-full !h-full"
            contentClass="!w-full !h-full !min-w-full !min-h-full"
          >
            <div className="relative min-h-full min-w-full">
              <div
                className="canvas-background absolute inset-0 cursor-grab active:cursor-grabbing bg-slate-100 dark:bg-slate-950"
                style={{
                  left: -3000,
                  top: -3000,
                  width: 8000,
                  height: 8000,
                  backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0',
                }}
                aria-hidden
              />
              <div className="relative flex min-h-full items-start justify-start gap-4 p-16 pointer-events-none">
                {sortedCategories.map((c) => (
                  <div key={c.id} className="pointer-events-auto">
                    <CategoryColumn
                      categoryId={c.id}
                      name={c.name}
                      width={c.width}
                    />
                  </div>
                ))}
              </div>
            </div>
          </TransformComponent>
        </TransformWrapper>
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <DragOverlayContent task={activeTask.task} categoryId={activeTask.categoryId} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </DropIndicatorContext.Provider>
    </div>
  );
}

function DragOverlayContent({ task, categoryId }: { task: import('@/lib/supabase').Task; categoryId: string }) {
  const categories = useTodoStore((s) => s.categories);
  const category = categories.find((c) => c.id === categoryId);
  const color = getTaskColorByKey(category?.color) ?? getTaskColor(task.task_id);
  return (
    <div className={`cursor-grabbing w-[180px] rounded-lg border-2 ring-2 ring-emerald-400 p-3 shadow-2xl will-change-transform ${color.bg} ${color.border}`}>
      <div className={`text-xs font-mono ${color.accent}`}>{task.display_id ?? `#${task.task_id}`}</div>
      <div className={`font-medium ${color.accent}`}>{task.title}</div>
      {task.description && (
        <div className="mt-1 text-sm text-slate-600 line-clamp-2">{task.description}</div>
      )}
    </div>
  );
}
