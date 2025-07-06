import React, { useState } from 'react';
import { CheckSquare, Square, Plus, X, Save, GripVertical, Trash2 } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';

interface ChecklistItem {
  _id: string;
  text: string;
  completed: boolean;
  completedBy?: { _id: string; name: string };
  completedAt?: string;
  createdBy: { _id: string; name: string };
  createdAt: string;
  order: number;
}

interface EnhancedChecklistProps {
  taskId: string;
  checklist: ChecklistItem[];
  onChecklistUpdate: (updatedChecklist: ChecklistItem[]) => void;
  canEdit: boolean;
  currentUserId: string;
  currentUserName: string;
}

const EnhancedChecklist: React.FC<EnhancedChecklistProps> = ({
  taskId,
  checklist,
  onChecklistUpdate,
  canEdit,
  currentUserId,
  currentUserName
}) => {
  const { showSuccess, showError } = useNotification();
  const [isAdding, setIsAdding] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleToggleItem = async (itemIndex: number) => {
    if (!canEdit) {
      showError('Error', 'You can only update checklist items on tasks assigned to you');
      return;
    }

    setIsUpdating(true);
    try {
      const updatedChecklist = [...checklist];
      const item = updatedChecklist[itemIndex];
      
      updatedChecklist[itemIndex] = {
        ...item,
        completed: !item.completed,
        completedBy: !item.completed ? { _id: currentUserId, name: currentUserName } : undefined,
        completedAt: !item.completed ? new Date().toISOString() : undefined
      };

      await axios.patch(`/tasks/${taskId}/checklist`, {
        checklistItems: updatedChecklist
      });

      onChecklistUpdate(updatedChecklist);
      showSuccess('Success', `Checklist item ${!item.completed ? 'completed' : 'unchecked'}`);
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to update checklist');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemText.trim()) return;

    setIsUpdating(true);
    try {
      const newItem: ChecklistItem = {
        _id: `temp-${Date.now()}`, // Temporary ID, backend will assign real one
        text: newItemText.trim(),
        completed: false,
        createdBy: { _id: currentUserId, name: currentUserName },
        createdAt: new Date().toISOString(),
        order: checklist.length
      };

      const updatedChecklist = [...checklist, newItem];

      await axios.patch(`/tasks/${taskId}/checklist`, {
        checklistItems: updatedChecklist
      });

      onChecklistUpdate(updatedChecklist);
      setNewItemText('');
      setIsAdding(false);
      showSuccess('Success', 'Checklist item added');
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to add checklist item');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveItem = async (itemIndex: number) => {
    if (!canEdit) {
      showError('Error', 'You can only remove checklist items on tasks assigned to you');
      return;
    }

    const item = checklist[itemIndex];
    if (!window.confirm(`Are you sure you want to delete "${item.text}"?`)) {
      return;
    }

    setIsUpdating(true);
    try {
      const updatedChecklist = checklist.filter((_, index) => index !== itemIndex);

      await axios.patch(`/tasks/${taskId}/checklist`, {
        checklistItems: updatedChecklist
      });

      onChecklistUpdate(updatedChecklist);
      showSuccess('Success', 'Checklist item removed');
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to remove checklist item');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedItem || !canEdit) return;

    const draggedIndex = checklist.findIndex(item => item._id === draggedItem);
    if (draggedIndex === -1 || draggedIndex === targetIndex) return;

    const updatedChecklist = [...checklist];
    const [draggedItemData] = updatedChecklist.splice(draggedIndex, 1);
    updatedChecklist.splice(targetIndex, 0, draggedItemData);

    // Update order values
    const reorderedChecklist = updatedChecklist.map((item, index) => ({
      ...item,
      order: index
    }));

    try {
      await axios.patch(`/tasks/${taskId}/checklist`, {
        checklistItems: reorderedChecklist
      });

      onChecklistUpdate(reorderedChecklist);
      showSuccess('Success', 'Checklist reordered');
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Failed to reorder checklist');
    }

    setDraggedItem(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Checklist ({completedCount}/{totalCount})
        </h2>
        {canEdit && (
          <button
            onClick={() => setIsAdding(true)}
            disabled={isUpdating}
            className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Item
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium text-gray-900">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Add New Item Form */}
      {isAdding && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="Enter checklist item..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddItem();
                }
              }}
              autoFocus
              maxLength={200}
            />
            <button
              onClick={handleAddItem}
              disabled={!newItemText.trim() || isUpdating}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewItemText('');
              }}
              className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {200 - newItemText.length} characters remaining
          </p>
        </div>
      )}

      {/* Checklist Items */}
      <div className="space-y-2">
        {checklist.length === 0 ? (
          <div className="text-center py-8">
            <CheckSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No checklist items</h3>
            <p className="text-gray-500 mb-4">
              Break down this task into smaller, manageable steps.
            </p>
            {canEdit && (
              <button
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Item
              </button>
            )}
          </div>
        ) : (
          checklist
            .sort((a, b) => a.order - b.order)
            .map((item, index) => (
              <div
                key={item._id}
                draggable={canEdit}
                onDragStart={(e) => handleDragStart(e, item._id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-all ${
                  item.completed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                } ${canEdit ? 'cursor-move' : ''} ${
                  draggedItem === item._id ? 'opacity-50' : ''
                }`}
              >
                {canEdit && (
                  <div className="flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-600">
                    <GripVertical className="w-4 h-4" />
                  </div>
                )}
                
                <button
                  onClick={() => handleToggleItem(index)}
                  disabled={!canEdit || isUpdating}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    item.completed
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${!canEdit ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                >
                  {item.completed && <CheckSquare className="w-3 h-3" />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${
                    item.completed 
                      ? 'line-through text-gray-500' 
                      : 'text-gray-900'
                  }`}>
                    {item.text}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-xs text-gray-500">
                      Created by {item.createdBy.name} on {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                    {item.completed && item.completedBy && (
                      <div className="text-xs text-green-600">
                        ✓ {item.completedBy.name} on {new Date(item.completedAt!).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                
                {canEdit && (
                  <button
                    onClick={() => handleRemoveItem(index)}
                    disabled={isUpdating}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
        )}
      </div>

      {!canEdit && checklist.length > 0 && (
        <p className="text-xs text-gray-500 mt-4 text-center">
          Only the assigned team member can modify checklist items.
        </p>
      )}

      {/* Checklist Statistics */}
      {checklist.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-gray-900">{totalCount}</p>
              <p className="text-xs text-gray-500">Total Items</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">{completedCount}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-600">{totalCount - completedCount}</p>
              <p className="text-xs text-gray-500">Remaining</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedChecklist;