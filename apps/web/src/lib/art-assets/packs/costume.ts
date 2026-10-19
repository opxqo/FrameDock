// FrameDock: 服装 art-asset pack. MOKE's 美术资产 library has no costume-specific entries, so the multi-view entries,
// which MOKE writes for any subject, are reused verbatim (docs/research/moke-art-assets.json #3, #4, #7). The three
// others have no MOKE counterpart: 服装设计图 and 穿到角色身上 are FrameDock's own, and 服装拆解平铺 is MOKE #10
// (角色设定拆解) rewritten to take apart a costume only.
//
// Tiers: 定稿 makes the outfit's master image; 派生 works from it.

import type { ArtAssetPack } from "@/lib/art-assets/packs";
import type { ArtAssetTemplate } from "@/lib/art-assets/templates";

const MASTER: ArtAssetTemplate[] = [
    {
        id: "costume-design",
        title: { zh: "服装设计图", en: "Costume design" },
        summary: { zh: "按描述设计一整套服装，作为母版", en: "Design a whole outfit from a description, as the master" },
        category: "costume",
        tier: "master",
        input: "either",
        size: "3:4",
        source: "framedock",
        prompt: "以参考服装或 [主体] 为主体，绘制一张完整的服装设计图：把整套服装穿在无面部特征的中性灰色人台上，正面全身展示；上衣、外套、下装、鞋靴与配饰一件不少，款式、版型、面料质感、颜色、图案、扣件和缝线清晰可辨。纯净的中性灰背景，柔和均匀的光线，不出现文字、标注或水印，可直接作为这套服装的标准参考。",
    },
    {
        id: "moke-costume-closeup",
        title: { zh: "三视图与局部特写", en: "Views + close-up" },
        summary: { zh: "四宫格：正面、左侧、背面与局部特写", en: "Four panels: front, left, back and a detail close-up" },
        category: "costume",
        tier: "master",
        input: "image",
        size: "1:1",
        source: "moke",
        prompt: "基于参考图，按照以下要求生成三视图+特写视图。建议采用1:1比例或9:16比例构图，4K清晰度。\n\n【尺寸与构图】\n保持原图宽高比，分辨率放大至原图两倍。将画面精确四等分为左上、右上、左下、右下四个相同大小的区域，每个区域各放置一个视角，内容居中于各自区域内；不添加任何分割线、边框、标注文字或装饰元素；\n左上区域为正面视图（0度），右上区域为左侧面视图（90度，面朝左边），左下区域为背面视图（180度），右下区域为局部特写视图（展示最具设计细节的局部——若为角色则特写面部五官与发型，若为物体则特写核心结构与材质，若为建筑则特写立面细节与材质肌理）。单个区域中仅放置1个主体。\n\n【关键约束】\n前三个全身视图必须确保主体从最顶端到最底端完整呈现在各自区域内，严禁任何方向的裁切——角色的头顶、脚底不可超出区域边界，建筑的屋顶、地基不可被截断，物体的任何部分不可溢出；主体在每个区域内上下左右居中放置，与区域边缘保留不少于区域宽度10%的安全边距；前三个全身视图的主体必须采用完全相同的缩放比例和相同的呈现尺度，确保主体在三个区域中的视觉高度和大小完全一致；\n\n【表面细节】\n完整还原原设定图中所有材质细节、纹理、花纹、配色、装饰物，不添加、不遗漏、不改动任何设计元素，贴图精度等效4K。四个视角保持完全一致的配色、材质、结构细节和设计语言，确保主体在不同角度下的绝对一致性；\n\n【整体画面】\n纯中性灰背景 #888888 ，无环境反射干扰。轻微投射接触增强立体感。整体为专业设定参考图（reference sheet）的规范排版，高清晰度，干净精确。",
    },
    {
        id: "moke-costume-four-views",
        title: { zh: "四视展示图", en: "Four views" },
        summary: { zh: "正面、左右侧面、背面统一尺度展示", en: "Front, left, right and back at one scale" },
        category: "costume",
        tier: "master",
        input: "image",
        size: "1:1",
        source: "moke",
        prompt: "基于参考图，按照以下要求生成四视展示图。建议采用1:1比例或9:16比例构图，4K清晰度。\n\n【尺寸与构图】\n保持原图宽高比，分辨率放大至原图两倍。将画面精确四等分为左上、右上、左下、右下四个相同大小的区域，每个区域各放置一个视角，内容居中于各自区域内；不添加任何分割线、边框、标注文字或装饰元素；\n左上区域为正面视图（0度），右上区域为左侧面视图（90度，面朝左边），左下区域为背面视图（180度），右下区域为右侧面视图（270度，面朝右边）；右上区域和右下区域的视图方向刚好相反，一左一右，请不要出现两者朝向一致方向。\n\n【关键约束】\n主体在每个区域内上下左右居中放置，与区域边缘保留不少于区域宽度10%的安全边距。单个区域中仅放置1个主体。\n\n【表面细节】\n完整还原原设定图中所有材质细节、纹理、花纹、配色、装饰物，不添加、不遗漏、不改动任何设计元素，贴图精度等效4K。四个视角保持完全一致的配色、材质、结构细节和设计语言，确保主体在不同角度下的绝对一致性；\n\n【整体画面】\n纯中性灰背景 #888888 ，无环境反射干扰。部件边界处以干净的几何切割面收束。部件悬浮于画面中心，无底座，轻微投射接触阴影增强立体感，部件周围保留充足的负空间便于观察轮廓。",
    },
];

