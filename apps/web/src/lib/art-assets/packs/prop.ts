// FrameDock: 道具 art-asset pack. MOKE's 美术资产 library has no prop-specific entries, so the multi-view entries (#3,
// #4, #7, #8, #11), which MOKE writes for any object, are reused verbatim, as is 植物生长器 (#16). #8 loses MOKE's stray
// leading "/" (listed in tests/art-asset-packs.test.ts). 道具设计图 and 道具提取 have no MOKE counterpart and are
// FrameDock's own.
//
// Tiers: 定稿 makes the prop's master image (or a growth sheet); 派生 works from it.

import type { ArtAssetPack } from "@/lib/art-assets/packs";
import type { ArtAssetTemplate } from "@/lib/art-assets/templates";

const MASTER: ArtAssetTemplate[] = [
    {
        id: "prop-design",
        title: { zh: "道具设计图", en: "Prop design" },
        summary: { zh: "按描述设计一件道具，作为母版", en: "Design a prop from a description, as the master" },
        category: "prop",
        tier: "master",
        input: "either",
        size: "3:2",
        source: "framedock",
        prompt: "以参考道具或 [主体] 为主体，绘制一张完整的道具设计图：道具居中完整展示，形状、比例、材质、颜色、纹理、磨损痕迹和结构细节清晰可辨，以平视略带俯视的角度呈现，不出现手或人物。纯净的中性灰背景，柔和均匀的光线，不出现文字、标注或水印，可直接作为这件道具的标准参考。",
    },
    {
        id: "moke-prop-closeup",
        title: { zh: "三视图与局部特写", en: "Views + close-up" },
        summary: { zh: "四宫格：正面、左侧、背面与局部特写", en: "Four panels: front, left, back and a detail close-up" },
        category: "prop",
        tier: "master",
        input: "image",
        size: "1:1",
        source: "moke",
        prompt: "基于参考图，按照以下要求生成三视图+特写视图。建议采用1:1比例或9:16比例构图，4K清晰度。\n\n【尺寸与构图】\n保持原图宽高比，分辨率放大至原图两倍。将画面精确四等分为左上、右上、左下、右下四个相同大小的区域，每个区域各放置一个视角，内容居中于各自区域内；不添加任何分割线、边框、标注文字或装饰元素；\n左上区域为正面视图（0度），右上区域为左侧面视图（90度，面朝左边），左下区域为背面视图（180度），右下区域为局部特写视图（展示最具设计细节的局部——若为角色则特写面部五官与发型，若为物体则特写核心结构与材质，若为建筑则特写立面细节与材质肌理）。单个区域中仅放置1个主体。\n\n【关键约束】\n前三个全身视图必须确保主体从最顶端到最底端完整呈现在各自区域内，严禁任何方向的裁切——角色的头顶、脚底不可超出区域边界，建筑的屋顶、地基不可被截断，物体的任何部分不可溢出；主体在每个区域内上下左右居中放置，与区域边缘保留不少于区域宽度10%的安全边距；前三个全身视图的主体必须采用完全相同的缩放比例和相同的呈现尺度，确保主体在三个区域中的视觉高度和大小完全一致；\n\n【表面细节】\n完整还原原设定图中所有材质细节、纹理、花纹、配色、装饰物，不添加、不遗漏、不改动任何设计元素，贴图精度等效4K。四个视角保持完全一致的配色、材质、结构细节和设计语言，确保主体在不同角度下的绝对一致性；\n\n【整体画面】\n纯中性灰背景 #888888 ，无环境反射干扰。轻微投射接触增强立体感。整体为专业设定参考图（reference sheet）的规范排版，高清晰度，干净精确。",
    },
    {
        id: "moke-prop-four-views",
        title: { zh: "四视展示图", en: "Four views" },
        summary: { zh: "正面、左右侧面、背面统一尺度展示", en: "Front, left, right and back at one scale" },
        category: "prop",
        tier: "master",
        input: "image",
        size: "1:1",
        source: "moke",
        prompt: "基于参考图，按照以下要求生成四视展示图。建议采用1:1比例或9:16比例构图，4K清晰度。\n\n【尺寸与构图】\n保持原图宽高比，分辨率放大至原图两倍。将画面精确四等分为左上、右上、左下、右下四个相同大小的区域，每个区域各放置一个视角，内容居中于各自区域内；不添加任何分割线、边框、标注文字或装饰元素；\n左上区域为正面视图（0度），右上区域为左侧面视图（90度，面朝左边），左下区域为背面视图（180度），右下区域为右侧面视图（270度，面朝右边）；右上区域和右下区域的视图方向刚好相反，一左一右，请不要出现两者朝向一致方向。\n\n【关键约束】\n主体在每个区域内上下左右居中放置，与区域边缘保留不少于区域宽度10%的安全边距。单个区域中仅放置1个主体。\n\n【表面细节】\n完整还原原设定图中所有材质细节、纹理、花纹、配色、装饰物，不添加、不遗漏、不改动任何设计元素，贴图精度等效4K。四个视角保持完全一致的配色、材质、结构细节和设计语言，确保主体在不同角度下的绝对一致性；\n\n【整体画面】\n纯中性灰背景 #888888 ，无环境反射干扰。部件边界处以干净的几何切割面收束。部件悬浮于画面中心，无底座，轻微投射接触阴影增强立体感，部件周围保留充足的负空间便于观察轮廓。",
    },
    {
        id: "moke-prop-plant-growth",
        title: { zh: "植物生长器", en: "Plant growth" },
        summary: { zh: "五阶段生长设定，保持同一品种特征", en: "Five growth stages of one plant variety" },
        category: "prop",
        tier: "master",
        input: "either",
        size: "16:9",
        source: "moke",
        options: [{ id: "stage", label: { zh: "生长阶段", en: "Growth stages" }, choices: ["种子、幼苗、开花、成熟结果、枯萎", "幼苗、小株、成株、开花、结果", "发芽、抽枝、茂盛、开花、落叶"], choiceLabels: ["种子到枯萎", "幼苗到结果", "发芽到落叶"] }],
        prompt: "为参考植物或 [主体] 绘制五阶段生长设定：{{stage}}。未指定植物时使用南瓜。按时间顺序等间距排列，统一视角、地面基线、光照和画风，保持同一品种可辨识的叶片、花和果实特征。",
    },
];

