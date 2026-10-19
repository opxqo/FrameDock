// FrameDock: 人物 art-asset templates, taken from the MOKE AIGC prompt library, section 美术资产
// (https://www.mokeaigc.ai/cinematique.html, read 2026-10-18). Prompt text is MOKE's; only obvious machine-translation
// slips in the T-Pose entry are corrected (e.g. "1:1烧烤比例" → "1:1正方形比例"). `[主体]` is MOKE's placeholder for the
// user's description; `{{id}}` is filled from the template's options (MOKE's 可选参数).
//
// Tiers (FrameDock): 定稿 templates produce the master design of a character; 派生 templates need that master
// connected as the reference and derive new material from it, so every derived image shows the same character.

import { GROUP_ASSETS } from "@/lib/art-assets/groups";
import type { ArtAssetPack } from "@/lib/art-assets/packs";
import type { ArtAssetTemplate } from "@/lib/art-assets/templates";

const MASTER: ArtAssetTemplate[] = [
    {
        id: "moke-character-turnaround",
        title: { zh: "角色三视图", en: "Character turnaround" },
        summary: { zh: "正面去头、背面保留头部，搭配四分之三面部特写", en: "Headless front, back with head, plus a three-quarter face close-up" },
        category: "character",
        tier: "master",
        input: "either",
        size: "16:9",
        source: "moke",
        prompt: "以参考角色或 [主体] 为主体，绘制角色三视图：正面全身、背面全身、四分之三侧面脸部特写。全身图中的正面图请去掉头部。背面保留头部这样能更好地保持角色一致性。脸部特写正面如果只参考中性表情，角色每次微笑时，牙齿形状和下颌动作都可能发生变化。背景为纯中性灰色，光线柔和，不得出现强烈的阴影或高光。",
    },
    {
        id: "moke-character-turnaround-closeup",
        title: { zh: "三视图与局部特写", en: "Turnaround + close-up" },
        summary: { zh: "四宫格呈现正面、左侧、背面与局部特写", en: "Four panels: front, left, back and a detail close-up" },
        category: "character",
        tier: "master",
        input: "image",
        size: "1:1",
        source: "moke",
        prompt: "基于参考图，按照以下要求生成三视图+特写视图。建议采用1:1比例或9:16比例构图，4K清晰度。\n【尺寸与构图】\n保持原图宽高比，分辨率放大至原图两倍。将画面精确四等分为左上、右上、左下、右下四个相同大小的区域，每个区域各放置一个视角，内容居中于各自区域内；不添加任何分割线、边框、标注文字或装饰元素；\n左上区域为正面视图（0度），右上区域为左侧面视图（90度，面朝左边），左下区域为背面视图（180度），右下区域为局部特写视图（展示最具设计细节的局部——若为角色则特写面部五官与发型，若为物体则特写核心结构与材质，若为建筑则特写立面细节与材质肌理）。单个区域中仅放置1个主体。\n【关键约束】\n前三个全身视图必须确保主体从最顶端到最底端完整呈现在各自区域内，严禁任何方向的裁切——角色的头顶、脚底不可超出区域边界，建筑的屋顶、地基不可被截断，物体的任何部分不可溢出；主体在每个区域内上下左右居中放置，与区域边缘保留不少于区域宽度10%的安全边距；前三个全身视图的主体必须采用完全相同的缩放比例和相同的呈现尺度，确保主体在三个区域中的视觉高度和大小完全一致；\n【表面细节】\n完整还原原设定图中所有材质细节、纹理、花纹、配色、装饰物，不添加、不遗漏、不改动任何设计元素，贴图精度等效4K。四个视角保持完全一致的配色、材质、结构细节和设计语言，确保主体在不同角度下的绝对一致性；\n【整体画面】\n纯中性灰背景 #888888 ，无环境反射干扰。轻微投射接触增强立体感。整体为专业设定参考图（reference sheet）的规范排版，高清晰度，干净精确。",
    },
    {
        id: "moke-character-four-views",
        title: { zh: "四视展示图", en: "Four views" },
        summary: { zh: "正面、左右侧面、背面统一尺度展示", en: "Front, left, right and back at one scale" },
        category: "character",
        tier: "master",
        input: "image",
        size: "1:1",
        source: "moke",
        prompt: "基于参考图，按照以下要求生成四视展示图。建议采用1:1比例或9:16比例构图，4K清晰度。\n【尺寸与构图】\n保持原图宽高比，分辨率放大至原图两倍。将画面精确四等分为左上、右上、左下、右下四个相同大小的区域，每个区域各放置一个视角，内容居中于各自区域内；不添加任何分割线、边框、标注文字或装饰元素；\n左上区域为正面视图（0度），右上区域为左侧面视图（90度，面朝左边），左下区域为背面视图（180度），右下区域为右侧面视图（270度，面朝右边）；右上区域和右下区域的视图方向刚好相反，一左一右，请不要出现两者朝向一致方向。\n【关键约束】\n主体在每个区域内上下左右居中放置，与区域边缘保留不少于区域宽度10%的安全边距。单个区域中仅放置1个主体。\n【表面细节】\n完整还原原设定图中所有材质细节、纹理、花纹、配色、装饰物，不添加、不遗漏、不改动任何设计元素，贴图精度等效4K。四个视角保持完全一致的配色、材质、结构细节和设计语言，确保主体在不同角度下的绝对一致性；\n【整体画面】\n纯中性灰背景 #888888 ，无环境反射干扰。部件边界处以干净的几何切割面收束。部件悬浮于画面中心，无底座，轻微投射接触阴影增强立体感，部件周围保留充足的负空间便于观察轮廓。",
    },
    {
        id: "moke-character-complete",
        title: { zh: "角色全身补全", en: "Complete the figure" },
        summary: { zh: "识别裁切和遮挡，补全完整角色素材", en: "Fill in cropped and hidden parts for a full-body asset" },
        category: "character",
        tier: "master",
        input: "image",
        size: "auto",
        source: "moke",
        prompt: "分析参考图中的角色，识别被画面边缘裁剪或被其他元素遮挡的部分；\n生成一张完整的角色全身图，将所有被裁切和遮挡的部位进行合理补全——包括被截断的肢体、被遮挡的服装区域、被裁掉的头部/脚部等；\n补全部分必须在风格、配色、材质、设计语言上与可见部分完全统一，保持角色设计的一致性和合理性；\n角色以与原图一致的姿态呈现，确保全身从头顶到脚底、服饰与手持物品完整可见；\n高清晰度输出，干净利落，可直接用作角色素材。",
    },
];

