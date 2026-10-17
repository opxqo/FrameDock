import { useState } from "react";
import { App, Modal, Tooltip } from "antd";
import { useTranslation } from "react-i18next";

import { SkillBook, X } from "@/components/icons";
import { SkillAttachButton, SkillBrowser } from "@/components/skills/skill-browser";
import type { CanvasSkill } from "@/lib/skills/skills";
import { cn } from "@/lib/utils";

// FrameDock: the skill capsule in a text node's parameter layer. Empty → "Skill" button; attached → skill
// name with a remove control. Picking opens the shared skill browser.
export function CanvasSkillPicker({ skill, onChange, compact = false }: { skill?: CanvasSkill; onChange: (skill: CanvasSkill | undefined) => void; compact?: boolean }) {
    const { t } = useTranslation();
    const { message } = App.useApp();
    const [open, setOpen] = useState(false);

    return (
        <>
            {skill ? (
                <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border border-foreground/30 bg-signal/10 pr-1", compact ? "h-6 max-w-[132px] pl-2 text-xs" : "h-8 max-w-[150px] pl-3 text-[13px]")}>
                    <SkillBook className={compact ? "size-3.5" : "size-4"} />
                    <button type="button" className="min-w-0 truncate" onClick={() => setOpen(true)} title={skill.title}>
                        {skill.title}
                    </button>
                    <Tooltip title={t("skills.detach")}>
                        <button type="button" className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" onClick={() => onChange(undefined)} aria-label={t("skills.detach")}>
                            <X className="size-3.5" />
                        </button>
                    </Tooltip>
                </span>
            ) : (
                <button type="button" className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border transition-colors hover:bg-accent", compact ? "h-6 px-2 text-xs" : "h-8 px-3 text-[13px]")} onClick={() => setOpen(true)}>
                    <SkillBook className={compact ? "size-3.5" : "size-4"} />
                    {t("skills.title")}
                </button>
            )}
            <Modal title={t("skills.pick")} open={open} onCancel={() => setOpen(false)} footer={null} width={960} centered destroyOnHidden>
                <SkillBrowser
                    className="h-[66dvh] pt-2"
                    renderAction={(resolve, ready) => (
                        <SkillAttachButton
                            resolve={resolve}
                            ready={ready}
                            onAttach={(next) => {
                                onChange(next);
                                setOpen(false);
                                message.success(t("skills.attached", { name: next.title }));
                            }}
                        />
                    )}
                />
            </Modal>
        </>
    );
}
