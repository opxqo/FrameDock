// FrameDock: 运镜 video pack. The camera moves are MOKE AIGC's 运镜动作 (prompt library, 视频 › 摄影技法 / Camera Work,
// docs/research/moke-previz.json, the 48 entries of group 运镜动作), and the 节奏 and 质感 options are MOKE phrases from the
// groups 节奏速度 and 稳定质感 of the same section. MOKE's camera entries are short phrases meant to be combined, so the
// sentence around them is FrameDock's (source "framedock"); the phrases themselves are verbatim.

import { GROUP_PREVIZ } from "@/lib/art-assets/groups";
import type { ArtAssetPack } from "@/lib/art-assets/packs";
import type { ArtAssetOption, ArtAssetTemplate } from "@/lib/art-assets/templates";

const OPTIONS: ArtAssetOption[] = [
    {
        id: "speed",
        label: { zh: "节奏", en: "Pace" },
        choices: ["慢速电影化运动", "极慢运动，安静而克制", "平滑缓入缓出运动", "快速有能量的运镜，同时保持主体可读"],
        choiceLabels: ["慢速", "极慢", "缓入缓出", "快速"],
    },
    {
        id: "feel",
        label: { zh: "质感", en: "Rig" },
        choices: ["稳定器般平滑运镜", "轨道车稳定，厚重顺滑的电影移动", "轻微手持感，自然且可控", "无人机般稳定的空中运动"],
        choiceLabels: ["稳定器", "轨道车", "轻手持", "无人机"],
    },
];

/** One MOKE camera move as a template: the move phrase inside FrameDock's single-shot sentence. */
const move = (slug: string, zh: string, en: string, phrase: string): ArtAssetTemplate => ({
    id: `camera-${slug}`,
    title: { zh, en },
    summary: { zh: phrase, en },
    category: "camera",
    tier: "master",
    input: "either",
    size: "16:9",
    source: "framedock",
    options: OPTIONS,
    prompt: `以参考画面或 [主体] 为画面内容，生成一段连续的单镜头视频。运镜：${phrase}。节奏：{{speed}}。质感：{{feel}}。保持主体清晰可读，人物身份、服装、场景结构与光线前后一致；不切镜，主体不变形。`,
});