const DERIVE: ArtAssetTemplate[] = [
    {
        id: "moke-character-expressions",
        title: { zh: "一键表情图", en: "Expression sheet" },
        summary: { zh: "平静、开心、惊讶、愤怒、悲伤、害羞六种表情", en: "Calm, happy, surprised, angry, sad, shy" },
        category: "character",
        tier: "derive",
        input: "image",
        size: "3:2",
        source: "moke",
        options: [{ id: "range", label: { zh: "出图范围", en: "Framing" }, choices: ["头像半身特写", "仅头部特写", "含肩装的胸像"], choiceLabels: ["头像半身","仅头部","含肩胸像"] }],
        prompt: "以参考角色或 [主体] 为主体，制作一张表情设定表。采用{{range}}，分别展示平静、开心、惊讶、愤怒、悲伤、害羞六种清晰可辨的表情，整齐排列，保持同一角色的五官、发型、服装和画风一致。各格尺度一致，纯净背景，避免肢体裁切与面部身份漂移。",
    },
    {
        id: "moke-character-t-pose",
        title: { zh: "标准 T-Pose", en: "T-pose" },
        summary: { zh: "保持角色设计，转换为建模与绑定参考姿态", en: "Same design in a modelling and rigging reference pose" },
        category: "character",
        tier: "derive",
        input: "image",
        size: "1:1",
        source: "moke",
        prompt: "生成一张1:1正方形比例的图片；\n将角色的原始姿势调整为适用于3D建模的标准T-Pose（T型姿势）：双臂在肩部高度向两侧平直伸展，掌心朝下，双腿伸直并拢，双脚平放。\n保持正确的解剖学比例与对称性。姿势应保持静止对称，便于3D骨骼绑定（Rigging）。\n保证所有原始的服装、配饰、道具及艺术风格完全保持不变。\n仅修改身体姿势，使其符合指定的标准技术参考姿势。\n纯灰色背景#888888，无环境元素；",
    },
    {
        id: "moke-character-a-pose",
        title: { zh: "标准 A-Pose", en: "A-pose" },
        summary: { zh: "双臂向下约 45°，双脚肩宽，保留原始造型", en: "Arms down about 45°, feet shoulder-width, design unchanged" },
        category: "character",
        tier: "derive",
        input: "image",
        size: "1:1",
        source: "moke",
        prompt: "生成一张1:1正方形比例的图片；\n该角色被重新设计为标准的 A 字姿势（A-pose）。\n双臂伸直，与身体呈约 45 度角向下方伸展。\n双腿分开，间距与肩同宽。\n完全保留了参考图中的所有原始服装细节、发型及面部特征。\n纯灰色背景 #888888，无环境元素；",
    },
    {
        id: "moke-character-breakdown",
        title: { zh: "角色设定拆解", en: "Design breakdown" },
        summary: { zh: "拆分发型、表情、服饰、道具及纹样，保留一致性", en: "Hair, expressions, clothing, props and patterns laid out" },
        category: "character",
        tier: "derive",
        input: "image",
        size: "16:9",
        source: "moke",
        prompt: "根据参考图中的角色，生成一张角色设定拆解图（character design breakdown sheet）；\n将角色的各个组成部分分离展示，包括但不限于：发型/头部细节、面部表情集（2-3个代表性表情）、上装/下装/鞋靴单独展示、武器/道具/配饰单独展示、特殊标志或纹样放大展示；\n每个拆解部件旁边留有标注区域的空间感，如同专业设定集的排版方式；\n所有部件保持与原角色完全一致的配色、材质和风格；\n各部件以散点方式分布在画面中，彼此间距合理，排版清晰有序，无重叠；\n纯灰色背景 #888888，无环境元素；\n整体风格为专业游戏/动画角色设定文档的视觉规范，高清、精确、干净。",
    },
    {
        id: "moke-character-chibi",
        title: { zh: "角色 Q 版化", en: "Chibi version" },
        summary: { zh: "保留身份特征，转换为 Q 版头身比例", en: "Keep the identity, change to chibi proportions" },
        category: "character",
        tier: "derive",
        input: "image",
        size: "3:4",
        source: "moke",
        options: [{ id: "ratio", label: { zh: "Q 版比例", en: "Chibi ratio" }, choices: ["2.5头身", "3头身", "2头身超变形"], choiceLabels: ["2.5 头身","3 头身","2 头身"] }],
        prompt: "将参考角色或 [主体] 转换成{{ratio}}Q版角色。保留可辨识的发型、服装、配色、道具及身份特征，重新调整头身比例与四肢造型；完整全身展示，轮廓清晰，风格与原作一致，背景简洁。",
    },
    {
        id: "moke-character-unchibi",
        title: { zh: "Q 版转正常", en: "Chibi to normal" },
        summary: { zh: "重建躯干与四肢，转为正常比例", en: "Rebuild torso and limbs at normal proportions" },
        category: "character",
        tier: "derive",
        input: "image",
        size: "3:4",
        source: "moke",
        options: [{ id: "body", label: { zh: "目标体型", en: "Target build" }, choices: ["7.5头身成人比例", "6.5头身青少年比例", "风格化英雄体型"], choiceLabels: ["成人","青少年","英雄体型"] }],
        prompt: "将参考Q版角色或 [主体] 转换为{{body}}。合理重建躯干与四肢结构，保留身份、发型、服装、配色和标志性配件，保持原画风，不直接拉伸原图。完整全身展示。",
    },
    {
        id: "moke-character-style-derivative",
        title: { zh: "同风格创意衍生", en: "Same-style new character" },
        summary: { zh: "提取参考图的风格语言，创作同系列新角色", en: "A new character in the reference's visual language" },
        category: "character",
        tier: "derive",
        input: "image",
        size: "auto",
        source: "moke",
        prompt: "深入分析参考图的视觉风格特征，包括：画面的艺术风格（如写实/扁平/赛博朋克/水彩/像素等）、色彩倾向与配色逻辑、笔触/渲染质感、光影处理手法、构图语言和整体氛围情绪；\n基于以上风格DNA，生成一个全新的创意衍生画面——主题/主体可以是与原图相关但不同的对象（例如原图是角色则生成同世界观下的另一角色；原图是场景则生成同风格的另一场景；原图是物品则生成同系列的另一物品）；\n新画面必须让观者一眼认出与原图属于\"同一系列/同一世界/同一创作者风格\"，但内容本身是全新的、具有独立创意价值的；\n保持与原图完全一致的渲染质量、细节密度和制作精度；\n色彩体系、光影风格、材质质感、氛围情绪与原图高度统一；\n高清晰度输出，具有独立的审美价值和创意亮点。",
    },
];

export const CHARACTER_PACK: ArtAssetPack = {
    category: "character",
    group: GROUP_ASSETS,
    label: { zh: "人物", en: "Character" },
    master: { title: { zh: "人物定稿", en: "Character master" }, description: { zh: "三视图、四视图、补全", en: "Turnaround, views, completion" }, templates: MASTER },
    derive: { title: { zh: "人物派生", en: "Character derive" }, description: { zh: "表情、姿势、拆解、Q 版", en: "Expressions, poses, chibi" }, templates: DERIVE },
};
