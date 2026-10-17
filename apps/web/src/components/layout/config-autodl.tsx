import { App, Button, Input, Segmented, Switch, Tag } from "antd";
import { ChevronDown, ChevronRight, ExternalLink, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ModelIcon, resolveModelVendor } from "@/components/model-picker";
import { allAutodlModels, AUTODL_BASE_URL, AUTODL_CURATED_NAMES, AUTODL_TOKEN_URL, classifyAutodlModel, type AutodlCapability, type AutodlModel, type AutodlSyncedModel } from "@/lib/autodl-catalog";
import { encodeChannelModel, isAutodlChannel, modelOptionName, resolveModelChannel, withAutodlConfig, withLocalProxy, type AiConfig } from "@/stores/use-config-store";

const CATEGORIES: Array<{ value: AutodlCapability; label: string; modelKey: "textModel" | "imageModel" | "videoModel" }> = [
    { value: "text", label: "对话", modelKey: "textModel" },
    { value: "image", label: "图片", modelKey: "imageModel" },
    { value: "video", label: "视频", modelKey: "videoModel" },
];

/** Lists the account's models; free, and fails with 401 when the key is wrong. */
async function fetchAutodlModelList(apiKey: string): Promise<AutodlSyncedModel[]> {
    const response = await fetch(withLocalProxy(`${AUTODL_BASE_URL}/models`), { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "API Key 无效" : `连接失败（${response.status}）`);
    const payload = (await response.json()) as { data?: Array<{ id?: string; supported_endpoint_types?: string[] }> };
    return (payload.data || []).flatMap((item) => {
        const capability = item.id ? classifyAutodlModel(item.id, item.supported_endpoint_types) : undefined;
        return item.id && capability ? [{ name: item.id, capability }] : [];
    });
}

// FrameDock: dedicated AutoDL.Art section — one API key, models synced from the account and enabled per model.
export function ConfigAutodl({ config, onConfigChange }: { config: AiConfig; onConfigChange: (config: AiConfig) => void }) {
    const { message } = App.useApp();
    const [syncing, setSyncing] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [category, setCategory] = useState<AutodlCapability>("text");
    const [keyword, setKeyword] = useState("");
    const apiKey = config.channels.find((channel) => isAutodlChannel(channel.id))?.apiKey || "";
    const models = useMemo(() => allAutodlModels(config.autodlSyncedModels), [config.autodlSyncedModels]);
    const enabled = useMemo(() => new Set(config.autodlEnabledModels.map((name) => name.toLowerCase())), [config.autodlEnabledModels]);
    const synced = useMemo(() => new Set(config.autodlSyncedModels.map((model) => model.name.toLowerCase())), [config.autodlSyncedModels]);
    const current = CATEGORIES.find((item) => item.value === category) || CATEGORIES[0];
    const visible = models.filter((model) => model.capability === category && model.name.toLowerCase().includes(keyword.trim().toLowerCase()));
    const groups = groupByVendor(visible);

    const isEnabled = (model: AutodlModel) => enabled.has(model.name.toLowerCase());
    const optionValue = (model: AutodlModel) => encodeChannelModel(model.family === "gemini-image" ? "autodl-gemini" : "autodl", model.name);

    const setEnabled = (names: string[], on: boolean) => {
        const lower = new Set(names.map((name) => name.toLowerCase()));
        const rest = config.autodlEnabledModels.filter((name) => !lower.has(name.toLowerCase()));
        let next = withAutodlConfig(config, { enabled: on ? [...rest, ...names] : rest });
        // When the current default of this kind cannot run (no key or removed), the first enabled model takes over.
        const first = on ? models.find((model) => lower.has(model.name.toLowerCase())) : undefined;
        if (first) {
            const key = CATEGORIES.find((item) => item.value === first.capability)!.modelKey;
            if (!isModelReady(next, next[key])) next = { ...next, [key]: optionValue(first) };
        }
        onConfigChange(next);
    };

    const syncModels = async () => {
        if (!apiKey) {
            message.warning("请先填写 AutoDL API Key");
            return;
        }
        setSyncing(true);
        try {
            const list = await fetchAutodlModelList(apiKey);
            const known = new Set([...AUTODL_CURATED_NAMES, ...config.autodlSyncedModels.map((model) => model.name)].map((name) => name.toLowerCase()));
            const added = list.filter((model) => !known.has(model.name.toLowerCase())).length;
            onConfigChange(withAutodlConfig(config, { synced: list, syncedAt: new Date().toISOString() }));
            const count = (capability: AutodlCapability) => list.filter((model) => model.capability === capability).length;
            message.success(`连接成功：对话 ${count("text")} · 图片 ${count("image")} · 视频 ${count("video")}${added ? `，新发现 ${added} 个，可在下方启用` : ""}`);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "连接失败");
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="mb-5 rounded-lg border border-stone-200 dark:border-stone-800">
            <div className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            AutoDL.Art
                            {!apiKey ? <Tag className="!m-0">未填写 Key</Tag> : config.autodlSyncedAt ? <Tag color="green" className="!m-0">已同步 {config.autodlSyncedModels.length} 个模型 · {formatTime(config.autodlSyncedAt)}</Tag> : <Tag color="gold" className="!m-0">未同步</Tag>}
                        </div>
                        <div className="mt-1 text-xs text-stone-500">接口地址已内置，只需填写 API Key（AutoDL 控制台左侧“令牌管理”中创建），再同步账户可用的全部模型。</div>
                    </div>
                    <a href={AUTODL_TOKEN_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs">
                        打开 AutoDL <ExternalLink className="size-3" />
                    </a>
                </div>
                <div className="flex gap-2">
                    <Input.Password value={apiKey} placeholder="AutoDL API Key" onChange={(event) => onConfigChange(withAutodlConfig(config, { apiKey: event.target.value.trim() }))} autoComplete="off" />
                    <Button type="primary" icon={<RefreshCw className="size-4" />} loading={syncing} onClick={() => void syncModels()}>
                        连接并同步模型
                    </Button>
                </div>
            </div>
            <div className="border-t border-stone-200 dark:border-stone-800">
                <button type="button" className="flex w-full items-center gap-1.5 px-4 py-2.5 text-left text-sm font-medium" onClick={() => setExpanded((value) => !value)}>
                    {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    模型
                    <span className="text-xs font-normal text-stone-500">已启用 {config.autodlEnabledModels.length} / {models.length}</span>
                </button>
                {expanded ? (
                    <div className="px-4 pb-4">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Segmented
                                value={category}
                                onChange={(value) => setCategory(value as AutodlCapability)}
                                options={CATEGORIES.map((item) => {
                                    const all = models.filter((model) => model.capability === item.value);
                                    return { value: item.value, label: `${item.label} ${all.filter(isEnabled).length}/${all.length}` };
                                })}
                            />
                            <Input size="small" allowClear prefix={<Search className="size-3.5 opacity-50" />} placeholder="搜索模型" value={keyword} onChange={(event) => setKeyword(event.target.value)} className="!w-44" />
                            <div className="ml-auto flex gap-1">
                                <Button size="small" disabled={!visible.length} onClick={() => setEnabled(visible.map((model) => model.name), true)}>
                                    全部启用
                                </Button>
                                <Button size="small" disabled={!visible.length} onClick={() => setEnabled(visible.map((model) => model.name), false)}>
                                    全部停用
                                </Button>
                            </div>
                        </div>
                        {groups.length ? (
                            <div className="max-h-80 overflow-y-auto rounded-md border border-stone-200 dark:border-stone-800">
                                {groups.map(([vendor, items]) => (
                                    <div key={vendor}>
                                        <div className="sticky top-0 z-10 bg-stone-50 px-3 py-1 text-xs text-stone-500 dark:bg-stone-900">{vendor}</div>
                                        {items.map((model) => {
                                            const on = isEnabled(model);
                                            const isDefault = on && modelOptionName(config[current.modelKey]) === model.name;
                                            const missing = config.autodlSyncedModels.length > 0 && !synced.has(model.name.toLowerCase());
                                            return (
                                                <div key={model.name} className="flex items-center gap-2 border-t border-stone-100 px-3 py-1.5 first:border-t-0 dark:border-stone-800/60">
                                                    <ModelIcon model={model.name} />
                                                    <span className={`min-w-0 flex-1 truncate text-sm ${on ? "" : "opacity-50"}`} title={model.name}>
                                                        {model.name}
                                                    </span>
                                                    {model.price ? <span className="shrink-0 text-xs text-stone-500">{model.price}</span> : null}
                                                    {missing ? (
                                                        <Tag color="orange" className="!m-0 shrink-0" title="同步的模型列表中没有它：可能未开通，也可能是该原生接口不在列表中">
                                                            不在模型列表
                                                        </Tag>
                                                    ) : null}
                                                    {isDefault ? (
                                                        <Tag color="green" className="!m-0 shrink-0">默认</Tag>
                                                    ) : on ? (
                                                        <Button size="small" type="link" className="!px-1" onClick={() => onConfigChange({ ...config, [current.modelKey]: optionValue(model) })}>
                                                            设为默认
                                                        </Button>
                                                    ) : null}
                                                    <Switch size="small" checked={on} onChange={(checked) => setEnabled([model.name], checked)} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-md border border-dashed border-stone-200 px-3 py-6 text-center text-xs text-stone-500 dark:border-stone-800">
                                {keyword ? "没有匹配的模型" : `还没有${current.label}模型，填写 Key 后点击“连接并同步模型”获取账户可用的全部模型`}
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function isModelReady(config: AiConfig, value: string) {
    if (!value) return false;
    const channel = resolveModelChannel(config, value);
    return Boolean(channel.apiKey.trim() && channel.models.some((model) => model.name === modelOptionName(value)));
}

function groupByVendor(models: AutodlModel[]) {
    const groups = new Map<string, AutodlModel[]>();
    models.forEach((model) => {
        const vendor = resolveModelVendor(model.name);
        groups.set(vendor, [...(groups.get(vendor) || []), model]);
    });
    return Array.from(groups.entries());
}

function formatTime(value: string) {
    return new Date(value).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
