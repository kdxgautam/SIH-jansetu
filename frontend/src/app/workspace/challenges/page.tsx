import { WorkspaceHome } from "@/components/workspace-pages";
export default async function Page({ searchParams }: { searchParams: Promise<{ queue?: string }> }) {
  return <WorkspaceHome listOnly queue={(await searchParams).queue} />;
}
