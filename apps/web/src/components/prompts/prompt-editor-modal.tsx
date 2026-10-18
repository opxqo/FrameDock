import { useEffect, useMemo } from "react";
import { App, Button, Form, Input, Modal, Select } from "antd";
import { useTranslation } from "react-i18next";

import { Copy, Trash2 } from "@/components/icons";
import { useCopyText } from "@/hooks/use-copy-text";
import { usePromptLibraryStore, type LibraryPrompt, type LibraryPromptDraft } from "@/stores/use-prompt-library-store";

type FormValues = { title: string; prompt: string; description?: string; tags?: string[]; coverUrl?: string };

/**
 * FrameDock: create or edit one of the user's own prompts. `prompt` undefined → closed; null → create
 * (optionally prefilled by `initial`); an item → edit, with copy and delete.
 */
export function PromptEditorModal({ prompt, initial, onClose }: { prompt: LibraryPrompt | null | undefined; initial?: Partial<LibraryPromptDraft>; onClose: () => void }) {
    const { t } = useTranslation();
    const { message, modal } = App.useApp();
    const copyText = useCopyText();
    const [form] = Form.useForm<FormValues>();
    const add = usePromptLibraryStore((state) => state.add);
    const update = usePromptLibraryStore((state) => state.update);
    const remove = usePromptLibraryStore((state) => state.remove);
    const items = usePromptLibraryStore((state) => state.items);
    const tagOptions = useMemo(() => Array.from(new Set(items.flatMap((item) => item.tags))).map((tag) => ({ value: tag, label: tag })), [items]);
    const open = prompt !== undefined;

    useEffect(() => {
        if (!open) return;
        const source = prompt || initial;
        form.setFieldsValue({ title: source?.title || "", prompt: source?.prompt || "", description: source?.description || "", tags: source?.tags || [], coverUrl: source?.coverUrl || "" });
    }, [form, initial, open, prompt]);

    const save = async () => {
        const values = await form.validateFields();
        const draft = { title: values.title.trim(), prompt: values.prompt, description: values.description?.trim() || "", tags: values.tags || [], coverUrl: values.coverUrl?.trim() || "" };
        if (prompt) update(prompt.id, draft);
        else add(draft);
        message.success(t(prompt ? "prompts.mine.updated" : "prompts.mine.created"));
        onClose();
    };

    const confirmRemove = () => {
        if (!prompt) return;
        modal.confirm({
            title: t("prompts.mine.deleteTitle", { name: prompt.title }),
            okText: t("common.delete"),
            okType: "danger",
            cancelText: t("common.cancel"),
            onOk: () => {
                remove(prompt.id);
                message.success(t("prompts.mine.deleted"));
                onClose();
            },
        });
    };

    return (
        <Modal
            title={t(prompt ? "prompts.mine.edit" : "prompts.mine.create")}
            open={open}
            width={720}
            onCancel={onClose}
            destroyOnHidden
            footer={
                <div className="flex items-center gap-2">
                    {prompt ? (
                        <>
                            <Button danger type="text" icon={<Trash2 className="size-4" />} onClick={confirmRemove}>
                                {t("common.delete")}
                            </Button>
                            <Button type="text" icon={<Copy className="size-4" />} onClick={() => copyText(form.getFieldValue("prompt") || "", t("common.promptCopied"))}>
                                {t("common.copy")}
                            </Button>
                        </>
                    ) : null}
                    <span className="flex-1" />
                    <Button onClick={onClose}>{t("common.cancel")}</Button>
                    <Button type="primary" onClick={() => void save()}>
                        {t("common.save")}
                    </Button>
                </div>
            }
        >
            <Form form={form} layout="vertical" requiredMark={false} className="pt-2">
                <Form.Item name="title" label={t("prompts.mine.fields.title")} rules={[{ required: true, whitespace: true, message: t("prompts.mine.fields.titleRequired") }]}>
                    <Input maxLength={80} />
                </Form.Item>
                <Form.Item name="prompt" label={t("prompts.mine.fields.prompt")} rules={[{ required: true, whitespace: true, message: t("prompts.mine.fields.promptRequired") }]}>
                    <Input.TextArea autoSize={{ minRows: 6, maxRows: 16 }} showCount />
                </Form.Item>
                <Form.Item name="description" label={t("prompts.mine.fields.description")}>
                    <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} />
                </Form.Item>
                <div className="grid gap-x-4 sm:grid-cols-2">
                    <Form.Item name="tags" label={t("prompts.mine.fields.tags")}>
                        <Select mode="tags" options={tagOptions} tokenSeparators={[",", "，"]} />
                    </Form.Item>
                    <Form.Item name="coverUrl" label={t("prompts.mine.fields.coverUrl")}>
                        <Input placeholder="https://" />
                    </Form.Item>
                </div>
            </Form>
        </Modal>
    );
}
