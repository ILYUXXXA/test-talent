// Scroll only the tab strip; scrolling an ancestor would move the whole page.
export function revealNavigationItem(container, item) {
  if (!container || !item || container.scrollWidth <= container.clientWidth) return
  const frame = container.getBoundingClientRect()
  const tab = item.getBoundingClientRect()
  const padding = 4
  const delta = tab.left < frame.left + padding
    ? tab.left - frame.left - padding
    : tab.right > frame.right - padding ? tab.right - frame.right + padding : 0
  if (delta) container.scrollBy({ left: delta, top: 0, behavior: 'instant' })
}
