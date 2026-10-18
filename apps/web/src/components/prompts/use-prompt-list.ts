import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { ALL_PROMPTS_OPTION, fetchPrompts } from "@/services/api/prompts";
import { usePromptLibraryStore } from "@/stores/use-prompt-library-store";

export const PROMPT_PAGE_SIZE = 20;

// A cheap query-key stamp per library snapshot (zustand replaces the array on every edit).
const libraryVersions = new WeakMap<object, number>();
let nextLibraryVersion = 0;
function libraryVersion(items: object | null) {
    if (!items) return 0;
    if (!libraryVersions.has(items)) libraryVersions.set(items, ++nextLibraryVersion);
    return libraryVersions.get(items)!;
}

export function usePromptList({ keyword, tags, category, enabled = true, includeLocal = true }: { keyword: string; tags: string[]; category: string; enabled?: boolean; includeLocal?: boolean }) {
    // The user's own prompts are merged in by fetchPrompts; keying on the store keeps the list fresh after edits.
    const library = usePromptLibraryStore((state) => (includeLocal ? state.items : null));
    const [debouncedKeyword, setDebouncedKeyword] = useState(keyword);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedKeyword(keyword), 300);
        return () => clearTimeout(timer);
    }, [keyword]);
    const query = useInfiniteQuery({
        queryKey: ["prompts", debouncedKeyword, tags, category, includeLocal, libraryVersion(library)],
        queryFn: ({ pageParam }) => fetchPrompts({ keyword: debouncedKeyword, tag: tags, category, page: pageParam, pageSize: PROMPT_PAGE_SIZE, includeLocal }),
        initialPageParam: 1,
        getNextPageParam: (lastPage, pages) => (pages.reduce((total, page) => total + page.items.length, 0) < lastPage.total ? pages.length + 1 : undefined),
        enabled,
    });
    const firstPage = query.data?.pages[0];
    return {
        query,
        items: useMemo(() => query.data?.pages.flatMap((page) => page.items) || [], [query.data?.pages]),
        tags: useMemo(() => [ALL_PROMPTS_OPTION, ...(firstPage?.tags || [])], [firstPage?.tags]),
        categories: useMemo(() => [ALL_PROMPTS_OPTION, ...(firstPage?.categories || [])], [firstPage?.categories]),
        total: firstPage?.total || 0,
    };
}
