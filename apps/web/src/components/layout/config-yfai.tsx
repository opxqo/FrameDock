import { useEffect, useRef, useState } from "react";
import { App, Button, Drawer, Input, Segmented, Switch, Tag } from "antd";
import { useTranslation } from "react-i18next";
import { ExternalLink, RefreshCw, Search } from "@/components/icons";
import { ModelIcon, resolveModelVendor } from "@/components/model-picker";
import { ModelPrice } from "@/components/autodl-price";
import { YfaiParameters } from "@/components/yfai-parameters";
import { YFAI_DOCS_URL, YFAI_SNAPSHOT_AT, yfaiCapability, yfaiModels, yfaiToolOnly, parseYfaiParams, type YfaiModel, resolveYfaiAutoParams } from "@/lib/yfai-catalog";
import { buildYfaiParams, fetchYfaiPrices, fetchYfaiCatalog, submitYfaiTask, waitYfaiTask, yfaiRouting, yfaiRequest, yfaiTaskUrls, type YfaiTask } from "@/services/api/yfai";
import { useConfigStore, withYfaiConfig, withLocalProxy, type AiConfig } from "@/stores/use-config-store";

export function ConfigYfai({ config, onConfigChange, onOpenPanel }: { config: AiConfig; onConfigChange: (config: AiConfig) => void; /** FrameDock: opens the YFAI settings section, where the model list now lives. */ onOpenPanel?: () => void }) {
    const { t, i18n } = useTranslation();
    const { message } = App.useApp();
    const [syncing, setSyncing] = useState(false);
    const apiKey = config.channels.find((channel) => channel.id === "yfai")?.apiKey || "";
    const models = yfaiModels(config.yfaiModels);
    const isEnabled = (model: YfaiModel) => model.available !== false && !yfaiToolOnly(model) && config.yfaiEnabledModels.includes(model.id);
    const sync = async () => {
        setSyncing(true);
        try {
            // /skills/models is public. /models authenticates the supplied key without generating anything.
            const [catalog] = await Promise.all([fetchYfaiCatalog(), yfaiRequest("/v1/models", apiKey)]);
            const prices = await fetchYfaiPrices(apiKey, catalog).catch(() => null);
            const latest = useConfigStore.getState().config;
            if (latest.channels.find((channel) => channel.id === "yfai")?.apiKey !== apiKey) return;
            const known = new Set(models.map((model) => model.id));
            const enabled = [...latest.yfaiEnabledModels.filter((name) => catalog.some((model) => model.id === name && !model.deprecated)), ...catalog.filter((model) => !model.deprecated && model.available !== false && !known.has(model.id)).map((model) => model.id)];
            onConfigChange({ ...withYfaiConfig(latest, { catalog, enabled, syncedAt: new Date().toISOString() }), ...(prices ? { yfaiPrices: prices } : {}) });
            if (!prices) message.warning(t("yfai.pricesUnavailable"));
            message.success(t("yfai.synced", { count: catalog.filter((model) => !model.deprecated).length }));
        } catch (error) { message.error(error instanceof Error ? error.message : t("yfai.requestFailed")); }
        finally { setSyncing(false); }
    };
    const formatTime = (value: string) => new Date(value).toLocaleString(i18n.resolvedLanguage, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

    // Match the existing AutoDL.Art provider panel, including its row density and control order.
    return (
        <div className="mb-5 rounded-lg border border-stone-200 dark:border-stone-800">
            <div className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            YFAI
                            {!apiKey ? <Tag className="!m-0">{t("yfai.noKey")}</Tag> : config.yfaiSyncedAt ? <Tag color="green" className="!m-0">{t("yfai.synced", { count: models.length })} · {formatTime(config.yfaiSyncedAt)}</Tag> : <Tag color="gold" className="!m-0">{t("yfai.notSynced")}</Tag>}
                        </div>
                        <div className="mt-1 text-xs text-stone-500">{t("yfai.description")} {t("yfai.updated", { date: formatTime(config.yfaiSyncedAt || YFAI_SNAPSHOT_AT) })}</div>
                    </div>
                    <a href={YFAI_DOCS_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs">
                        {t("yfai.docs")} <ExternalLink className="size-3" />
                    </a>
                </div>
                <div className="flex gap-2">
                    <Input.Password aria-label="YFAI API Key" value={apiKey} placeholder="YFAI API Key" disabled={syncing} onChange={(event) => onConfigChange(withYfaiConfig(config, { apiKey: event.target.value.trim() }))} autoComplete="off" />
                    <Button type="primary" icon={<RefreshCw className="size-4" />} loading={syncing} disabled={!apiKey} onClick={() => void sync()}>
                        {t("yfai.sync")}
                    </Button>
                </div>
            </div>
            <div className="flex items-center gap-1.5 border-t border-stone-200 px-4 py-2.5 text-sm dark:border-stone-800">
                <span className="font-medium">{t("yfai.modelList")}</span>
                <span className="text-xs text-stone-500">{t("yfai.enabledCount", { count: models.filter(isEnabled).length, total: models.length })}</span>
                {onOpenPanel ? (
                    <Button size="small" type="link" className="!ml-auto" onClick={onOpenPanel}>
                        {t("yfaiPanel.open")}
                    </Button>
                ) : null}
            </div>
        </div>
    );
}

/** FrameDock: the YFAI model list (enable, default, price, try-out tool), shown in the YFAI settings section. */
export function YfaiModelList({ config, onConfigChange }: { config: AiConfig; onConfigChange: (config: AiConfig) => void }) {
    const { t, i18n } = useTranslation();
    const [category, setCategory] = useState("text");
    const [keyword, setKeyword] = useState("");
    const [tool, setTool] = useState<YfaiModel>();
    const models = yfaiModels(config.yfaiModels);
    const visible = models.filter((model) => yfaiCapability(model) === category && `${model.id} ${model.display_name} ${model.display_name_en}`.toLowerCase().includes(keyword.toLowerCase()));
    const groups = new Map<string, YfaiModel[]>();
    visible.forEach((model) => {
        const vendor = resolveModelVendor(model.id);
        groups.set(vendor, [...(groups.get(vendor) || []), model]);
    });
    const isEnabled = (model: YfaiModel) => model.available !== false && !yfaiToolOnly(model) && config.yfaiEnabledModels.includes(model.id);
    const canEnable = (model: YfaiModel) => model.available !== false && !yfaiToolOnly(model);
    const modelKey = { text: "textModel", image: "imageModel", video: "videoModel", audio: "audioModel" }[category] as "textModel" | "imageModel" | "videoModel" | "audioModel";
    const setEnabled = (items: YfaiModel[], on: boolean) => {
        const names = items.filter(canEnable).map((model) => model.id);
        onConfigChange(withYfaiConfig(config, { enabled: on ? [...new Set([...config.yfaiEnabledModels, ...names])] : config.yfaiEnabledModels.filter((name) => !names.includes(name)) }));
    };
    return (
        <div>
            <div className="mb-3 flex items-center gap-2">
                <Segmented size="small" value={category} onChange={setCategory} options={["text", "image", "video", "audio"].map((value) => {
                    const all = models.filter((model) => yfaiCapability(model) === value);
                    return { value, label: `${t(`yfai.categories.${value}`)} ${all.filter(isEnabled).length}/${all.length}` };
                })} />
                <Input size="small" allowClear prefix={<Search className="size-3.5 opacity-50" />} aria-label={t("yfai.search")} placeholder={t("yfai.searchShort")} value={keyword} onChange={(event) => setKeyword(event.target.value)} className="!min-w-24 !w-32 !flex-1" />
                <div className="ml-auto flex shrink-0 gap-1">
                    <Button size="small" disabled={!visible.some(canEnable)} onClick={() => setEnabled(visible, true)}>{t("yfai.enableAll")}</Button>
                    <Button size="small" disabled={!visible.some(canEnable)} onClick={() => setEnabled(visible, false)}>{t("yfai.disableAll")}</Button>
                </div>
            </div>
            {groups.size ? (
                <div className="max-h-[52vh] overflow-y-auto rounded-md border border-stone-200 dark:border-stone-800">
                    {Array.from(groups, ([vendor, items]) => (
                        <div key={vendor}>
                            <div className="sticky top-0 z-10 bg-stone-50 px-3 py-1 text-xs text-stone-500 dark:bg-stone-900">{vendor}</div>
                            {items.map((model) => {
                                const on = isEnabled(model);
                                const optionValue = `yfai::${model.id}`;
                                const isDefault = on && config[modelKey] === optionValue;
                                const label = i18n.resolvedLanguage?.startsWith("en") ? model.display_name_en || model.display_name : model.display_name;
                                return (
                                    <div key={model.id} className="flex items-center gap-2 border-t border-stone-100 px-3 py-1.5 first:border-t-0 dark:border-stone-800/60">
                                        <ModelIcon model={optionValue} />
                                        <button type="button" className={`min-w-0 flex-1 truncate text-left text-sm ${on || yfaiToolOnly(model) ? "" : "opacity-50"}`} title={`${model.id} · ${t("yfai.openTool")}`} disabled={model.available === false} onClick={() => setTool(model)}>{label}</button>
                                        <ModelPrice model={optionValue} className="text-xs text-stone-500" />
                                        {model.available === false ? <Tag color="orange" className="!m-0 shrink-0">{t("yfai.unavailable")}</Tag> : yfaiToolOnly(model) ? (
                                            <Button size="small" type="link" className="!px-1" onClick={() => setTool(model)}>{t("yfai.openTool")}</Button>
                                        ) : isDefault ? (
                                            <Tag color="green" className="!m-0 shrink-0">{t("yfai.default")}</Tag>
                                        ) : on ? (
                                            <Button size="small" type="link" className="!px-1" onClick={() => onConfigChange({ ...config, [modelKey]: optionValue, ...(category === "image" ? { model: optionValue } : {}) })}>{t("yfai.setDefault")}</Button>
                                        ) : null}
                                        <Switch size="small" aria-label={`${t("yfai.enable")} ${model.id}`} disabled={!canEnable(model)} checked={on} onChange={(checked) => setEnabled([model], checked)} />
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-md border border-dashed border-stone-200 px-3 py-6 text-center text-xs text-stone-500 dark:border-stone-800">{t("yfai.noMatch")}</div>
            )}
            <Drawer title={tool?.display_name} open={Boolean(tool)} width={540} onClose={() => setTool(undefined)} destroyOnHidden>{tool ? <YfaiTool key={tool.id} model={tool} config={config} /> : null}</Drawer>
        </div>
    );
}

function YfaiTool({ model, config }: { model: YfaiModel; config: AiConfig }) {
    const { t } = useTranslation();
    const [params, setParams] = useState(config.yfaiParams);
    const [prompt, setPrompt] = useState("");
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<YfaiTask>();
    const [error, setError] = useState("");
    const [taskId, setTaskId] = useState("");
    const controller = useRef<AbortController | null>(null);
    useEffect(() => () => controller.current?.abort(), []);
    const toolModel: YfaiModel = model.id === "voice-clone" ? { ...model, param_schema: { sample_url: model.param_schema.sample_url, name: { type: "string", required: true, label: { zh: "音色名称", en: "Voice name" } }, preview_text: model.param_schema.preview_text } } : model;
    const selected = { ...config, model: `yfai::${model.id}`, apiKey: config.channels.find((channel) => channel.id === "yfai")?.apiKey || "", yfaiParams: params };
    const execute = async () => {
        setRunning(true); setError(""); setResult(undefined);
        const abort = new AbortController(); controller.current = abort;
        try {
            let created: YfaiTask;
            if (taskId) created = { task_id: taskId, is_final: false };
            else if (model.category === "chat") {
                const completion = await yfaiRequest("/v1/chat/completions", selected.apiKey, { model: model.id, messages: [{ role: "user", content: prompt }], ...buildYfaiParams(selected, model), ...yfaiRouting(selected, model), stream: false }, { signal: abort.signal });
                setResult(completion); return;
            }
            else if (model.id === "voice-clone") {
                const values = parseYfaiParams(params, model.id);
                if (!values.sample_url || !values.name) throw new Error(t("yfai.cloneRequired"));
                const response = await fetch(withLocalProxy(String(values.sample_url)), { signal: abort.signal });
                if (!response.ok) throw new Error(t("yfai.uploadFailed"));
                const blob = await response.blob();
                const form = new FormData(); form.append("file", blob, `voice.${blob.type.includes("wav") ? "wav" : blob.type.includes("mp4") ? "m4a" : "mp3"}`); form.append("model", "speech-2.8"); form.append("name", String(values.name));
                if (values.preview_text) form.append("preview_text", String(values.preview_text));
                created = await yfaiRequest("/v1/audio/voices", selected.apiKey, form, { signal: abort.signal });
                created.voice_id = created.id; setResult(created);
            } else created = await submitYfaiTask(selected, model, prompt, resolveYfaiAutoParams(model, buildYfaiParams(selected, model), selected), { signal: abort.signal });
            if (created.task_id) setTaskId(created.task_id);
            const finished = await waitYfaiTask(selected.apiKey, created, { signal: abort.signal });
            setResult((previous) => ({ ...previous, ...finished })); setTaskId("");
        } catch (caught) { setError(abort.signal.aborted ? t("yfai.pollStopped") : caught instanceof Error ? caught.message : t("yfai.requestFailed")); }
        finally { setRunning(false); }
    };
    const urls = result ? [...new Set(["images", "videos", "audios"].flatMap((kind) => yfaiTaskUrls(result, kind as "images" | "videos" | "audios")))] : [];
    return <div className="space-y-4">
        <p className="text-xs text-muted-foreground">{model.description}</p>
        <label className="block space-y-2"><span>{t("yfai.prompt")}</span><Input.TextArea value={prompt} onChange={(event) => setPrompt(event.target.value)} autoSize={{ minRows: 3, maxRows: 8 }} /></label>
        <YfaiParameters model={toolModel} config={selected} onChange={setParams} />
        <div className="flex gap-2"><Button type="primary" loading={running} disabled={!selected.apiKey || (!taskId && !prompt.trim() && model.id !== "voice-clone")} onClick={() => void execute()}>{t(taskId ? "yfai.resume" : "yfai.run")}</Button>{running ? <Button onClick={() => controller.current?.abort()}>{t("yfai.stopPolling")}</Button> : null}</div>
        <p className="text-xs text-muted-foreground">{t("yfai.runHint")}</p>
        <Input aria-label={t("yfai.task")} placeholder={t("yfai.task")} value={taskId} disabled={running} onChange={(event) => setTaskId(event.target.value.trim())} />
        {taskId ? <div className="tnum break-all text-xs">{t("yfai.task")}: {taskId}</div> : null}
        {error ? <div role="alert" className="break-words text-sm text-destructive">{error}</div> : null}
        {urls.map((url) => <a className="block break-all text-sm underline" href={url} target="_blank" rel="noreferrer" key={url}>{t("yfai.result")} · {url}</a>)}
        {result ? <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-xs">{JSON.stringify(result, null, 2)}</pre> : null}
    </div>;
}
