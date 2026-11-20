import { PageSkeleton } from "@/components/dashboard/skeletons";

/** Shown instantly on navigation inside the dashboard (the layout and menu stay mounted). */
export default function Loading() {
  return <PageSkeleton />;
}
