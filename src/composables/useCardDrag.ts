import { ref, type Ref } from 'vue'

export function useCardDrag<T extends { id: string }>(items: Ref<T[]>) {
  const draggingIndex = ref<number | null>(null)

  const handleDragStart = (index: number, event: DragEvent) => {
    draggingIndex.value = index
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', index.toString())
    }
  }

  const handleDragOver = (_index: number, event: DragEvent) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  const handleDrop = (targetIndex: number, _event: DragEvent) => {
    _event.preventDefault()
    const sourceIndex = draggingIndex.value
    if (sourceIndex !== null && sourceIndex !== targetIndex) {
      const newItems = [...items.value]
      const draggedItem = newItems[sourceIndex]
      newItems.splice(sourceIndex, 1)
      newItems.splice(targetIndex, 0, draggedItem)
      items.value = newItems
    }
  }

  const handleDragEnd = () => {
    draggingIndex.value = null
  }

  return { draggingIndex, handleDragStart, handleDragOver, handleDrop, handleDragEnd }
}