// FrameDock: 场景 art-asset pack. Prompt text from the MOKE AIGC prompt library, section 美术资产
// (docs/research/moke-art-assets.json, entries 7, 9, 15, 17, 18, 21, 22, 23), used verbatim except that MOKE's default
// option values are replaced by `{{id}}`. MOKE has no scene template that starts from a description alone, and none
// for several camera angles of one place, so 场景概念图 and 场景多机位 are FrameDock's own (source "framedock").
//
// Tiers: 定稿 makes the scene's master image (designed from a description, or cleaned out of an existing shot);
// 派生 works from that master.

import type { ArtAssetPack } from "@/lib/art-assets/packs";
import type { ArtAssetTemplate } from "@/lib/art-assets/templates";

const MASTER: ArtAssetTemplate[] = [
    {
        id: "scene-concept",
        title: { zh: "场景概念图", en: "Scene concept" },
        summary: { zh: "按描述设计一个完整场景，作为后续镜头的母版", en: "Design a whole scene from a description, as the master for later shots" },
        category: "scene",
        tier: "master",
        input: "either",
        size: "16:9",
        source: "framedock",
        prompt: "以参考场景或 [主体] 为主体，绘制一张完整的场景概念设定图：以平视全景展示整个空间，清楚交代建筑结构、地形、主要陈设与道具的位置关系，区分前景、中景和远景，空间纵深明确。光线自然统一，时间与天气清晰可辨，材质与色彩成体系。画面中不出现人物，不出现文字、标注或水印，可直接作为后续镜头的场景参考。",
    },
    {
        id: "moke-scene-background-extract",
        title: { zh: "背景提取器", en: "Background extractor" },
        summary: { zh: "移除前景人物与主体，补全并保留纯背景", en: "Remove people and subjects, keep and complete the background" },
        category: "scene",
        tier: "master",
        input: "image",
        size: "auto",
        source: "moke",
        prompt: "从上传原图中提取纯背景。移除前景人物与指定主体，合理补全被遮挡的环境、纹理和结构；严格保留背景原有视角、构图、光照和画风，不增添无关物件，修补区域自然连续。",
    },
    {
        id: "moke-scene-recompose",
        title: { zh: "场景重组器", en: "Scene recomposer" },
        summary: { zh: "把素材或描述重组为完整场景，安排前中后景", en: "Assemble elements or a description into one coherent scene" },
        category: "scene",
        tier: "master",
        input: "either",
        size: "16:9",
        source: "moke",
        options: [
            {
                id: "mood",
                label: { zh: "重组氛围", en: "Mood" },
                choices: ["电影感完整场景，统一光色与空间纵深", "可玩的游戏关卡场景，留出走位空间", "概念展示场景，主体居中、构图清楚"],
                choiceLabels: ["电影感完整场景", "可玩关卡场景", "概念展示"],
            },
        ],
        prompt: "将参考素材表中的元素或 [主体] 重组为{{mood}}。保留主要素材的设计语言，安排前景、中景、背景，统一比例、透视和接触阴影，形成可信的空间关系，避免素材悬浮或简单拼贴。",
    },
];

