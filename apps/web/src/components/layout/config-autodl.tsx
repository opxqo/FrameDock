import { App, Button, Input, Tag } from "antd";
import { ExternalLink, Wifi } from "lucide-react";
import { useState } from "react";

import { AUTODL_BASE_URL, AUTODL_MODELS, AUTODL_TOKEN_URL } from "@/lib/autodl-catalog";
import { isAutodlChannel, withLocalProxy, type ModelChannel } from "@/stores/use-config-store";

// FrameDock: dedicated AutoDL.Art section — one API key shared by the fixed AutoDL channels.
export function ConfigAutodl({ channels, onChannelsChange }: { channels: ModelChannel[]; onChannelsChange: (channels: ModelChannel[]) => void }) {
    const { message } = App.useApp();
    const [testing, setTesting] = useState(false);
    const apiKey = channels.find((channel) => isAutodlChannel(channel.id))?.apiKey || "";

    const setApiKey = (value: string) => onChannelsChange(channels.map((channel) => (isAutodlChannel(channel.id) ? { ...channel, apiKey: value.trim() } : channel)));

    const testConnection = async () => {
        if (!apiKey) {
            message.warning("请先填写 AutoDL API Key");
            return;
        }
        setTesting(true);
        try {
            // Listing models is free and fails with 401 when the key is wrong.
            const response = await fetch(withLocalProxy(`${AUTODL_BASE_URL}/models`), { headers: { Authorization: `Bearer ${apiKey}` } });
            if (response.ok) message.success("AutoDL 连接成功");
            else message.error(response.status === 401 || response.status === 403 ? "API Key 无效" : `连接失败（${response.status}）`);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "连接失败");
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="mb-5 rounded-lg border border-stone-200 p-4 dark:border-stone-800">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <div className="text-sm font-semibold">AutoDL.Art</div>
                    <div className="mt-1 text-xs text-stone-500">接口地址和模型已内置，只需填写 API Key。在 AutoDL 控制台左侧“令牌管理”中创建。</div>
                </div>
                <a href={AUTODL_TOKEN_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs">
                    打开 AutoDL <ExternalLink className="size-3" />
                </a>
            </div>
            <div className="flex gap-2">
                <Input.Password value={apiKey} placeholder="AutoDL API Key" onChange={(event) => setApiKey(event.target.value)} autoComplete="off" />
                <Button icon={<Wifi className="size-4" />} loading={testing} onClick={() => void testConnection()}>
                    测试连接
                </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
                {AUTODL_MODELS.map((model) => (
                    <Tag key={model.name} className="!m-0" color={model.capability === "video" ? "purple" : "blue"}>
                        {model.name} · {model.price}
                    </Tag>
                ))}
            </div>
        </div>
    );
}
