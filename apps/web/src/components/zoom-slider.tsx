"use client";

import {
  Panel,
  type PanelProps,
  useReactFlow,
  useStore,
  useViewport,
} from "@xyflow/react";
import { Maximize, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export function ZoomSlider({
  className,
  orientation = "horizontal",
  ...props
}: Omit<PanelProps, "children"> & {
  orientation?: "horizontal" | "vertical";
}) {
  const { zoom } = useViewport();
  const { zoomTo, zoomIn, zoomOut, fitView } = useReactFlow();
  const minZoom = useStore((state) => state.minZoom);
  const maxZoom = useStore((state) => state.maxZoom);

  return (
    <Panel
      className={cn(
        "bg-primary-foreground text-foreground flex gap-1 rounded-md p-1",
        orientation === "horizontal" ? "flex-row" : "flex-col",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "flex gap-1",
          orientation === "horizontal" ? "flex-row" : "flex-col-reverse",
        )}
      >
        <Button
          aria-label="缩小"
          variant="ghost"
          size="icon"
          onClick={() => zoomOut({ duration: 300 })}
        >
          <Minus />
        </Button>
        <Slider
          className={cn(
            orientation === "horizontal" ? "w-24 sm:w-[140px]" : "h-[140px]",
          )}
          orientation={orientation}
          value={[zoom]}
          min={minZoom}
          max={maxZoom}
          step={0.01}
          onValueChange={(values) => {
            const value = values[0];
            if (value !== undefined) void zoomTo(value);
          }}
        />
        <Button
          aria-label="放大"
          variant="ghost"
          size="icon"
          onClick={() => zoomIn({ duration: 300 })}
        >
          <Plus />
        </Button>
      </div>
      <Button
        aria-label="重置缩放为 100%"
        className={cn(
          "tabular-nums",
          orientation === "horizontal" ? "w-14 min-w-10" : "size-10",
        )}
        variant="ghost"
        onClick={() => zoomTo(1, { duration: 300 })}
      >
        {(100 * zoom).toFixed(0)}%
      </Button>
      <Button
        aria-label="适应画布"
        variant="ghost"
        size="icon"
        onClick={() => fitView({ duration: 300 })}
      >
        <Maximize />
      </Button>
    </Panel>
  );
}