const DERIVE: ArtAssetTemplate[] = [
    {
        id: "prop-extract",
        title: { zh: "道具提取", en: "Prop extraction" },
        summary: { zh: "从图中取出道具，补全遮挡，单独展示", en: "Take an item out of an image, complete hidden parts" },
        category: "prop",
        tier: "derive",
        input: "image",
        size: "1:1",
        source: "framedock",
        prompt: "从参考图中提取补充描述里指定的道具（没有指定时取画面中最主要的物品），单独放在画面中央完整展示，被遮挡或被裁切的部分按原有结构合理补全。保持道具的形状、比例、材质、颜色、纹理和磨损细节与参考图一致，以平视略带俯视的角度呈现。不保留原图的背景、人物和其他物品。纯灰色背景 #888888，光线柔和均匀，不出现文字或水印。",
    },
    {
        id: "moke-prop-style-derivative",
        title: { zh: "同风格创意衍生", en: "Same-style new prop" },
        summary: { zh: "提取参考图的风格语言，创作同系列新物品", en: "A new item in the reference's visual language" },
        category: "prop",
        tier: "derive",
        input: "image",
        size: "auto",
        source: "moke",
        prompt: "深入分析参考图的视觉风格特征，包括：画面的艺术风格（如写实/扁平/赛博朋克/水彩/像素等）、色彩倾向与配色逻辑、笔触/渲染质感、光影处理手法、构图语言和整体氛围情绪；\n基于以上风格DNA，生成一个全新的创意衍生画面——主题/主体可以是与原图相关但不同的对象（例如原图是角色则生成同世界观下的另一角色；原图是场景则生成同风格的另一场景；原图是物品则生成同系列的另一物品）；\n新画面必须让观者一眼认出与原图属于\"同一系列/同一世界/同一创作者风格\"，但内容本身是全新的、具有独立创意价值的；\n保持与原图完全一致的渲染质量、细节密度和制作精度；\n色彩体系、光影风格、材质质感、氛围情绪与原图高度统一；\n高清晰度输出，具有独立的审美价值和创意亮点。",
    },
    {
        id: "moke-prop-gray-model",
        title: { zh: "图片转灰模", en: "Grey model" },
        summary: { zh: "统一灰色材质，保留几何结构，用于建模观察", en: "Uniform grey material, geometry kept, for modelling" },
        category: "prop",
        tier: "derive",
        input: "image",
        size: "auto",
        source: "moke",
        prompt: "根据参考的角色/物体，图片转灰模：生成一张适合3D建模参考的数字灰模渲染图（数字雕刻渲染/ZBrush灰模演示）；\n\n【材质定义】\n整体转化为统一的中性灰色无材质实体模型外观（中性灰色粘土渲染），类似于ZBrush中MatCap灰色材质球的渲染效果；表面为哑光灰色（约#808080中灰），无任何贴图、纹理、纹理贴图或表面涂装；所有设计信息仅通过几何体、结构转折与表面曲面透明；表面对标数字雕刻软件中的高模精细曲面渲染（细分表面渲染）；\n\n【几何细节保留】\n完整保留原始设计的所有三维几何信息：服装褶皱的厚度与方向穿插、头部的体积分组与方向结构、头盔的硬表面用倒角细节、装备/武器的机械结构与布尔切割痕迹、解剖/身体结构的体块衔接与骨点交接；细节精度对标ZBrush百万面高模雕刻水平（高聚数字雕塑，数百万个多边形），可清晰辨认每一处结构转折的硬边与软边衔接；\n\n【建议方案——均匀立体照明】\n采用数字雕刻软件标准三点布光方案：正前方偏上主光（主光）提供整体解决性，左右对称补光消除死黑区域，确保模型任何结构面均被发光并可辨认；提示均匀但保留足够的明暗要点以突出体积感和结构细节；无硬投影、无高光爆点；明暗过渡平滑自然，类似环境遮挡与均匀方向光增强的效果；目标是让每一处凹凸、每一条结构线都明显明显，服务于建模师观察参考；\n\n【背景与环境】\n纯白色背景（#FFFFFF），无突变、无环境元素、无地面反射、无网格；模型灰色外观与纯白色背景形成清晰的分离；\n\n【画面品质】\n高分辨率数字渲染模块，对标ZBrush/Blender中专业灰展示的BPR渲染或循环粘土渲染截图；画面清晰利，无噪点、无光斑、无镜头畸变、无后期精度；整体观感类似于数字雕刻师的高模作品集展示图（作品集雕塑演示）；\n\n【禁止出现】\n请勿出现任何色彩、材质贴图、皮肤肤色、环境反射、HDRI环境光映射、地面遮光、景深模糊、框线亮度、戏剧性打光、背景装饰物、文字水印。",
    },
    {
        id: "moke-prop-white-render",
        title: { zh: "白模写实渲染", en: "White model to render" },
        summary: { zh: "不改白模结构，赋予真实材质、光照与环境", en: "Keep the white model, add real materials, light and setting" },
        category: "prop",
        tier: "derive",
        input: "image",
        size: "auto",
        source: "moke",
        prompt: "白模渲染：将这张白模化为超写实级别的专业渲染效果图。严格保持白模原有的几何形体、结构比例、空间关系和设计细节不变，仅在此基础上赋予真实的材质、光照和环境氛围。\n\n【材质处理】\n为模型中的每一个可识别部件智能匹配最合理的真实材质：根据物体的功能属性和设计语义自动判断应使用何种材质（如金属、玻璃、木材、织物、混凝土、塑料、皮革、石材等），赋予完整的物理材质属性——包括反射率、粗糙度、折射、次表面散射、微表面细节（划痕、纹理、毛孔、颗粒感）和自然磨损痕迹。所有材质应具备真实世界中的物理正确性和质感厚度。\n\n【光照系统】\n采用基于物理的全局光照方案：主光源为带有自然色温的方向光，配合柔和的环境光填充阴影区域，确保光影过渡自然连续。精确计算光线在不同材质表面的反射、折射和散射行为——金属面呈现清晰环境映射，粗糙面产生漫反射，透明/半透明材质展现正确的焦散效果。阴影具有真实的软硬边缘变化和接触阴影细节。\n\n【环境与氛围】\n放置于与该物体/场景功能相匹配的适当环境中，环境提供合理的光照贡献和反射信息，但不喧宾夺主。背景具有适度的景深虚化，地面/承载面呈现正确的接触关系与反射。整体画面具有自然的空气透视和微妙的大气散射效果。\n\n【渲染品质】\n输出品质对标顶级商业渲染：超高分辨率、细腻的抗锯齿、自然的色调映射、微的暗角和色差、精确的曝光控制。画面噪点极低，细节解析力高，每一处边缘干净利落。最终效果应达到无区分是渲染还是实拍的照片级真实感。",
    },
];

export const PROP_PACK: ArtAssetPack = {
    category: "prop",
    label: { zh: "道具", en: "Prop" },
    master: { title: { zh: "道具定稿", en: "Prop master" }, description: { zh: "设计图、三视图、四视图", en: "Design, views, four views" }, templates: MASTER },
    derive: { title: { zh: "道具派生", en: "Prop derive" }, description: { zh: "提取、灰模、白模渲染", en: "Extract, grey model, render" }, templates: DERIVE },
};
