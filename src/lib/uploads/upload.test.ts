import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { mkdirMock, writeFileMock, randomUUIDMock } = vi.hoisted(() => ({
  mkdirMock: vi.fn(),
  writeFileMock: vi.fn(),
  randomUUIDMock: vi.fn(),
}))

vi.mock("fs/promises", () => ({
  mkdir: mkdirMock,
  writeFile: writeFileMock,
}))

vi.mock("crypto", () => ({
  randomUUID: randomUUIDMock,
}))

import { saveUpload } from "@/lib/uploads/upload"

function createFileMock(options: { name: string; type: string; bytes: Uint8Array }): File {
  return {
    name: options.name,
    type: options.type,
    size: options.bytes.byteLength,
    arrayBuffer: async () =>
      options.bytes.buffer.slice(
        options.bytes.byteOffset,
        options.bytes.byteOffset + options.bytes.byteLength
      ),
  } as unknown as File
}

const originalUploadDir = process.env.UPLOAD_DIR

beforeEach(() => {
  mkdirMock.mockReset()
  writeFileMock.mockReset()
  randomUUIDMock.mockReset()
  randomUUIDMock.mockReturnValue("fixed-uuid")
  process.env.UPLOAD_DIR = "/tmp/test-uploads"
})

afterEach(() => {
  if (originalUploadDir === undefined) {
    delete process.env.UPLOAD_DIR
  } else {
    process.env.UPLOAD_DIR = originalUploadDir
  }
})

describe("saveUpload", () => {
  it("lehnt nicht erlaubte MIME-Typen ab", async () => {
    const file = createFileMock({
      name: "payload.exe",
      type: "application/x-msdownload",
      bytes: new Uint8Array([1, 2, 3]),
    })

    await expect(saveUpload(file)).rejects.toThrow("Dateityp nicht erlaubt")
    expect(mkdirMock).not.toHaveBeenCalled()
    expect(writeFileMock).not.toHaveBeenCalled()
  })

  it("lehnt Dateien ueber 10 MB ab", async () => {
    const file = createFileMock({
      name: "huge.pdf",
      type: "application/pdf",
      bytes: new Uint8Array(10 * 1024 * 1024 + 1),
    })

    await expect(saveUpload(file)).rejects.toThrow("Datei zu gross")
    expect(writeFileMock).not.toHaveBeenCalled()
  })

  it("speichert erlaubte Uploads mit UUID-Dateiname und Rueckgabedaten", async () => {
    const file = createFileMock({
      name: "report.jpg",
      type: "image/jpeg",
      bytes: new Uint8Array([0xff, 0xd8, 0xff]),
    })

    const result = await saveUpload(file)

    expect(mkdirMock).toHaveBeenCalledWith("/tmp/test-uploads", { recursive: true })
    expect(writeFileMock).toHaveBeenCalledTimes(1)
    expect(writeFileMock.mock.calls[0]?.[0]).toBe("/tmp/test-uploads/fixed-uuid.jpg")
    expect(Buffer.isBuffer(writeFileMock.mock.calls[0]?.[1])).toBe(true)
    expect(result).toEqual({
      filePath: "fixed-uuid.jpg",
      fileType: "IMAGE",
      originalName: "report.jpg",
    })
  })

  it("mappt PDF-Uploads auf fileType PDF und Dateiendung .pdf", async () => {
    const file = createFileMock({
      name: "result.pdf",
      type: "application/pdf",
      bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    })

    const result = await saveUpload(file)

    expect(writeFileMock.mock.calls[0]?.[0]).toBe("/tmp/test-uploads/fixed-uuid.pdf")
    expect(result.fileType).toBe("PDF")
  })
})
