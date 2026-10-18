import { BookOpen, ImagePlus, Images, LayoutGrid, Video } from "@/components/icons";

// FrameDock: primary destinations. Settings and the rest live in the "more" menu and ⌘K.
export const navigationTools = [
    {
        slug: "canvas",
        icon: LayoutGrid,
    },
    {
        slug: "image",
        icon: ImagePlus,
    },
    {
        slug: "video",
        icon: Video,
    },
    {
        slug: "prompts",
        icon: BookOpen,
    },
    {
        slug: "assets",
        icon: Images,
    },
] as const;

export type NavigationToolSlug = (typeof navigationTools)[number]["slug"];
