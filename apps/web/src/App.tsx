import type { NodeType } from "@framedock/shared";
import { useQuery } from "@tanstack/react-query";
import {
  Background,
  BackgroundVariant,
  type Edge,
  MiniMap,
  type Node,
  Panel,
  ReactFlow,
} from "@xyflow/react";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ZoomSlider } from "@/components/zoom-slider";

const demoNodes: Node<{ label: string; kind: NodeType }>[] = [
  {
    id: "demo-text",
    type: "input",
    position: { x: 0, y: 0 },
    data: { label: "文本示例", kind: "text" },
  },
  {
    id: "demo-image",
    type: "output",
    position: { x: 280, y: 160 },
    data: { label: "图片生成示例", kind: "image_gen" },
  },
];

const demoEdges: Edge[] = [
  { id: "demo-edge", source: "demo-text", target: "demo-image" },
];

type HealthResponse = { ok: boolean; db: boolean; version: string };

async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/health", {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("后端连接失败");
  const health: HealthResponse = await response.json();
  if (health.ok !== true || health.db !== true)
    throw new Error("数据库连接失败");
  return health;
}

export default function App() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    retry: false,
    refetchInterval: 10000,
  });
  const connected = health.isSuccess;
  const status = health.isPending
    ? "正在连接后端"
    : connected
      ? "后端已连接"
      : "后端未连接";

  return (
    <TooltipProvider>
      <main className="h-dvh w-full" aria-label="FrameDock 示例画布">
        <ReactFlow
          defaultNodes={demoNodes}
          defaultEdges={demoEdges}
          colorMode="dark"
          nodesConnectable={false}
          deleteKeyCode={null}
          minZoom={0.25}
          maxZoom={2}
          fitView
          fitViewOptions={{ padding: 0.4, maxZoom: 1 }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
          <MiniMap position="bottom-left" pannable zoomable />
          <ZoomSlider position="bottom-center" aria-label="画布缩放控件" />
          <Panel position="top-left">
            <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-card-foreground shadow-sm">
              <h1 className="text-sm font-semibold tracking-tight">
                FrameDock <span className="text-muted-foreground">帧坞</span>
              </h1>
              <Separator orientation="vertical" />
              <span
                role="status"
                aria-label={status}
                title={
                  connected
                    ? `API v${health.data.version} · SQLite 已连接`
                    : status
                }
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <span
                  aria-hidden="true"
                  className="health-dot size-2 rounded-full"
                  data-state={
                    health.isPending
                      ? "pending"
                      : connected
                        ? "online"
                        : "offline"
                  }
                />
                {status}
              </span>
            </div>
          </Panel>
        </ReactFlow>
      </main>
      <Toaster theme="dark" />
    </TooltipProvider>
  );
}
