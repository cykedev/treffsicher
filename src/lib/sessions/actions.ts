"use server"

import {
  createSessionAction,
  deleteSessionAction,
  getSessionByIdAction,
  getSessionsAction,
  toggleFavouriteAction,
  updateSessionAction,
} from "@/lib/sessions/actions/sessionActions"
import { previewMeytonImportAction } from "@/lib/sessions/actions/meytonActions"
import {
  uploadAttachmentAction,
  deleteAttachmentAction,
} from "@/lib/sessions/actions/attachmentActions"
import {
  saveFeedbackAction,
  savePrognosisAction,
  saveReflectionAction,
  saveWellbeingAction,
} from "@/lib/sessions/actions/mentalActions"
import type {
  ActionResult,
  MeytonImportPreviewResult,
  SessionDetail,
  SessionWithDiscipline,
} from "@/lib/sessions/actions/types"

export type {
  ActionResult,
  MeytonImportPreview,
  MeytonImportPreviewHitLocation,
  MeytonImportPreviewResult,
  MeytonImportPreviewSeries,
  SerializedPrognosis,
  SerializedSeries,
  SessionDetail,
  SessionGoalSummary,
  SessionWithDiscipline,
} from "@/lib/sessions/actions/types"

export async function createSession(formData: FormData): Promise<ActionResult> {
  return createSessionAction(formData)
}

export async function previewMeytonImport(formData: FormData): Promise<MeytonImportPreviewResult> {
  return previewMeytonImportAction(formData)
}

export async function getSessionById(id: string): Promise<SessionDetail | null> {
  return getSessionByIdAction(id)
}

export async function getSessions(): Promise<SessionWithDiscipline[]> {
  return getSessionsAction()
}

export async function uploadAttachment(
  sessionId: string,
  formData: FormData
): Promise<ActionResult> {
  return uploadAttachmentAction(sessionId, formData)
}

export async function deleteAttachment(attachmentId: string): Promise<ActionResult> {
  return deleteAttachmentAction(attachmentId)
}

export async function updateSession(id: string, formData: FormData): Promise<ActionResult> {
  return updateSessionAction(id, formData)
}

export async function toggleFavourite(sessionId: string): Promise<void> {
  return toggleFavouriteAction(sessionId)
}

export async function deleteSession(id: string): Promise<ActionResult> {
  return deleteSessionAction(id)
}

export async function saveWellbeing(
  sessionId: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return saveWellbeingAction(sessionId, prevState, formData)
}

export async function saveReflection(
  sessionId: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return saveReflectionAction(sessionId, prevState, formData)
}

export async function savePrognosis(
  sessionId: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return savePrognosisAction(sessionId, prevState, formData)
}

export async function saveFeedback(
  sessionId: string,
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  return saveFeedbackAction(sessionId, prevState, formData)
}
