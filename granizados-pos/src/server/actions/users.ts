"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import type { Role } from "@/generated/prisma/enums";
import {
  changePin as changePinCore,
  createUser as createUserCore,
  setUserActive as setUserActiveCore,
  updateUser as updateUserCore,
  type UserResult,
} from "@/server/users";

function done() {
  revalidatePath("/admin/usuarios");
}

export async function createUser(input: {
  name: string;
  username: string;
  pin: string;
  role: Role;
}): Promise<UserResult> {
  const session = await requireAdmin();
  const result = await createUserCore(session, input);
  if (result.ok) done();
  return result;
}

export async function updateUser(input: {
  userId: string;
  name: string;
  role: Role;
}): Promise<UserResult> {
  const session = await requireAdmin();
  const result = await updateUserCore(session, input);
  if (result.ok) done();
  return result;
}

export async function changePin(input: {
  userId: string;
  pin: string;
}): Promise<UserResult> {
  const session = await requireAdmin();
  const result = await changePinCore(session, input);
  if (result.ok) done();
  return result;
}

export async function setUserActive(input: {
  userId: string;
  active: boolean;
}): Promise<UserResult> {
  const session = await requireAdmin();
  const result = await setUserActiveCore(session, input);
  if (result.ok) done();
  return result;
}
