import { useState } from "react";
import { App, Modal, Tooltip } from "antd";
import { useTranslation } from "react-i18next";

import { SkillBook, X } from "@/components/icons";
import { SkillAttachButton, SkillBrowser } from "@/components/skills/skill-browser";
import type { CanvasSkill } from "@/lib/skills/skills";

// FrameDock: the skill capsule in a text node's parameter layer. Empty → "Skill" button; attached → skill
// name with a remove control. Picking opens the shared skill browser.
export function CanvasSkillPicker({ skill, onChange }: { skill?: CanvasSkill; onChange: (skill: CanvasSkill | undefined) => void }) {
    const { t } = useTranslation();
    const { message } = App.useApp();
    const [open, setOpen] = useState(false);

    return (
        <>
            {skill ? (
                <span className="inline-flex h-8 max-w-[150px] shrink-0 items-center gap-1.5 rounded-full border border-foreground/30 bg-signal/10 pl-3 pr-1 text-[13px]">
                    <SkillBook className="size-4" />
                    <button type="button" className="min-w-0 truncate" onClick={() => setOpen(true)} title={skill.title}>
                        {skill.title}
                    </button>
                    <Tooltip title={t("skills.detach")}>
                        <button type="button" className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" onClick={() => onChange(undefined)} aria-label={t("skills.detach")}>
                            <X className="size-3.5" />
                        </button>
                    </Tooltip>
                </span>
            ) : (
                <button type="button" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-[13px] transition-colors hover:bg-accent" onClick={() => setOpen(true)}>
                    <SkillBook className="size-4" />
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
