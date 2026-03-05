import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  getAdminSystemDisciplinesActionMock,
  getAdminUsersActionMock,
  getAdminUserByIdActionMock,
  clearLoginRateLimitBucketActionMock,
  getAdminBlockedLoginRateLimitBucketsActionMock,
  getAdminLoginRateLimitInsightsActionMock,
  createUserActionMock,
  setUserActiveActionMock,
  updateUserActionMock,
} = vi.hoisted(() => ({
  getAdminSystemDisciplinesActionMock: vi.fn(),
  getAdminUsersActionMock: vi.fn(),
  getAdminUserByIdActionMock: vi.fn(),
  clearLoginRateLimitBucketActionMock: vi.fn(),
  getAdminBlockedLoginRateLimitBucketsActionMock: vi.fn(),
  getAdminLoginRateLimitInsightsActionMock: vi.fn(),
  createUserActionMock: vi.fn(),
  setUserActiveActionMock: vi.fn(),
  updateUserActionMock: vi.fn(),
}))

vi.mock("@/lib/admin/actions/getAdminSystemDisciplines", () => ({
  getAdminSystemDisciplinesAction: getAdminSystemDisciplinesActionMock,
}))

vi.mock("@/lib/admin/actions/getAdminUsers", () => ({
  getAdminUsersAction: getAdminUsersActionMock,
  getAdminUserByIdAction: getAdminUserByIdActionMock,
}))

vi.mock("@/lib/admin/actions/loginRateLimit", () => ({
  clearLoginRateLimitBucketAction: clearLoginRateLimitBucketActionMock,
  getAdminBlockedLoginRateLimitBucketsAction: getAdminBlockedLoginRateLimitBucketsActionMock,
  getAdminLoginRateLimitInsightsAction: getAdminLoginRateLimitInsightsActionMock,
}))

vi.mock("@/lib/admin/actions/userMutations", () => ({
  createUserAction: createUserActionMock,
  setUserActiveAction: setUserActiveActionMock,
  updateUserAction: updateUserActionMock,
}))

import {
  clearLoginRateLimitBucket,
  createUser,
  getAdminBlockedLoginRateLimitBuckets,
  getAdminLoginRateLimitInsights,
  getAdminSystemDisciplines,
  getAdminUserById,
  getAdminUsers,
  setUserActive,
  updateUser,
} from "@/lib/admin/actions"

describe("admin actions facade", () => {
  beforeEach(() => {
    getAdminSystemDisciplinesActionMock.mockReset()
    getAdminUsersActionMock.mockReset()
    getAdminUserByIdActionMock.mockReset()
    clearLoginRateLimitBucketActionMock.mockReset()
    getAdminBlockedLoginRateLimitBucketsActionMock.mockReset()
    getAdminLoginRateLimitInsightsActionMock.mockReset()
    createUserActionMock.mockReset()
    setUserActiveActionMock.mockReset()
    updateUserActionMock.mockReset()
  })

  it("delegiert lesende Funktionen", async () => {
    getAdminUsersActionMock.mockResolvedValue([{ id: "u1" }])
    getAdminUserByIdActionMock.mockResolvedValue({ id: "u2" })
    getAdminSystemDisciplinesActionMock.mockResolvedValue([{ id: "d1" }])
    getAdminBlockedLoginRateLimitBucketsActionMock.mockResolvedValue([{ key: "k1" }])
    getAdminLoginRateLimitInsightsActionMock.mockResolvedValue({ blocked: 1 })

    expect(await getAdminUsers()).toEqual([{ id: "u1" }])
    expect(await getAdminUserById("u2")).toEqual({ id: "u2" })
    expect(await getAdminSystemDisciplines()).toEqual([{ id: "d1" }])
    expect(await getAdminBlockedLoginRateLimitBuckets()).toEqual([{ key: "k1" }])
    expect(await getAdminLoginRateLimitInsights()).toEqual({ blocked: 1 })
    expect(getAdminUserByIdActionMock).toHaveBeenCalledWith("u2")
  })

  it("delegiert mutierende Funktionen mit unveraenderten Parametern", async () => {
    const formData = new FormData()
    formData.set("email", "user@example.com")
    createUserActionMock.mockResolvedValue({ success: true })
    setUserActiveActionMock.mockResolvedValue({ success: true })
    updateUserActionMock.mockResolvedValue({ success: true })
    clearLoginRateLimitBucketActionMock.mockResolvedValue({ success: true })

    expect(await createUser(null, formData)).toEqual({ success: true })
    expect(await setUserActive("user-1", false)).toEqual({ success: true })
    expect(await updateUser("user-1", null, formData)).toEqual({ success: true })
    expect(await clearLoginRateLimitBucket("email:user@example.com")).toEqual({ success: true })

    expect(createUserActionMock).toHaveBeenCalledWith(null, formData)
    expect(setUserActiveActionMock).toHaveBeenCalledWith("user-1", false)
    expect(updateUserActionMock).toHaveBeenCalledWith("user-1", null, formData)
    expect(clearLoginRateLimitBucketActionMock).toHaveBeenCalledWith("email:user@example.com")
  })
})
