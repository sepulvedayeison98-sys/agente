import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { UserManager, type UserRow } from "./user-manager";

export default async function AdminUsuariosPage() {
  const session = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      active: true,
      _count: { select: { sales: true } },
    },
  });

  const rows: UserRow[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    active: user.active,
    sales: user._count.sales,
    isMe: user.id === session.userId,
  }));

  return <UserManager rows={rows} />;
}
