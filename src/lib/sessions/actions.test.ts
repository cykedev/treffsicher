import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  createSessionActionMock,
  deleteSessionActionMock,
  getSessionByIdActionMock,
  getSessionsActionMock,
  toggleFavouriteActionMock,
  updateSessionActionMock,
  previewMeytonImportActionMock,
  uploadAttachmentActionMock,
  deleteAttachmentActionMock,
  saveFeedbackActionMock,
  savePrognosisActionMock,
  saveReflectionActionMock,
  saveWellbeingActionMock,
} = vi.hoisted(() => ({
  createSessionActionMock: vi.fn(),
  deleteSessionActionMock: vi.fn(),
  getSessionByIdActionMock: vi.fn(),
  getSessionsActionMock: vi.fn(),
  toggleFavouriteActionMock: vi.fn(),
  updateSessionActionMock: vi.fn(),
  previewMeytonImportActionMock: vi.fn(),
  uploadAttachmentActionMock: vi.fn(),
  deleteAttachmentActionMock: vi.fn(),
  saveFeedbackActionMock: vi.fn(),
  savePrognosisActionMock: vi.fn(),
  saveReflectionActionMock: vi.fn(),
  saveWellbeingActionMock: vi.fn(),
}))

vi.mock("@/lib/sessions/actions/sessionActions", () => ({
  createSessionAction: createSessionActionMock,
  deleteSessionAction: deleteSessionActionMock,
  getSessionByIdAction: getSessionByIdActionMock,
  getSessionsAction: getSessionsActionMock,
  toggleFavouriteAction: toggleFavouriteActionMock,
  updateSessionAction: updateSessionActionMock,
}))

vi.mock("@/lib/sessions/actions/meytonActions", () => ({
  previewMeytonImportAction: previewMeytonImportActionMock,
}))

vi.mock("@/lib/sessions/actions/attachmentActions", () => ({
  uploadAttachmentAction: uploadAttachmentActionMock,
  deleteAttachmentAction: deleteAttachmentActionMock,
}))

vi.mock("@/lib/sessions/actions/mentalActions", () => ({
  saveFeedbackAction: saveFeedbackActionMock,
  savePrognosisAction: savePrognosisActionMock,
  saveReflectionAction: saveReflectionActionMock,
  saveWellbeingAction: saveWellbeingActionMock,
}))

import {
  createSession,
  deleteAttachment,
  deleteSession,
  getSessionById,
  getSessions,
  previewMeytonImport,
  saveFeedback,
  savePrognosis,
  saveReflection,
  saveWellbeing,
  toggleFavourite,
  updateSession,
  uploadAttachment,
} from "@/lib/sessions/actions"

describe("sessions actions facade", () => {
  beforeEach(() => {
    createSessionActionMock.mockReset()
    deleteSessionActionMock.mockReset()
    getSessionByIdActionMock.mockReset()
    getSessionsActionMock.mockReset()
    toggleFavouriteActionMock.mockReset()
    updateSessionActionMock.mockReset()
    previewMeytonImportActionMock.mockReset()
    uploadAttachmentActionMock.mockReset()
    deleteAttachmentActionMock.mockReset()
    saveFeedbackActionMock.mockReset()
    savePrognosisActionMock.mockReset()
    saveReflectionActionMock.mockReset()
    saveWellbeingActionMock.mockReset()
  })

  it("delegiert alle Query-Funktionen", async () => {
    getSessionsActionMock.mockResolvedValue([{ id: "s1" }])
    getSessionByIdActionMock.mockResolvedValue({ id: "s2" })

    expect(await getSessions()).toEqual([{ id: "s1" }])
    expect(await getSessionById("s2")).toEqual({ id: "s2" })
  })

  it("delegiert Session-/Attachment-/Meyton-Mutationen", async () => {
    const formData = new FormData()
    createSessionActionMock.mockResolvedValue({ success: true })
    updateSessionActionMock.mockResolvedValue({ success: true })
    deleteSessionActionMock.mockResolvedValue({ success: true })
    previewMeytonImportActionMock.mockResolvedValue({ data: { series: [] } })
    uploadAttachmentActionMock.mockResolvedValue({ success: true })
    deleteAttachmentActionMock.mockResolvedValue({ success: true })
    toggleFavouriteActionMock.mockResolvedValue(undefined)

    expect(await createSession(formData)).toEqual({ success: true })
    expect(await updateSession("s1", formData)).toEqual({ success: true })
    expect(await deleteSession("s1")).toEqual({ success: true })
    expect(await previewMeytonImport(formData)).toEqual({ data: { series: [] } })
    expect(await uploadAttachment("s1", formData)).toEqual({ success: true })
    expect(await deleteAttachment("a1")).toEqual({ success: true })
    await toggleFavourite("s1")
  })

  it("delegiert mentale Teilbereiche mit unveraenderten Parametern", async () => {
    const formData = new FormData()
    saveWellbeingActionMock.mockResolvedValue({ success: true })
    saveReflectionActionMock.mockResolvedValue({ success: true })
    savePrognosisActionMock.mockResolvedValue({ success: true })
    saveFeedbackActionMock.mockResolvedValue({ success: true })

    expect(await saveWellbeing("s1", null, formData)).toEqual({ success: true })
    expect(await saveReflection("s1", null, formData)).toEqual({ success: true })
    expect(await savePrognosis("s1", null, formData)).toEqual({ success: true })
    expect(await saveFeedback("s1", null, formData)).toEqual({ success: true })

    expect(saveWellbeingActionMock).toHaveBeenCalledWith("s1", null, formData)
    expect(saveReflectionActionMock).toHaveBeenCalledWith("s1", null, formData)
    expect(savePrognosisActionMock).toHaveBeenCalledWith("s1", null, formData)
    expect(saveFeedbackActionMock).toHaveBeenCalledWith("s1", null, formData)
  })
})
