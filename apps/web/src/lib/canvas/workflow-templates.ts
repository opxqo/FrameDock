import { createCanvasNode } from "@/lib/canvas/canvas-node-factory";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData, type Position } from "@/types/canvas";

// FrameDock: ready-made node groups that can be inserted onto the canvas from the ⌘K palette.
// Prompts avoid words that AutoDL's moderation is known to reject (e.g. "电影").

export type WorkflowTemplate = { nodes: CanvasNodeData[]; connections: CanvasConnection[]; focusNodeId: string };

export const DEFAULT_CHARACTER_SETTING =
    "【角色设定】\n一名身穿军绿色飞行夹克的白色猫族探险家：右眼戴黑色单片护目镜，颈部系着带金属吊坠的皮质项圈，腰间挂着多口袋的工具带，穿黑色工装长裤和厚底短靴，拥有一条长而蓬松的白色尾巴。\n（把这里改成你的角色描述：种族、年龄、发型、服装、配饰、配色、体型等）";

export const THREE_VIEW_SPEC =
    "【三视图规范】\n画面：一张角色设定图，四宫格排版（2×2）：左上为正面全身，右上为左侧面全身，左下为背面全身，右下为四分之三侧面的面部特写。\n一致性：四个视图必须是同一个角色，体型比例、服装、配色、配饰、发型和面部特征完全一致；三个全身视图等高对齐，站姿放松，双臂自然下垂并略微离开身体，方便看清服装结构。\n背景：纯中性灰背景，不要出现场景元素。\n光线：柔和均匀的棚拍光，避免强烈阴影、强高光和戏剧化光效。\n细节：服装材质、装备和配饰的细节清晰可辨，各视图之间的结构对应正确。\n禁止：文字、标注、水印、边框、多余的人物。";

const INSTRUCTION = "请根据下面的【角色设定】，按照【三视图规范】绘制角色设定图。如果提供了参考图，角色外观必须与参考图保持一致。";

export function buildThreeViewWorkflow(center: Position, config: { model: string; size?: string }): WorkflowTemplate {
    const column = 280;
    const gap = 96;
    const textWidth = 340;
    const leftX = center.x - textWidth - gap;

    const character = createCanvasNode(CanvasNodeType.Text, { x: leftX, y: center.y - column }, { content: DEFAULT_CHARACTER_SETTING, status: "idle", fontSize: 14 });
    character.title = "角色设定";
    const spec = createCanvasNode(CanvasNodeType.Text, { x: leftX, y: center.y }, { content: THREE_VIEW_SPEC, status: "idle", fontSize: 14 });
    spec.title = "三视图规范";
    const reference = createCanvasNode(CanvasNodeType.Image, { x: leftX, y: center.y + column });
    reference.title = "参考图（可选）";
    const generate = createCanvasNode(CanvasNodeType.Config, center, { generationMode: "image", model: config.model, size: "4:3", count: 1, prompt: INSTRUCTION, status: "idle" });
    generate.title = "生成三视图";

    const connections: CanvasConnection[] = [character, spec, reference].map((source, index) => ({ id: `wf-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`, fromNodeId: source.id, toNodeId: generate.id }));
    return { nodes: [character, spec, reference, generate], connections, focusNodeId: generate.id };
}
