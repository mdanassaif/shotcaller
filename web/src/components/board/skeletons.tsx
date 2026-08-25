import { Skeleton } from "@/components/ui/skeleton";

export function BoardSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1360px] grid-cols-1 items-start gap-7 px-6 py-7 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((col) => (
        <div key={col} className="min-w-0">
          <div className="mb-3 flex items-center gap-2 border-b pb-2.5">
            <Skeleton className="size-2 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="ml-auto h-3.5 w-8 rounded-md" />
          </div>
          {col === 1 ? (
            <div className="space-y-2">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg opacity-60" />
            </div>
          ) : (
            <Skeleton className="h-10 rounded-lg opacity-40" />
          )}
        </div>
      ))}
    </div>
  );
}
