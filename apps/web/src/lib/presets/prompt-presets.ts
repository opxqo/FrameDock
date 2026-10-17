// FrameDock: built-in prompt recipes (composition / light & colour / performance / emotion).
// Written for FrameDock from common cinematography practice; the grouping follows the MOKE AIGC research
// (docs/research/moke-integration.md). Nothing is copied from MOKE's own packages.
// Templates describe visible results only — no camera brands or lens numbers that image models can't parse.
// `{主体}` is replaced with the user's subject; recipes are appended in group order.

export type PromptPresetGroup = "composition" | "lighting" | "motion" | "emotion";
export type PromptPresetMode = "image" | "video";

export type PromptPreset = {
    id: string;
    group: PromptPresetGroup;
    title: string;
    titleEn: string;
    summary: string;
    template: string;
    modes: PromptPresetMode[];
};

export const PROMPT_PRESET_GROUPS: PromptPresetGroup[] = ["composition", "lighting", "motion", "emotion"];
export const SUBJECT_TOKEN = "{主体}";

const both: PromptPresetMode[] = ["image", "video"];
const videoOnly: PromptPresetMode[] = ["video"];

export const PROMPT_PRESETS: PromptPreset[] = [
    // —— 构图 ——
    {
        id: "comp-ground-level",
        group: "composition",
        title: "贴地平视",
        titleEn: "Ground-level view",
        summary: "镜头贴近地面，前景地面向远处延伸",
        template: "机位贴近地面的极低平视角，地面纹理从画面下缘向远处延伸成为前景，{主体}位于中景，背景向地平线收束，空间纵深明显",
        modes: both,
    },
    {
        id: "comp-profile",
        group: "composition",
        title: "侧面轮廓",
        titleEn: "Profile silhouette",
        summary: "只见侧脸连续轮廓，视线前方留白",
        template: "{主体}完全侧身，额头、鼻梁、嘴唇到下颌形成一条连续清晰的轮廓线，看不到正面双眼，视线前方留出大片空白，背景与轮廓明暗对比强烈，边缘有一道细亮的轮廓光",
        modes: both,
    },
    {
        id: "comp-inside-object",
        group: "composition",
        title: "物体内部视角",
        titleEn: "From inside the object",
        summary: "从容器内部向外看，开口成为画框",
        template: "从容器内部向外拍摄，容器开口在画面中形成天然的内框，{主体}正伸手探入取物，开口外是更亮的环境光，内部阴暗且带有物品的局部轮廓",
        modes: both,
    },
    {
        id: "comp-peek",
        group: "composition",
        title: "遮挡窥视",
        titleEn: "Obstructed peek",
        summary: "暗而微虚的前景遮挡出观察视窗",
        template: "画面前景被暗色、略微失焦的遮挡物占据，只在中间留出一道狭窄的观察缝隙，透过缝隙看到远处的{主体}，带有被偷偷注视的紧张感",
        modes: both,
    },
    {
        id: "comp-ensemble",
        group: "composition",
        title: "群像定格",
        titleEn: "Ensemble tableau",
        summary: "多人错落站位，视线方向各不相同",
        template: "多名人物在空间中前后错落分布，各自的视线朝向不同方向，彼此之间由一件共同的道具或焦点联系起来，{主体}处在视觉中心，整体像一幅静止的群像画",
        modes: both,
    },
    {
        id: "comp-ultrawide-depth",
        group: "composition",
        title: "超广角近远对比",
        titleEn: "Ultra-wide depth",
        summary: "极近前景被放大，背景透视强烈",
        template: "超广角的强烈透视，极近处的前景被夸张放大，{主体}在画面中央，背景迅速缩小并指向远处的消失点，画面冲击力强、纵深夸张",
        modes: both,
    },
    {
        id: "comp-fisheye",
        group: "composition",
        title: "鱼眼曲线",
        titleEn: "Fisheye curve",
        summary: "边缘桶形弯曲，中心主体凸出",
        template: "鱼眼式的画面变形，画面边缘的直线明显向外弯曲，中心的{主体}向镜头凸出、比例被放大，带有门镜窥视或极限运动相机的视觉感受",
        modes: both,
    },
    {
        id: "comp-split-focus",
        group: "composition",
        title: "近远双清晰",
        titleEn: "Split focus",
        summary: "极近前景与远处人物同时清晰",
        template: "画面前景极近处的一件关键物品与远处的{主体}同时保持清晰，中间区域略有虚化，两处焦点形成对照和悬念",
        modes: both,
    },
    {
        id: "comp-tilt-shift",
        group: "composition",
        title: "移轴微缩",
        titleEn: "Tilt-shift miniature",
        summary: "俯视下只有一条水平带清晰",
        template: "高处俯视的视角，只有画面中部一条窄窄的水平带清晰，上下两侧逐渐模糊，{主体}与周围的人车像精致的微缩模型",
        modes: both,
    },
    {
        id: "comp-macro",
        group: "composition",
        title: "微距材质",
        titleEn: "Macro texture",
        summary: "毫米级表面纹理，侧向掠射光",
        template: "极近距离的微距画面，{主体}表面的细微纹理、纤维、颗粒或水珠清晰可见，一道低角度的侧光掠过表面，让凹凸起伏的质感更加立体",
        modes: both,
    },
    {
        id: "comp-tele-compress",
        group: "composition",
        title: "长焦压缩",
        titleEn: "Telephoto compression",
        summary: "前后景挤压在一起，景深很浅",
        template: "远距离长焦拍摄的空间压缩感，{主体}与紧贴其后的背景层层叠叠挤压在一起，景深很浅，背景化为柔和的色块",
        modes: both,
    },
    {
        id: "comp-spotlight",
        group: "composition",
        title: "局部聚光",
        titleEn: "Pool of light",
        summary: "大面积暗场中只有一束窄光",
        template: "画面大部分处在深暗之中，只有一束边界清晰的窄光打亮{主体}的关键动作或物品，光区之外几乎看不到细节",
        modes: both,
    },
    {
        id: "comp-god-rays",
        group: "composition",
        title: "薄雾光束",
        titleEn: "God rays",
        summary: "空气中的颗粒形成可见光束",
        template: "空气中弥漫着薄雾或尘埃，光线从窗户或缝隙射入，形成清晰可见的平行光束，{主体}站在光束之中或旁边，画面安静而有神圣感",
        modes: both,
    },
    {
        id: "comp-halation",
        group: "composition",
        title: "高光光晕",
        titleEn: "Film halation",
        summary: "强点光源边缘泛出暖红光晕",
        template: "画面里的强点光源和高光边缘泛出一圈柔和的暖红色光晕，带有复古胶片的质感，{主体}处在霓虹或灯光点缀的夜色中",
        modes: both,
    },
    {
        id: "comp-limited-palette",
        group: "composition",
        title: "低饱和有限色盘",
        titleEn: "Muted palette, one accent",
        summary: "整体中性灰调，只有一小块强调色",
        template: "整体是低饱和的中性灰调，只有{主体}身上或手中的一小块区域保留一种高饱和的强调色，视线会第一时间落在那里",
        modes: both,
    },
    {
        id: "comp-complementary",
        group: "composition",
        title: "冷暖分区",
        titleEn: "Warm / cool split",
        summary: "近处暖光、远处冷光，各有光源",
        template: "画面分成冷暖两个区域：{主体}所在的近处被暖色光源照亮，远处被冷色光照亮，两个光源都在画面中有据可查，交界处有自然过渡的阴影",
        modes: both,
    },
    {
        id: "comp-dense-order",
        group: "composition",
        title: "高密度陈设",
        titleEn: "Dense but ordered",
        summary: "物件很多但层次分明",
        template: "环境里陈列着大量物件，通过前中后景的层次和重复元素保持秩序，一条清晰的视觉引导线把视线带到{主体}身上",
        modes: both,
    },
    {
        id: "comp-reflection",
        group: "composition",
        title: "镜面倒影",
        titleEn: "Reflection",
        summary: "主体与倒影上下或左右对应",
        template: "{主体}与其在积水或镜面中的倒影形成对称呼应，倒影共享同一光源，并带有轻微的波纹变形，虚实之间形成对照",
        modes: both,
    },
    { id: "comp-motion-blur", group: "composition", title: "运动模糊", titleEn: "Motion blur", summary: "静止部分清晰，运动部分拖尾", template: "静止的环境保持清晰，{主体}运动的部位沿运动方向留下线性的拖尾模糊，速度感强烈", modes: both },
    {
        id: "comp-double-exposure",
        group: "composition",
        title: "双重曝光",
        titleEn: "Double exposure",
        summary: "剪影轮廓内填充另一层景象",
        template: "{主体}的剪影外轮廓内部填充着另一层景象或材质，两层画面在灰阶中柔和过渡，像意识流的回忆画面",
        modes: both,
    },
    {
        id: "comp-afterimage",
        group: "composition",
        title: "离散残影",
        titleEn: "Stroboscopic trail",
        summary: "沿轨迹留下 2–3 个半透明姿态",
        template: "{主体}沿运动轨迹留下两到三个逐渐变淡的半透明姿态快照，最后停在一个清晰的实体姿态上，像时间被切片",
        modes: both,
    },
    {
        id: "comp-split-screen",
        group: "composition",
        title: "分屏叙事",
        titleEn: "Split screen",
        summary: "画面分格，动作或视线跨格呼应",
        template: "画面均分为几格，每格是{主体}相关的一个独立场景，各格之间通过动作方向、视线或共同的色彩线索彼此呼应",
        modes: both,
    },

    // —— 光影与色彩 ——
    {
        id: "light-soft-hard",
        group: "lighting",
        title: "软硬光过渡",
        titleEn: "Soft vs hard light",
        summary: "光源面积决定阴影边缘的软硬",
        template: "{主体}被一盏大面积的柔光照亮，阴影边缘柔和渐变；另一侧有一道小而硬的光，留下边缘清晰的投影，软硬对比分明",
        modes: both,
    },
    { id: "light-ratio", group: "lighting", title: "明暗光比", titleEn: "Lighting ratio", summary: "亮面与暗面有明确档位差", template: "{主体}脸部亮面与暗面有明显的明暗差，暗部仍保留可辨认的细节，背景比主体暗一档，层次清楚", modes: both },
    { id: "light-negative-fill", group: "lighting", title: "负补光", titleEn: "Negative fill", summary: "压掉杂光，让阴影面干净", template: "{主体}一侧被深色吸光面压暗，阴影面沉稳干净，没有来路不明的杂光，立体感更强", modes: both },
    {
        id: "light-motivated",
        group: "lighting",
        title: "动机光",
        titleEn: "Motivated light",
        summary: "每道光都来自画面里的光源",
        template: "画面中的光都来自可见的光源——窗户、台灯或街灯，{主体}身上的明暗与这些光源的位置和颜色一致，真实可信",
        modes: both,
    },
    { id: "light-window", group: "lighting", title: "窗边自然光", titleEn: "Window light", summary: "侧窗柔光，明暗自然衰减", template: "柔和的自然光从一侧窗户照进来，{主体}靠窗一侧明亮，向另一侧自然衰减到阴影，空气通透", modes: both },
    {
        id: "light-golden-hour",
        group: "lighting",
        title: "黄金时刻逆光",
        titleEn: "Golden-hour backlight",
        summary: "低角度暖色逆光勾出轮廓",
        template: "傍晚低角度的暖金色阳光从{主体}身后照来，发丝和轮廓边缘被勾出一圈亮边，前景微微逆光，整体温暖",
        modes: both,
    },
    {
        id: "light-shot-match",
        group: "lighting",
        title: "镜头间色彩统一",
        titleEn: "Shot-to-shot colour match",
        summary: "同一场景的镜头保持同一色调",
        template: "保持与同场景其他镜头一致的白平衡、色调和曝光，{主体}的肤色和服装颜色在各镜头间稳定不跳变",
        modes: both,
    },
    { id: "light-product", group: "lighting", title: "产品材质光", titleEn: "Product light", summary: "突出边缘高光与表面质感", template: "{主体}的倒角边缘有干净连续的高光线条，表面材质、纹理和细节清晰，背景简洁不抢戏", modes: both },
    { id: "light-architecture", group: "lighting", title: "建筑透视", titleEn: "Architectural perspective", summary: "竖线保持垂直，不变形", template: "{主体}所在建筑的垂直线条保持笔直平行，视平线稳定，没有广角造成的弯曲变形，空间端正大气", modes: both },
    { id: "light-documentary", group: "lighting", title: "纪实现场光", titleEn: "Documentary light", summary: "保留现场光线与抓拍感", template: "完全使用现场光线，没有布光痕迹，{主体}处在真实的互动瞬间，画面带有自然的抓拍质感和环境氛围", modes: both },

    // —— 动作表演（视频） ——
    {
        id: "motion-lift",
        group: "motion",
        title: "抓握发力",
        titleEn: "Grip then lift",
        summary: "先写抓握和重量，再写离地",
        template: "{主体}先用手指稳稳抓住物体的把手，能看出物体的重量，随后双腿下沉、背部发力，最后才把物体从地面抬起",
        modes: videoOnly,
    },
    { id: "motion-follow-through", group: "motion", title: "次级运动衰减", titleEn: "Follow-through", summary: "动作停下后衣摆头发再慢慢停", template: "{主体}的身体停下后，衣摆和头发继续摆动片刻，逐渐减速并自然垂落，动作收尾柔和", modes: videoOnly },
    {
        id: "motion-handoff",
        group: "motion",
        title: "递物时序",
        titleEn: "Hand-off timing",
        summary: "一方先伸手，另一方确认后再接",
        template: "{主体}先把物品递出并停在空中，对方看向物品确认后才伸手接住，两只手有先后顺序，不同时凭空出现",
        modes: videoOnly,
    },
    { id: "motion-anticipation", group: "motion", title: "起跑预备", titleEn: "Anticipation", summary: "冲刺前先反向蓄力", template: "{主体}起跑前重心先向后微沉、手臂后摆蓄力，然后才猛地向前冲出，速度由慢到快", modes: videoOnly },
    { id: "motion-eye-lead", group: "motion", title: "视线引导转头", titleEn: "Eye-led turn", summary: "眼睛先转，头和肩随后", template: "{主体}的眼睛先转向目标，接着头部跟上，最后肩膀随颈部一起转动，转身自然有层次", modes: videoOnly },
    { id: "motion-foot-plant", group: "motion", title: "脚步落地", titleEn: "Foot planting", summary: "每一步都有落地和重心转移", template: "{主体}行走时每一步脚掌都稳稳落地，能看到重心从一只脚转移到另一只脚，没有滑步", modes: videoOnly },

    // —— 情绪微表情 ——
    { id: "emotion-despair", group: "emotion", title: "绝望", titleEn: "Despair", summary: "眉心上抬、呼吸停顿", template: "{主体}眉心紧锁并向上抬起，下唇向内抿住，目光失焦下垂，胸口起伏变浅并伴随短暂的停顿", modes: both },
    { id: "emotion-restrained-joy", group: "emotion", title: "克制的喜悦", titleEn: "Restrained joy", summary: "嘴角先动，眼角细纹出现", template: "{主体}嘴角先微微上扬又努力压住，眼角出现细小的笑纹，肩膀放松，呼吸变得轻快", modes: both },
    { id: "emotion-anger", group: "emotion", title: "压抑的愤怒", titleEn: "Suppressed anger", summary: "下颌咬紧、鼻翼张开", template: "{主体}下颌咬紧，咬肌微微鼓起，鼻翼张开，目光直视不眨，手指慢慢攥紧，身体前倾但停住不动", modes: both },
    { id: "emotion-fear", group: "emotion", title: "惊惧", titleEn: "Fear", summary: "眼睛睁大、身体后缩", template: "{主体}眼睛猛地睁大露出眼白，眉毛上提，嘴唇微张，呼吸急促，身体本能地向后缩并护住胸前", modes: both },
    { id: "emotion-longing", group: "emotion", title: "怀念", titleEn: "Longing", summary: "目光放远、轻轻呼气", template: "{主体}目光投向远处没有焦点的地方，嘴角带着很淡的弧度，轻轻呼出一口气，身体微微倚靠", modes: both },
    { id: "emotion-resolve", group: "emotion", title: "下定决心", titleEn: "Resolve", summary: "深吸一口气、抬起下巴", template: "{主体}深吸一口气，下巴微微抬起，眼神由犹豫变得坚定，肩膀打开，身体站直", modes: both },
];

/** Presets usable for a generation mode; text mode gets everything (it writes prompts for later nodes). */
export function presetsForMode(mode: string) {
    return mode === "image" ? PROMPT_PRESETS.filter((preset) => preset.modes.includes("image")) : PROMPT_PRESETS;
}

/**
 * Joins the chosen recipes into one prompt fragment, ordered composition → light → motion → emotion,
 * with the subject filled in. When `base` has text the fragment is appended after it.
 */
export function composePresetPrompt(presets: PromptPreset[], subject: string, base = "") {
    const filled = subject.trim() || "主体";
    const ordered = [...presets].sort((a, b) => PROMPT_PRESET_GROUPS.indexOf(a.group) - PROMPT_PRESET_GROUPS.indexOf(b.group));
    const fragment = ordered.map((preset) => preset.template.split(SUBJECT_TOKEN).join(filled)).join("；");
    const head = base.trim();
    if (!fragment) return head;
    return head ? `${head}\n${fragment}。` : `${fragment}。`;
}
