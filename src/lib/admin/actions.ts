"use server"

import { getAdminSystemDisciplinesAction } from "@/lib/admin/actions/getAdminSystemDisciplines"
import { getAdminUserByIdAction, getAdminUsersAction } from "@/lib/admin/actions/getAdminUsers"
import {
  clearLoginRateLimitBucketAction,
  getAdminBlockedLoginRateLimitBucketsAction,
  getAdminLoginRateLimitInsightsAction,
} from "@/lib/admin/actions/loginRateLimit"
import {
  createUserAction,
  setUserActiveAction,
  updateUserAction,
} from "@/lib/admin/actions/userMutations"
import type {
  AdminActionResult,
  AdminLoginRateLimitBucket,
  AdminLoginRateLimitInsights,
  AdminSystemDisciplineSummary,
  AdminUserListItem,
  AdminUserSummary,
} from "@/lib/admin/types"

export type {
  AdminActionResult,
  AdminLoginRateLimitBucket,
  AdminLoginRateLimitInsights,
  AdminSystemDisciplineSummary,
  AdminUserListItem,
  AdminUserSummary,
} from "@/lib/admin/types"

// Öffentliche Admin-Fassade: UI ruft nur dieses Modul auf und bleibt von internen Action-Pfaden entkoppelt.
export async function getAdminUsers(): Promise<AdminUserListItem[]> {
  return getAdminUsersAction()
}

export async function getAdminUserById(userId: string): Promise<AdminUserSummary | null> {
  return getAdminUserByIdAction(userId)
}

export async function getAdminSystemDisciplines(): Promise<AdminSystemDisciplineSummary[]> {
  return getAdminSystemDisciplinesAction()
}

export async function getAdminBlockedLoginRateLimitBuckets(): Promise<AdminLoginRateLimitBucket[]> {
  return getAdminBlockedLoginRateLimitBucketsAction()
}

export async function getAdminLoginRateLimitInsights(): Promise<AdminLoginRateLimitInsights> {
  return getAdminLoginRateLimitInsightsAction()
}

export async function clearLoginRateLimitBucket(bucketKey: string): Promise<AdminActionResult> {
  return clearLoginRateLimitBucketAction(bucketKey)
}

export async function createUser(
  prevState: AdminActionResult | null,
  formData: FormData
): Promise<AdminActionResult> {
  return createUserAction(prevState, formData)
}

export async function setUserActive(
  userId: string,
  nextIsActive: boolean
): Promise<AdminActionResult> {
  return setUserActiveAction(userId, nextIsActive)
}

export async function updateUser(
  userId: string,
  prevState: AdminActionResult | null,
  formData: FormData
): Promise<AdminActionResult> {
  return updateUserAction(userId, prevState, formData)
}