const TEMPLATES: ArtAssetTemplate[] = [
    move("static", "静止", "Static", "固定机位，无镜头运动"),
    move("zoom-in", "推近", "Zoom In", "镜头缓慢向主体推进"),
    move("zoom-out", "拉远", "Zoom Out", "镜头缓慢拉远，展示更多场景"),
    move("pan-l", "左摇", "Pan L", "镜头平滑向左摇动"),
    move("pan-r", "右摇", "Pan R", "镜头平滑向右摇动"),
    move("tilt-up", "上摇", "Tilt Up", "镜头平滑上摇，揭示高度和尺度"),
    move("tilt-down", "下摇", "Tilt Down", "镜头平滑下摇，从上方揭示主体"),
    move("orbit", "环绕", "Orbit", "围绕主体环绕，运动轨迹清晰"),
    move("tracking", "跟拍", "Tracking", "跟拍主体移动，保持连续跟随"),
    move("dolly", "滑轨", "Dolly", "滑轨式平滑穿过场景"),
    move("pedestal", "升降", "Pedestal", "垂直升降运镜，平滑上升或下降"),
    move("handheld", "手持", "Handheld", "轻微手持镜头，有生命感但可控"),
    move("whip", "甩镜", "Whip", "快速甩镜，带方向性运动模糊"),
    move("push-pull", "推拉", "Push Pull", "推拉运镜，在主体周围形成滑轨与变焦张力"),
    move("parallax", "视差", "Parallax", "视差运镜，让前景和背景产生纵深位移"),
    move("roll-left", "左滚转", "Roll Left", "镜头向左可控滚转，增加风格化张力"),
    move("roll-right", "右滚转", "Roll Right", "镜头向右可控滚转，增加风格化张力"),
    move("dutch-tilt", "荷兰倾斜", "Dutch Tilt", "荷兰倾斜运镜，倾斜地平线带来不安戏剧感"),
    move("boomerang", "回弹", "Boomerang", "回弹运镜，推进后回拉，带有轻快节奏"),
    move("snap-zoom", "瞬变焦", "Snap Zoom", "瞬间变焦，用焦段跳变制造喜剧或戏剧强调"),
    move("reveal-pan", "揭示摇镜", "Reveal Pan", "揭示摇镜，横扫画面露出主体"),
    move("crane-down", "摇臂下降", "Crane Down", "摇臂下降运镜，优雅下降进入场景"),
    move("crane-up", "摇臂上升", "Crane Up", "摇臂上升运镜，从主体优雅上升到环境"),
    move("arc-left", "左弧绕", "Arc Left", "围绕主体向左弧线移动"),
    move("arc-right", "右弧绕", "Arc Right", "围绕主体向右弧线移动"),
    move("spiral-in", "螺旋推进", "Spiral In", "向内螺旋推进，环绕靠近主体"),
    move("spiral-out", "螺旋拉远", "Spiral Out", "向外螺旋拉远，环绕离开主体"),
    move("elevator-rise", "垂直上升", "Elevator Rise", "垂直上升运镜，直线上升并保持构图干净"),
    move("elevator-drop", "垂直下降", "Elevator Drop", "垂直下降运镜，直线下降并保持构图可控"),
    move("shoulder-follow", "肩后跟随", "Shoulder Follow", "肩后跟随运镜，贴近主体背后移动"),
    move("pov-move", "主观移动", "Pov Move", "主观视角移动，沉浸式第一人称运镜"),
    move("chase-cam", "追逐镜头", "Chase Cam", "追逐镜头，跟随快速动作并带紧迫动势"),
    move("leading-shot", "迎面跟拍", "Leading Shot", "迎面跟拍，镜头后退并面对主体"),
    move("side-track", "侧向跟拍", "Side Track", "侧向跟拍，与主体并行同速移动"),
    move("top-down-drop", "俯冲下降", "Top Down Drop", "俯冲下降运镜，从上方向主体俯冲"),
    move("ground-rise", "贴地升起", "Ground Rise", "贴地升起，从低位抬升到主体"),
    move("macro-glide", "微距滑动", "Macro Glide", "微距滑动运镜，缓慢贴近细节移动"),
    move("whip-zoom", "甩镜变焦", "Whip Zoom", "甩镜变焦，快速方向变化并加强焦点冲击"),
    move("speed-ramp", "变速推进", "Speed Ramp", "变速推进，在慢速和快速之间切换"),
    move("handheld-breath", "呼吸手持", "Handheld Breath", "呼吸感手持运镜，保留细微人体运动"),
    move("float-drift", "漂浮移动", "Float Drift", "漂浮移动运镜，轻盈失重且柔和"),
    move("reveal-tilt", "倾斜揭示", "Reveal Tilt", "倾斜揭示运镜，旋转或倾斜进入关键主体"),
    move("push-through", "穿越推进", "Push Through", "穿越推进，穿过前景层次靠近主体"),
    move("pass-by", "掠过", "Pass By", "掠过运镜，贴近主体后继续越过"),
    move("reverse-dolly", "反向滑轨", "Reverse Dolly", "反向滑轨，镜头与主体运动方向相反"),
    move("bullet-time", "子弹时间", "Bullet Time", "子弹时间灵感运镜，冻结动作并形成环绕能量"),
    move("orbit-zoom", "环绕变焦", "Orbit Zoom", "环绕变焦，围绕主体同时改变焦距距离"),
    move("shake-impact", "冲击震动", "Shake Impact", "冲击震动运镜，用短促可控震动表现力量"),
];

export const CAMERA_PACK: ArtAssetPack = {
    category: "camera",
    group: GROUP_PREVIZ,
    output: "video",
    label: { zh: "运镜", en: "Camera move" },
    master: { title: { zh: "运镜", en: "Camera move" }, description: { zh: "推拉摇移、环绕、跟拍", en: "Push, pan, orbit, track" }, templates: TEMPLATES },
};
