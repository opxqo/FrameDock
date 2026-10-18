export type ReferenceImage = {
    id: string;
    name: string;
    type: string;
    dataUrl: string;
    url?: string;
    storageKey?: string;
    /** FrameDock: the role set on the canvas connection this image came in on (video first/last frame, reference). */
    role?: "first" | "last" | "reference";
};
