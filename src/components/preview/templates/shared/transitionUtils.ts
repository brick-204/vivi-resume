export const onBeforeLeave = (el: Element) => {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = `${htmlEl.offsetHeight}px`
}
