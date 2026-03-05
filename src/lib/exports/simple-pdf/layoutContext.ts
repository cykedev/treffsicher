import { MARGIN_BOTTOM, MARGIN_TOP, PAGE_HEIGHT } from "@/lib/exports/simple-pdf/constants"

export interface LayoutContext {
  pages: string[][]
  pageIndex: number
  y: number
}

export function createInitialLayoutContext(): LayoutContext {
  return {
    pages: [[]],
    pageIndex: 0,
    y: PAGE_HEIGHT - MARGIN_TOP,
  }
}

export function addPage(context: LayoutContext): void {
  context.pages.push([])
  context.pageIndex = context.pages.length - 1
  context.y = PAGE_HEIGHT - MARGIN_TOP
}

export function addCommand(context: LayoutContext, command: string): void {
  context.pages[context.pageIndex].push(command)
}

export function ensureSpace(context: LayoutContext, requiredHeight: number): void {
  if (context.y - requiredHeight < MARGIN_BOTTOM) {
    addPage(context)
  }
}
