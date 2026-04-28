import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ok, unauthorized } from "@/app/api/_helpers";

export async function GET() {
  const session = await auth();
  if (!session) return unauthorized();

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, email: true, firstName: true, middleName: true, lastName: true,
      cellphone: true, sex: true, birthDate: true,
      purok: true, street: true, barangay: true, townCity: true, province: true, country: true,
    },
  });

  if (!user) return unauthorized();

  return ok({
    ...user,
    birthDate: user.birthDate?.toISOString() ?? null,
  });
}