const DERIVE: ArtAssetTemplate[] = [
    {
        id: "costume-breakdown",
        title: { zh: "服装拆解平铺", en: "Outfit breakdown" },
        summary: { zh: "把整套服装拆成单品，平铺展示", en: "Split the outfit into single pieces, laid out flat" },
        category: "costume",
        tier: "derive",
        input: "image",
        size: "1:1",
        source: "framedock",
        prompt: "根据参考图中的服装，生成一张服装拆解图（costume breakdown sheet）；\n将整套服装的各个组成部分分离展示，包括但不限于：上衣、外套、下装、鞋靴、帽饰、腰带与包袋、配饰和特殊纹样放大展示；\n每件单品正面朝上铺平，旁边留有标注区域的空间感，如同专业设定集的排版方式；\n所有单品保持与原服装完全一致的款式、配色、材质和风格；\n各单品以散点方式分布在画面中，彼此间距合理，排版清晰有序，无重叠；\n画面中不出现人物或人体；\n纯灰色背景 #888888，无环境元素；\n整体风格为专业游戏/动画服装设定文档的视觉规范，高清、精确、干净。",
    },
    {
        id: "moke-costume-style-derivative",
        title: { zh: "同风格创意衍生", en: "Same-style new outfit" },
        summary: { zh: "提取参考图的风格语言，创作同系列新服装", en: "A new outfit in the reference's visual language" },
        category: "costume",
        tier: "derive",
        input: "image",
        size: "auto",
        source: "moke",
        prompt: "深入分析参考图的视觉风格特征，包括：画面的艺术风格（如写实/扁平/赛博朋克/水彩/像素等）、色彩倾向与配色逻辑、笔触/渲染质感、光影处理手法、构图语言和整体氛围情绪；\n基于以上风格DNA，生成一个全新的创意衍生画面——主题/主体可以是与原图相关但不同的对象（例如原图是角色则生成同世界观下的另一角色；原图是场景则生成同风格的另一场景；原图是物品则生成同系列的另一物品）；\n新画面必须让观者一眼认出与原图属于\"同一系列/同一世界/同一创作者风格\"，但内容本身是全新的、具有独立创意价值的；\n保持与原图完全一致的渲染质量、细节密度和制作精度；\n色彩体系、光影风格、材质质感、氛围情绪与原图高度统一；\n高清晰度输出，具有独立的审美价值和创意亮点。",
    },
    {
        id: "costume-on-character",
        title: { zh: "穿到角色身上", en: "Dress the character" },
        summary: { zh: "把服装穿到指定角色身上，保持角色不变", en: "Put the outfit on a chosen character, keeping the character" },
        category: "costume",
        tier: "derive",
        input: "image",
        size: "3:4",
        source: "framedock",
        prompt: "参考图中包含一套服装设定和一个角色（若只有一张图，则该图中的角色就是要换装的角色）。请让该角色穿上这套服装，正面全身站立展示。严格保留角色的面部、发型、体型和画风，严格保留服装的款式、版型、面料、颜色、图案和配饰，不添加、不遗漏、不改动任何设计元素。纯灰色背景 #888888，光线柔和均匀，无环境元素，不出现文字或水印。",
    },
];

export const COSTUME_PACK: ArtAssetPack = {
    category: "costume",
    label: { zh: "服装", en: "Costume" },
    master: { title: { zh: "服装定稿", en: "Costume master" }, description: { zh: "服装设计、三视图、四视图", en: "Design, views, four views" }, templates: MASTER },
    derive: { title: { zh: "服装派生", en: "Costume derive" }, description: { zh: "拆解、同风格、上身", en: "Breakdown, style, fitting" }, templates: DERIVE },
};
