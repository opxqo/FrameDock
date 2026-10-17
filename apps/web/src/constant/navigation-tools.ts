import { ImagePlus, Images, LayoutGrid, Video } from "lucide-react";

// FrameDock: four primary destinations. Prompts, settings and the rest live in the "more" menu and ⌘K.
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
        slug: "assets",
        icon: Images,
    },
] as const;

export type NavigationToolSlug = (typeof navigationTools)[number]["slug"];
