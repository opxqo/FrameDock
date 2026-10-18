import { useEffect } from "react";
import { App, Form, Input, Modal, Segmented } from "antd";
import { useTranslation } from "react-i18next";

import { MAX_SKILL_INSTRUCTIONS } from "@/lib/skills/skills";
import { LOCAL_SKILL_CATEGORIES, useSkillLibraryStore, type LocalSkill, type LocalSkillDraft } from "@/stores/use-skill-library-store";

type FormValues = LocalSkillDraft;

/** FrameDock: create or edit one of the user's own skills. `skill` undefined → closed; null → create; an item → edit. */
export function SkillEditorModal({ skill, onClose, onSaved }: { skill: LocalSkill | null | undefined; onClose: () => void; onSaved?: (id: string) => void }) {
    const { t } = useTranslation();
    const { message } = App.useApp();
    const [form] = Form.useForm<FormValues>();
    const add = useSkillLibraryStore((state) => state.add);
    const update = useSkillLibraryStore((state) => state.update);
    const open = skill !== undefined;

    useEffect(() => {
        if (open) form.setFieldsValue({ title: skill?.title || "", summary: skill?.summary || "", category: skill?.category || "text", instructions: skill?.instructions || "" });
    }, [form, open, skill]);

    const save = async () => {
        const values = await form.validateFields();
        const draft = { title: values.title.trim(), summary: values.summary?.trim() || "", category: values.category, instructions: values.instructions.trim() };
        let id = skill?.id;
        if (skill) update(skill.id, draft);
        else id = add(draft);
        message.success(t(skill ? "skills.mine.updated" : "skills.mine.created"));
        onClose();
        if (id) onSaved?.(id);
    };

    return (
        <Modal title={t(skill ? "skills.mine.edit" : "skills.mine.create")} open={open} width={760} onCancel={onClose} onOk={() => void save()} okText={t("common.save")} cancelText={t("common.cancel")} destroyOnHidden>
            <Form form={form} layout="vertical" requiredMark={false} className="pt-2">
                <div className="grid gap-x-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <Form.Item name="title" label={t("skills.mine.fields.title")} rules={[{ required: true, whitespace: true, message: t("skills.mine.fields.titleRequired") }]}>
                        <Input maxLength={60} />
                    </Form.Item>
                    <Form.Item name="category" label={t("skills.mine.fields.category")}>
                        <Segmented options={LOCAL_SKILL_CATEGORIES.map((value) => ({ value, label: t(`skills.categories.${value}`) }))} />
                    </Form.Item>
                </div>
                <Form.Item name="summary" label={t("skills.mine.fields.summary")}>
                    <Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} maxLength={200} />
                </Form.Item>
                <Form.Item name="instructions" label={t("skills.mine.fields.instructions")} extra={t("skills.mine.fields.instructionsHint")} rules={[{ required: true, whitespace: true, message: t("skills.mine.fields.instructionsRequired") }]}>
                    <Input.TextArea autoSize={{ minRows: 10, maxRows: 22 }} maxLength={MAX_SKILL_INSTRUCTIONS} showCount />
                </Form.Item>
            </Form>
        </Modal>
    );
}
