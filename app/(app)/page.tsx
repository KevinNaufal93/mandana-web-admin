import { getCurrentUser } from "@/lib/auth/dal";

// Every page under (app) opens with this line. It is the render-time
// security boundary; proxy.ts is only the request-time pre-filter.
export default async function DashboardPage() {
  const user = await getCurrentUser();
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-primary">Halo, {user.name}</h1>
      <p className="text-sm text-muted-foreground">
        Selamat datang di panel admin Mandana Property.
      </p>
    </div>
  );
}
