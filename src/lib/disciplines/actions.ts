"use server"

import type { Discipline } from "@/generated/prisma/client"
import { setFavouriteDisciplineAction } from "@/lib/disciplines/actions/favouriteDiscipline"
import {
  getDisciplineByIdAction,
  getDisciplineForDetailAction,
  getDisciplinesAction,
  getDisciplinesForManagementAction,
  getFavouriteDisciplineIdAction,
} from "@/lib/disciplines/actions/getDisciplines"
import {
  archiveDisciplineAction,
  createDisciplineAction,
  setDisciplineArchivedAction,
  updateDisciplineAction,
} from "@/lib/disciplines/actions/mutateDiscipline"
import type { ActionResult } from "@/lib/disciplines/types"

export type { ActionResult } from "@/lib/disciplines/types"

// Öffentliche Disziplin-Fassade hält Seiten/Komponenten frei von internen Action-Dateipfaden.
export async function getDisciplines(): Promise<Discipline[]> {
  return getDisciplinesAction()
}

export async function getDisciplinesForManagement(): Promise<Discipline[]> {
  return getDisciplinesForManagementAction()
}

export async function getDisciplineForDetail(id: string): Promise<Discipline | null> {
  return getDisciplineForDetailAction(id)
}

export async function getFavouriteDisciplineId(): Promise<string | null> {
  return getFavouriteDisciplineIdAction()
}

export async function setFavouriteDiscipline(disciplineId: string): Promise<ActionResult> {
  return setFavouriteDisciplineAction(disciplineId)
}

export async function createDiscipline(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return createDisciplineAction(prevState, formData)
}

export async function getDisciplineById(id: string): Promise<Discipline | null> {
  return getDisciplineByIdAction(id)
}

export async function updateDiscipline(
  id: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return updateDisciplineAction(id, prevState, formData)
}

export async function archiveDiscipline(id: string): Promise<ActionResult> {
  return archiveDisciplineAction(id)
}

export async function setDisciplineArchived(
  id: string,
  nextArchived: boolean
): Promise<ActionResult> {
  return setDisciplineArchivedAction(id, nextArchived)
}