const DERIVE: ArtAssetTemplate[] = [
    {
        id: "scene-camera-angles",
        title: { zh: "场景多机位", en: "Camera angles" },
        summary: { zh: "同一空间的正面、侧面、俯视、反打四个机位", en: "Front, side, top-down and reverse of the same space" },
        category: "scene",
        tier: "derive",
        input: "image",
        size: "16:9",
        source: "framedock",
        prompt: "基于参考场景，绘制同一空间的四机位设定图，2×2 排列：正面平视的全景、侧面视角的全景、高处俯视的全景、与正面相反方向的反打视角。四个画面必须是参考图中的同一个空间，建筑结构、陈设位置、材质、色调和光线方向前后一致，能互相对应。画面中不出现人物，也不出现文字或标注。",
    },
    {
        id: "moke-scene-element-split",
        title: { zh: "场景元素拆分", en: "Scene element split" },
        summary: { zh: "把建筑、植被、地形、道具拆成独立素材表", en: "Split buildings, plants, terrain and props into an asset sheet" },
        category: "scene",
        tier: "derive",
        input: "image",
        size: "16:9",
        source: "moke",
        prompt: "分析参考场景或 [主体]，将建筑、植被、地形、道具等主要元素拆分为独立资产，整齐排列在一张素材表中。保持各元素原有造型、材质、配色和透视，适当补全被遮挡部分，各素材之间留空且不重叠，背景统一简洁。",
    },
    {
        id: "moke-scene-isometric",
        title: { zh: "转化为等距场景", en: "Isometric scene" },
        summary: { zh: "保留布局关系，转为等距投影概念图", en: "Same layout as an isometric concept" },
        category: "scene",
        tier: "derive",
        input: "image",
        size: "1:1",
        source: "moke",
        prompt: "将参考完整场景或 [主体] 转换为等距场景概念图，保留建筑、道路、植被和道具之间的布局关系。统一等距投影与尺度，表现结构高度和空间层次，保持原有材质与画风，完整展示场景范围。",
    },
    {
        id: "moke-scene-building-isometric",
        title: { zh: "建筑等轴测提取", en: "Building isometric" },
        summary: { zh: "移除环境，保留建筑及附属结构和原图风格", en: "Strip the surroundings, keep the building in its original style" },
        category: "scene",
        tier: "derive",
        input: "image",
        size: "1:1",
        source: "moke",
        prompt: "识别并提取相关的建筑主体（包括建筑主体及其直接附属结构如阳台、屋顶设备、外挂楼梯等）；\n将建筑转化为一张标准等轴测视角（isometric view，30度角）的建筑可视化图；\n移除原的所有环境背景（天空、街道、植被、车辆、人物等），仅保留建筑本身；\n以风格渲染参考原图进行本身，若原图风格为写实风则轴测图完全也为写实风，若原图风格为3D Q版风则轴测图也为3D Q版风。\n光线为柔和的全局光照明，轻微的环境光遮蔽（AO）以增强结构层次感，避免强烈阴影干扰对建筑结构的阅读；\n建筑在画面中完整呈现，不裁切，保持合理的画面留白；\n纯灰色背景#888888，无地面纹理、无天空、无环境元素。",
    },
    {
        id: "moke-scene-building-variants",
        title: { zh: "建筑衍生器", en: "Building variants" },
        summary: { zh: "同系列建筑变体，改变屋顶、体量、入口或功能", en: "Variants of one building family" },
        category: "scene",
        tier: "derive",
        input: "image",
        size: "16:9",
        source: "moke",
        options: [{ id: "count", label: { zh: "衍生数量", en: "Variants" }, choices: ["8", "6", "4"], choiceLabels: ["8 个", "6 个", "4 个"] }],
        prompt: "以参考建筑或 [主体] 为母题，设计{{count}}个同系列建筑变体，分别改变屋顶、体量、入口或功能结构。保留共同的材质、配色和建筑语言，统一视角和展示尺度，各变体独立、清晰且不重复，不表现等级升级顺序。",
    },
    {
        id: "moke-scene-building-upgrade",
        title: { zh: "升级建筑概念探索", en: "Building upgrade path" },
        summary: { zh: "同一建筑由基础到高级的升级序列", en: "One building from basic to advanced" },
        category: "scene",
        tier: "derive",
        input: "image",
        size: "16:9",
        source: "moke",
        prompt: "以参考物体或建筑及 [主体] 为设计主题，制作同一建筑由基础到高级的升级概念序列。逐级扩展体量、结构和装饰复杂度，保留可识别的核心轮廓与主题符号。统一观察角度、地面基线、画风和光照，分别完整展示各等级。",
    },
    {
        id: "moke-scene-style-derivative",
        title: { zh: "同风格创意衍生", en: "Same-style new scene" },
        summary: { zh: "提取参考图的风格语言，创作同系列新场景", en: "A new scene in the reference's visual language" },
        category: "scene",
        tier: "derive",
        input: "image",
        size: "auto",
        source: "moke",
        prompt: "深入分析参考图的视觉风格特征，包括：画面的艺术风格（如写实/扁平/赛博朋克/水彩/像素等）、色彩倾向与配色逻辑、笔触/渲染质感、光影处理手法、构图语言和整体氛围情绪；\n基于以上风格DNA，生成一个全新的创意衍生画面——主题/主体可以是与原图相关但不同的对象（例如原图是角色则生成同世界观下的另一角色；原图是场景则生成同风格的另一场景；原图是物品则生成同系列的另一物品）；\n新画面必须让观者一眼认出与原图属于\"同一系列/同一世界/同一创作者风格\"，但内容本身是全新的、具有独立创意价值的；\n保持与原图完全一致的渲染质量、细节密度和制作精度；\n色彩体系、光影风格、材质质感、氛围情绪与原图高度统一；\n高清晰度输出，具有独立的审美价值和创意亮点。",
    },
];

export const SCENE_PACK: ArtAssetPack = {
    category: "scene",
    label: { zh: "场景", en: "Scene" },
    master: { title: { zh: "场景定稿", en: "Scene master" }, description: { zh: "概念图、背景提取、重组", en: "Concept, clean plate, recompose" }, templates: MASTER },
    derive: { title: { zh: "场景派生", en: "Scene derive" }, description: { zh: "多机位、拆分、等距、建筑", en: "Angles, split, isometric" }, templates: DERIVE },
};
