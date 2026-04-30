/**
 * Admin: Audit Logs API
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getPaginationOffset, buildPaginationMeta } from "@/lib/utils";
import { requireAdmin, ok } from "@/app/api/_helpers";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("status" in guard) return guard;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "30", 10);
  const search = searchParams.get("search");
  const action = searchParams.get("action");
  const entityType = searchParams.get("entityType");
  const performedBy = searchParams.get("performedBy");
  const targetUserId = searchParams.get("targetUserId");

  const { skip, take } = getPaginationOffset(page, limit);

  const where: any = {
    ...(action && { action }),
    ...(entityType && { entityType }),
    ...(performedBy && { performedBy }),
    ...(targetUserId && { targetUserId }),
  };

  if (search) {
    where.OR = [
      { description: { contains: search, mode: "insensitive" as const } },
      { entityType: { contains: search, mode: "insensitive" as const } },
      { action: { contains: search, mode: "insensitive" as const } },
    ];
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: {
        performer: {
          select: { firstName: true, lastName: true, email: true, role: true },
        },
        targetUser: {
          select: { firstName: true, lastName: true, email: true },
        },
        loan: { select: { loanNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.auditLog.count({ where }),
  ]);

  return ok({ data: logs, pagination: buildPaginationMeta(total, page, limit) });
}
