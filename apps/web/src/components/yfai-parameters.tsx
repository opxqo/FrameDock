import { useState } from "react";
import { Button, Input, InputNumber, Select, Switch } from "antd";
import { useTranslation } from "react-i18next";
import { findYfaiModel, parseYfaiParams, yfaiParamVisible, type YfaiModel, type YfaiValue } from "@/lib/yfai-catalog";
import { buildYfaiParams, uploadYfaiFile, yfaiRequest, yfaiRouting } from "@/services/api/yfai";
import { resolveModelChannel, type AiConfig } from "@/stores/use-config-store";

export function YfaiParameters({ config, model: explicitModel, onChange, onCountChange, maxCount, singleOutput = false, className = "space-y-3" }: { config: AiConfig; model?: YfaiModel; onChange: (value: string) => void; onCountChange?: (count: number) => void; maxCount?: number; singleOutput?: boolean; className?: string }) {
    const { t, i18n } = useTranslation();
    const [busy, setBusy] = useState("");
    const [feedback, setFeedback] = useState("");
    const [laneList, setLaneList] = useState<{ context: string; channels: Array<{ lane: string; vendor?: string; group?: string; effective_total_rmb?: number }> }>({ context: "", channels: [] });
    const model = explicitModel || findYfaiModel(config.model, config.yfaiModels);
    if (!model) return null;
    const english = i18n.resolvedLanguage?.startsWith("en");
    const overrides = parseYfaiParams(config.yfaiParams, model.id);
    const params = buildYfaiParams(config, model);
    if (onCountChange && model.param_schema.count) params.count = Number(config.count) || 1;
    if (singleOutput && model.param_schema.count) params.count = 1;
    const key = resolveModelChannel(config, `yfai::${model.id}`).apiKey;
    const laneIds = yfaiRouting(config, model).lane_ids || [];
    const laneContext = JSON.stringify([model.id, key, params]);
    const channels = laneList.context === laneContext ? laneList.channels : [];
    const laneOptions = [
        ...channels.map((channel) => ({ value: channel.lane, label: `${channel.vendor || channel.lane.split("@")[1]?.split(":")[0] || channel.lane}${channel.group ? ` · ${channel.group}` : ""}${typeof channel.effective_total_rmb === "number" ? ` · ¥${channel.effective_total_rmb.toFixed(3)}` : ""}` })),
        ...laneIds.filter((id) => !channels.some((channel) => channel.lane === id)).map((id) => ({ value: id, label: id.includes("@") ? id.split("@")[1] : id })),
    ];
    const setParam = (name: string, value: YfaiValue | undefined) => {
        if (name === "count" && onCountChange) { onCountChange(Number(value) || 1); return; }
        let saved: Record<string, Record<string, YfaiValue>> = {};
        try { saved = JSON.parse(config.yfaiParams || "{}"); } catch { /* Start an empty map for old configs. */ }
        const next = { ...overrides };
        if (value === undefined || (value === "" && model.param_schema[name]?.type !== "enum")) delete next[name]; else next[name] = value;
        onChange(JSON.stringify({ ...saved, [model.id]: next }));
        setFeedback("");
    };
    const estimate = async () => {
        setBusy("estimate"); setFeedback("");
        try {
            const quote = await yfaiRequest("/v1/pricing-estimate", key, { model: model.id, params, include_all_channels: false, ...(laneIds.length ? { pinned_lane_ids: laneIds } : {}) });
            setFeedback(typeof quote.effective_total_rmb === "number" ? t("yfai.quote", { price: quote.effective_total_rmb, max: quote.max_effective_total_rmb ?? quote.effective_total_rmb, freeze: quote.required_freeze_rmb ?? "—" }) : t("yfai.noQuote"));
        } catch (error) { setFeedback(error instanceof Error ? error.message : t("yfai.requestFailed")); }
        finally { setBusy(""); }
    };
    const loadLanes = async () => {
        setBusy("lanes"); setFeedback("");
        try {
            const quote = await yfaiRequest("/v1/pricing-estimate", key, { model: model.id, params, include_all_channels: true });
            const candidates = Array.isArray(quote.channels) ? quote.channels.filter((channel): channel is typeof laneList.channels[number] => Boolean(channel && typeof channel === "object" && typeof (channel as { lane?: unknown }).lane === "string")) : [];
            setLaneList({ context: laneContext, channels: candidates });
            if (!candidates.length) setFeedback(t("yfai.noLanes"));
        } catch (error) { setFeedback(error instanceof Error ? error.message : t("yfai.requestFailed")); }
        finally { setBusy(""); }
    };
    return <div className={className} onMouseDown={(event) => event.stopPropagation()}>
        <div className="text-xs text-muted-foreground">{t("yfai.modelParameters")}</div>
        {model.id !== "voice-clone" ? <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
                <label htmlFor={`yfai-${model.id}-lanes`} className="text-xs">{t("yfai.upstreamChannel")}</label>
                <Button size="small" type="text" loading={busy === "lanes"} disabled={!key || Boolean(busy)} onClick={() => void loadLanes()}>{t("yfai.loadLanes")}</Button>
            </div>
            <Select id={`yfai-${model.id}-lanes`} aria-label={t("yfai.upstreamChannel")} className="w-full" mode="multiple" showSearch optionFilterProp="label" allowClear maxTagCount="responsive" placeholder={t("yfai.autoRouting")} value={laneIds} options={laneOptions} onChange={(ids: string[]) => setParam("_lane_ids", ids.length ? ids : undefined)} notFoundContent={t("yfai.loadLanesHint")} />
            <p className="text-[11px] text-muted-foreground">{t("yfai.routingHint")}</p>
        </div> : null}
        {Object.entries(model.param_schema).filter(([name, spec]) => name !== "prompt" && !(singleOutput && name === "count") && yfaiParamVisible(spec, params)).map(([name, spec]) => {
            const value = params[name];
            const label = (english ? spec.label?.en : spec.label?.zh) || name;
            const id = `yfai-${model.id}-${name}`;
            return <div key={name} className="space-y-1.5">
                <label htmlFor={id} className="block text-xs" title={spec.description}>{label}{spec.required ? " *" : ""}</label>
                {spec.type === "enum" ? <Select id={id} aria-label={label} className="w-full" showSearch optionFilterProp="label" allowClear placeholder={t(name === "mode" ? "yfai.autoMode" : "settingsPanels.common.auto")} value={name === "mode" && overrides.mode === undefined ? undefined : value as string | number | undefined} onChange={(next) => setParam(name, next)} options={(spec.options || spec.enum?.map((item) => ({ value: item })) || []).filter((option) => !(singleOutput && model.id === "music" && name === "operation") || ["generate", "extend", "cover"].includes(String(option.value))).map((option) => ({ value: option.value, label: (english && "label_en" in option ? option.label_en : "label" in option ? option.label : undefined) || String(option.value) }))} />
                    : spec.type === "bool" ? <Switch id={id} aria-label={label} checked={value === true || value === "true"} onChange={(checked) => setParam(name, checked)} />
                    : spec.type === "int" ? <InputNumber id={id} aria-label={label} className="!w-full" min={spec.min} max={name === "count" && maxCount ? Math.min(spec.max ?? maxCount, maxCount) : spec.max} precision={0} value={value === undefined ? undefined : Number(value)} onChange={(next) => setParam(name, next ?? undefined)} />
                    : (spec.type === "upload" || name === "sample_url") ? <>
                        <Input.TextArea id={id} aria-label={label} autoSize={{ minRows: 1, maxRows: 3 }} placeholder={t("yfai.uploadHint")} value={Array.isArray(value) ? value.join("\n") : String(value || "")} onChange={(event) => setParam(name, name === "sample_url" ? event.target.value.trim() : event.target.value.split("\n").map((url) => url.trim()).filter(Boolean))} />
                        <label className="inline-block cursor-pointer text-xs underline underline-offset-4">
                            {busy === name ? t("yfai.uploading") : t("yfai.upload")}
                            <input className="sr-only" aria-label={`${label} ${t("yfai.upload")}`} type="file" multiple={name !== "sample_url" && spec.max_items !== 1} disabled={Boolean(busy) || !key} onChange={async (event) => {
                                const files = Array.from(event.target.files || []); event.target.value = "";
                                if (!files.length) return;
                                setBusy(name); setFeedback("");
                                try {
                                    const existing = Array.isArray(value) ? value : value ? [String(value)] : [];
                                    const limit = spec.max_items_by_mode?.[String(params.mode)] ?? spec.max_items;
                                    if (limit !== undefined && existing.length + files.length > limit) throw new Error(`${label}: max ${limit}`);
                                    for (const file of files) if (file.size > Math.min(spec.max_bytes ?? 50 * 1024 * 1024, 50 * 1024 * 1024)) throw new Error(t("yfai.fileTooLarge", { name: file.name }));
                                    const urls = await Promise.all(files.map((file) => uploadYfaiFile(key, file, file.name)));
                                    setParam(name, name === "sample_url" ? urls[0] : [...existing, ...urls]);
                                } catch (error) { setFeedback(error instanceof Error ? error.message : t("yfai.uploadFailed")); }
                                finally { setBusy(""); }
                            }} />
                        </label>
                    </> : spec.ui_widget === "textarea" ? <Input.TextArea id={id} aria-label={label} autoSize={{ minRows: 2, maxRows: 5 }} value={String(value ?? "")} onChange={(event) => setParam(name, event.target.value)} />
                    : <Input id={id} aria-label={label} value={String(value ?? "")} onChange={(event) => setParam(name, event.target.value)} />}
                {spec.description ? <details className="text-[11px] text-muted-foreground"><summary className="cursor-pointer">{t("yfai.parameterHelp")}</summary><p className="mt-1 whitespace-pre-wrap">{spec.description}</p></details> : null}
            </div>;
        })}
        <Button size="small" loading={busy === "estimate"} disabled={!key || Boolean(busy)} onClick={() => void estimate()}>{t("yfai.estimate")}</Button>
        <div className="text-xs text-muted-foreground">{t("yfai.estimateHint")}</div>
        {feedback ? <div role="status" className="whitespace-pre-wrap break-words text-xs">{feedback}</div> : null}
    </div>;
}
