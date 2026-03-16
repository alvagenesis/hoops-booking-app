const Skeleton = ({ className = '' }) => (
    <div className={`animate-pulse bg-gray-800/60 rounded ${className}`} />
);

export function SkeletonCard() {
    return (
        <div className="bg-[#111116] border border-gray-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
        </div>
    );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
    return (
        <div className="bg-[#111116] border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800">
                <Skeleton className="h-5 w-48" />
            </div>
            <div className="p-4 space-y-3">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                        {Array.from({ length: cols }).map((_, j) => (
                            <Skeleton key={j} className="h-4 flex-1" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function SkeletonStatRow({ count = 3 }) {
    return (
        <div className={`grid grid-cols-1 md:grid-cols-${count} gap-4`}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-[#111116] border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-6 w-16" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default Skeleton;
